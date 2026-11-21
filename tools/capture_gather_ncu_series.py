#!/usr/bin/env python3
"""Collect three independently scoped Nsight Compute runs against one pinned gather binary.

IMPORTANT: this is an *operator capture*, not independent hardware attestation.
Writes a new sibling evidence directory; never edits the original signed-by-hash
raw capture. No profiling without --execute.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

from verify_gather_receipt import verify

STRIDES = (1, 4, 8)
METRICS = (
    "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum",
    "dram__bytes_read.sum",
    "dram__bytes_write.sum",
)

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def run(argv, *, env, timeout=300):
    process = subprocess.run(argv, env=env, capture_output=True, text=True,
                             check=False, timeout=timeout)
    return dict(argv=argv, exit_code=process.returncode,
                stdout=process.stdout, stderr=process.stderr)

def record(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")

def capture(raw_folder, output_folder, selected_uuid, *, execute=False, profiler="ncu"):
    if not execute:
        raise ValueError("Explicit --execute required; profiling was not started")
    raw_folder = Path(raw_folder).resolve()
    output_folder = Path(output_folder).resolve()
    if output_folder.exists():
        raise ValueError("Output directory already exists; no overwrite")
    if shutil.which(profiler) is None:
        raise ValueError("Nsight Compute executable not available")
    integrity = verify(raw_folder)
    manifest = json.loads((raw_folder / "manifest.json").read_text())
    if integrity["device_uuid"] != selected_uuid:
        raise ValueError("Pinned device UUID does not match original capture")
    binary = raw_folder / "gather"
    expected_binary_hash = manifest["file_sha256"]["gather"]
    if digest(binary) != expected_binary_hash:
        raise ValueError("Binary hash mismatch")
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = selected_uuid
    # The command list and selection are captured, not silently inferred.
    output_folder.mkdir(parents=True)
    commands = {}
    errors = []
    version = run([profiler, "--version"], env=env, timeout=30)
    record(output_folder / "ncu-version.json", version)
    if version["exit_code"]:
        errors.append("Profiler version command failed")
    else:
        for stride in STRIDES:
            # Do not use --export here: CSV and CLI diagnostics must be retained
            # exactly; the raw text alone is NOT a verified numerical dataset.
            args = [
                profiler, "--csv", "--page", "raw",
                "--kernel-name", "regex:gather",
                "--kernel-name-base", "function",
                "--launch-count", "1",
                "--metrics", ",".join(METRICS),
                "--", str(binary), str(stride)
            ]
            try:
                result = run(args, env=env)
            except subprocess.TimeoutExpired:
                result = dict(argv=args, exit_code=None, stdout="", stderr="Timeout")
            record(output_folder / f"ncu-stride{stride}.json", result)
            commands[str(stride)] = f"ncu-stride{stride}.json"
            if result["exit_code"] != 0:
                errors.append(f"Nsight Compute stride {stride} failed")
            if "gather" not in result["stdout"]:
                errors.append(f"Nsight Compute stride {stride} produced no identifiable kernel row")
            for metric in METRICS:
                if metric not in result["stdout"]:
                    errors.append(f"Nsight Compute stride {stride} missing metric {metric}")
            if f"PASS stride={stride}" not in (result["stdout"] + result["stderr"]):
                errors.append(f"Nsight Compute stride {stride} has no correctness PASS")
    status = "COLLECTED_UNVERIFIED" if not errors else "INCOMPLETE"
    raw_files = {p.name: digest(p) for p in sorted(output_folder.iterdir())
                 if p.is_file() and p.name != "manifest.json"}
    derived_manifest = {
        "schema": "gpu-uncooked.ncu-stride-series.v1",
        "status": status,
        "classification": "RAW_OPERATOR_CLAIM_NOT_ATTESTATION",
        "recorded_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "device_uuid": selected_uuid,
        "source_manifest_sha256": digest(raw_folder / "manifest.json"),
        "binary_sha256": expected_binary_hash,
        "compiler_arch": manifest["compiler_arch"],
        "git_commit": manifest["git_commit"],
        "strides": list(STRIDES),
        "metrics_requested": list(METRICS),
        "commands": commands,
        "file_sha256": raw_files,
        "error_messages": errors,
        "numerical_metrics_verified": False,
        "latency_comparison_validated": False,
        "hardware_attested": False,
        "notes": [
            "One microkernel warp per launch; does not benchmark H100 throughput",
            "Nsight profiling can replay kernels and perturb timing/cache state",
            "Raw CSV can contain diagnostic lines; parse and attribute launches separately",
            "SHA-256 self-consistency is not independent GPU hardware attestation"
        ]
    }
    record(output_folder / "manifest.json", derived_manifest)
    return derived_manifest

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", required=True, help="Previously verified gather raw receipt directory")
    p.add_argument("--output", required=True, help="New empty evidence output directory")
    p.add_argument("--device", required=True, help="Must equal source manifest's GPU UUID")
    p.add_argument("--execute", action="store_true", help="Explicitly authorize GPU profiling")
    args = p.parse_args()
    try:
        result = capture(args.raw, args.output, args.device, execute=args.execute)
        print(json.dumps({"status": result["status"], "strides": result["strides"],
                          "hardware_attested": False}))
        return 0 if result["status"] == "COLLECTED_UNVERIFIED" else 1
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("REJECTED: " + str(exc), file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
