#!/usr/bin/env python3
"""Fail-closed attribution of three unverified Nsight Compute raw CSV captures.

Does not turn profiler output into independently attested observations.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys

from verify_gather_receipt import verify as verify_raw_receipt

STRIDES = (1, 4, 8)
REQUIRED = (
    "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum",
    "dram__bytes_read.sum",
    "dram__bytes_write.sum",
)

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def parse_raw_csv(text, *, metric_names=REQUIRED):
    """Accept explicit per-metric rows, one unambiguous gather launch per file."""
    if not isinstance(text, str) or len(text) > 10_000_000:
        raise ValueError("CSV text absent or unreasonably large")
    rows = list(csv.reader(io.StringIO(text)))
    fields = {"Metric Name", "Metric Value", "Kernel Name"}
    headers = [(i, row) for i, row in enumerate(rows) if fields.issubset(row)]
    if len(headers) != 1:
        raise ValueError("No unique Nsight raw CSV header containing Kernel Name, Metric Name, Metric Value")
    start, header = headers[0]
    indices = {name: header.index(name) for name in fields}
    launch_col = header.index("ID") if "ID" in header else None
    metrics = {}
    launch_ids = set()
    kernels = set()
    for row in rows[start + 1:]:
        if len(row) != len(header):
            continue
        name = row[indices["Metric Name"]].strip()
        if name not in metric_names:
            continue
        kernel = row[indices["Kernel Name"]].strip()
        if "gather" not in kernel:
            raise ValueError("Unexpected kernel in requested metric row")
        kernels.add(kernel)
        if launch_col is not None:
            launch_ids.add(row[launch_col].strip())
        if name in metrics:
            raise ValueError("Duplicate metric row: " + name)
        value = row[indices["Metric Value"]].replace(",", "").strip()
        if not re.fullmatch(r"(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", value):
            raise ValueError("Metric is missing, non-numeric, or unit-scaled: " + name)
        number = float(value)
        if not math.isfinite(number) or number < 0:
            raise ValueError("Metric is not a finite nonnegative value: " + name)
        metrics[name] = number
    if set(metrics) != set(metric_names):
        raise ValueError("Missing requested per-kernel metrics: " + str(sorted(set(metric_names)-set(metrics))))
    if len(kernels) != 1 or (launch_col is not None and len(launch_ids) != 1):
        raise ValueError("Metrics cannot be attributed to exactly one gather kernel launch")
    return dict(kernel=next(iter(kernels)), metrics=metrics,
                launch_id=next(iter(launch_ids)) if launch_ids else None)

def summarize(directory, *, raw_folder=None):
    folder = Path(directory).resolve()
    manifest_path = folder / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("schema") != "gpu-uncooked.ncu-stride-series.v1":
        raise ValueError("Unrecognized Nsight series schema")
    if manifest.get("status") != "COLLECTED_UNVERIFIED" or manifest.get("hardware_attested") is not False:
        raise ValueError("Unverified series not complete")
    if manifest.get("strides") != [1, 4, 8] or manifest.get("metrics_requested") != list(REQUIRED):
        raise ValueError("Different strides or metrics cannot be compared")
    if not re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("binary_sha256", ""))):
        raise ValueError("Binary hash missing")
    if not re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("source_manifest_sha256", ""))):
        raise ValueError("Origin receipt hash missing")
    expected_files = {f"ncu-stride{s}.json" for s in STRIDES} | {"ncu-version.json"}
    checksums = manifest.get("file_sha256")
    if not isinstance(checksums, dict) or set(checksums) != expected_files:
        raise ValueError("Unexpected set of file checksums")
    if set(p.name for p in folder.iterdir() if p.is_file()) != expected_files | {"manifest.json"}:
        raise ValueError("Missing or unlisted on-disk files")
    for name, claimed in checksums.items():
        if not re.fullmatch(r"[0-9a-f]{64}", str(claimed)) or digest(folder / name) != claimed:
            raise ValueError("File checksum mismatch: " + name)
    if raw_folder is not None:
        # Re-open the original source, and recompute the binary identity from
        # bytes. A self-consistent Nsight series manifest is insufficient.
        origin = Path(raw_folder).resolve()
        origin_verification = verify_raw_receipt(origin)
        origin_manifest_path = origin / "manifest.json"
        origin_manifest = json.loads(origin_manifest_path.read_text())
        if digest(origin_manifest_path) != manifest["source_manifest_sha256"]:
            raise ValueError("Original receipt manifest hash does not match NCU series")
        if origin_verification.get("device_uuid") != manifest.get("device_uuid"):
            raise ValueError("Original GPU UUID differs from NCU series")
        if origin_manifest.get("compiler_arch") != manifest.get("compiler_arch"):
            raise ValueError("Compiler architecture differs from original capture")
        if origin_manifest.get("git_commit") != manifest.get("git_commit"):
            raise ValueError("Git commit differs from original capture")
        if origin_manifest.get("file_sha256", {}).get("gather") != manifest["binary_sha256"]:
            raise ValueError("Original binary digest differs from NCU series")
        if digest(origin / "gather") != manifest["binary_sha256"]:
            raise ValueError("Original binary bytes differ from NCU series")
    rows = []
    selected_binary = None
    for stride in STRIDES:
        filename = f"ncu-stride{stride}.json"
        if manifest.get("commands", {}).get(str(stride)) != filename:
            raise ValueError("Command mapping does not match stride")
        data = json.loads((folder / filename).read_text())
        argv = data.get("argv", [])
        if data.get("exit_code") != 0 or not isinstance(argv, list) or not argv or argv[-1] != str(stride):
            raise ValueError("Profiler command failed or incorrect stride argument")
        if "--metrics" not in argv or ",".join(REQUIRED) not in argv:
            raise ValueError("Profiler metrics not pinned")
        if not any(str(arg).endswith("/gather") for arg in argv):
            raise ValueError("Profiler binary target missing")
        if not all(flag in argv for flag in ("--csv","--page","raw","--kernel-name","regex:gather","--launch-count","1")):
            raise ValueError("Profiler must select a single gather launch and raw CSV")
        binary_arg = next(str(arg) for arg in argv if str(arg).endswith("/gather"))
        if raw_folder is not None and Path(binary_arg).resolve() != (origin / "gather").resolve():
            raise ValueError("Nsight command not bound to verified original binary path")
        if selected_binary is None:
            selected_binary = binary_arg
        elif selected_binary != binary_arg:
            raise ValueError("Different binary paths across three stride profiles")
        if f"PASS stride={stride}" not in str(data.get("stdout", ""))+str(data.get("stderr", "")):
            raise ValueError("No correctness PASS")
        parsed = parse_raw_csv(data["stdout"])
        derived_regions = {1: 4, 4: 16, 8: 32}[stride]
        rows.append({
            "stride": stride,
            "expected_source_32b_regions": derived_regions,
            "source_region_bytes_span": derived_regions * 32,
            "kernel": parsed["kernel"],
            "launch_id": parsed["launch_id"],
            "claimed_profiler_metrics": parsed["metrics"],
            "profile_transcript_sha256": checksums[filename]
        })
    return {
        "schema":"gpu-uncooked.ncu-comparison.v1",
        "classification":"REPORTED_UNVERIFIED",
        "hardware_attested":False,
        "binary_sha256":manifest["binary_sha256"],
        "source_manifest_sha256":manifest["source_manifest_sha256"],
        "series_manifest_sha256":digest(manifest_path),
        "device_uuid_claim":manifest["device_uuid"],
        "origin_bytes_rechecked":raw_folder is not None,
        "rows":rows,
        "claim_limitations":[
            "Three independent profiled process launches; not a single synchronized timed run",
            "Profiler replay may perturb cache and timing",
            "Static address region coverage is not an expected DRAM transaction count",
            "Reported CSV counters are unverified operator claims, not independent attestation"
        ]
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--series", required=True)
    parser.add_argument("--raw", required=True, help="Original verified capture directory; required for origin binding")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    path = Path(args.output).resolve()
    if path.exists():
        parser.error("Refusing to overwrite output")
    try:
        comparison = summarize(args.series, raw_folder=args.raw)
    except (ValueError, KeyError, TypeError, OSError, json.JSONDecodeError) as error:
        print("REJECTED: " + str(error), file=sys.stderr)
        return 1
    path.write_text(json.dumps(comparison, indent=2, ensure_ascii=False)+"\n")
    print(json.dumps({"classification":comparison["classification"],
                      "rows":len(comparison["rows"])}))
    return 0

if __name__=="__main__":
    sys.exit(main())
