#!/usr/bin/env python3
"""Capture *raw, unverified* CUDA evidence from an explicitly selected GPU.

This script never upgrades a browser claim to MEASURED. A separate verifier and
independent replication are required. No load occurs without --execute.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
KERNEL = ROOT / "playground/material-lab/gather.cu"

def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def run(cmd, cwd=None, env=None, timeout=180):
    p = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True,
                       timeout=timeout, check=False)
    return {"argv": cmd, "exit_code": p.returncode,
            "stdout": p.stdout, "stderr": p.stderr}

def save_command(folder, filename, result):
    p = folder / filename
    p.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return p

def inventory():
    result = run(["nvidia-smi",
                  "--query-gpu=uuid,name,compute_cap,driver_version",
                  "--format=csv,noheader,nounits"])
    if result["exit_code"]:
        raise RuntimeError("nvidia-smi inventory failed: " + result["stderr"])
    devices = []
    for line in result["stdout"].splitlines():
        fields = [v.strip() for v in line.split(",")]
        if len(fields) != 4 or not fields[0].startswith("GPU-"):
            raise RuntimeError("Unrecognized device inventory line: " + line)
        devices.append(dict(zip(["uuid","name","compute_cap","driver"], fields)))
    return devices, result

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--device", required=True, help="Exact NVIDIA GPU UUID (GPU-...)")
    ap.add_argument("--output", required=True, help="New directory for raw evidence")
    ap.add_argument("--execute", action="store_true", help="Explicit approval for GPU work")
    ap.add_argument("--profile", action="store_true",
                    help="Use Nsight Compute on stride 8; requires --execute")
    args = ap.parse_args(argv)
    if not args.execute:
        ap.error("No GPU commands executed. Supply --execute after operator approval.")
    if args.profile and not shutil.which("ncu"):
        ap.error("--profile requested but Nsight Compute is unavailable")
    for name in ["nvcc","cuobjdump","nvidia-smi"]:
        if not shutil.which(name):
            ap.error(name + " is missing")
    devices, inv = inventory()
    selected = next((d for d in devices if d["uuid"] == args.device), None)
    if not selected:
        ap.error("Selected UUID is not present; no fallback to another device")
    cap = selected["compute_cap"]
    if not re.fullmatch(r"\d+\.\d+", cap):
        ap.error("Compute capability could not be determined")
    arch = "sm_" + cap.replace(".", "")
    out = Path(args.output).resolve()
    if out.exists():
        ap.error("Output already exists; refusing to overwrite evidence")
    out.mkdir(parents=True)
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = selected["uuid"]
    commands = {"inventory": save_command(out, "inventory.json", inv)}
    versions = {}
    for label,cmd in [("nvcc",["nvcc","--version"]),
                      ("cuobjdump",["cuobjdump","--version"]),
                      ("ncu",["ncu","--version"])]:
        if label == "ncu" and not shutil.which("ncu"):
            versions[label] = None
        else:
            result = run(cmd)
            commands["version_"+label] = save_command(out,"version-"+label+".json",result)
            versions[label] = result["stdout"] + result["stderr"]
    try:
        source_sha = sha256(KERNEL)
        build = run(["nvcc","-O2","-lineinfo","-gencode",
                     "arch=compute_"+cap.replace(".","")+",code=["+arch+",compute_"+cap.replace(".","")+"]",
                     str(KERNEL),"-o","gather"],cwd=out,env=env)
        commands["compile"] = save_command(out,"compile.json",build)
        if build["exit_code"]:
            raise RuntimeError("CUDA compilation failed")
        sass = run(["cuobjdump","--dump-sass",str(out/"gather")],env=env)
        commands["sass"] = save_command(out,"sass-command.json",sass)
        if sass["exit_code"] or not sass["stdout"].strip():
            raise RuntimeError("SASS disassembly is unavailable")
        (out/"gather.sass.txt").write_text(sass["stdout"])
        ptx = run(["cuobjdump","--dump-ptx",str(out/"gather")],env=env)
        commands["ptx"] = save_command(out,"ptx-command.json",ptx)
        if ptx["exit_code"] or not ptx["stdout"].strip():
            raise RuntimeError("Embedded PTX unavailable; adjust compiler flags to preserve PTX")
        (out/"gather.ptx.txt").write_text(ptx["stdout"])
        executions = []
        for stride in [1,4,8]:
            r = run([str(out/"gather"),str(stride)],cwd=out,env=env)
            path = save_command(out,f"run-stride{stride}.json",r)
            commands[f"run_{stride}"] = path
            executions.append({"stride":stride,"exit_code":r["exit_code"],
                               "correct":r["exit_code"]==0 and
                               re.search(r"PASS stride="+str(stride)+r"\b",r["stdout"]) is not None})
        if not all(r["correct"] for r in executions):
            raise RuntimeError("CUDA correctness failed; see raw run files")
        if args.profile:
            r = run(["ncu","--export",str(out/"gather-stride8"),"--force-overwrite",
                     str(out/"gather"),"8"],cwd=out,env=env,timeout=300)
            commands["profile"] = save_command(out,"ncu-command.json",r)
            if r["exit_code"]:
                raise RuntimeError("Profiler failed: counters may be unavailable or permission denied")
        status = "COLLECTED_UNVERIFIED"
    except Exception as exc:
        status = "INCOMPLETE"
        (out/"failure.txt").write_text(str(exc)+"\n")
    files = {p.name:sha256(p) for p in out.iterdir() if p.is_file() and p.name!="manifest.json"}
    manifest = {
        "schema_version":"gpu-uncooked.raw-gpu-receipt.v1",
        "status":status,
        "trust":"UNVERIFIED_CAPTURE_NOT_ATTESTATION",
        "recorded_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
        "source_path":"playground/material-lab/gather.cu",
        "source_sha256":sha256(KERNEL),
        "device":selected,
        "compiler_arch":arch,
        "environment":{"CUDA_VISIBLE_DEVICES":selected["uuid"]},
        "git_commit":run(["git","rev-parse","HEAD"],cwd=ROOT)["stdout"].strip(),
        "strides":[1,4,8],
        "profile_requested":args.profile,
        "command_files":{key:p.name for key,p in commands.items()},
        "file_sha256":files,
        "note":"Raw subprocess transcripts are not independent verification. No per-lane physical path is observed."
    }
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"status":status,"output":str(out),"device":selected["uuid"]}))
    return 0 if status=="COLLECTED_UNVERIFIED" else 1

if __name__ == "__main__":
    sys.exit(main())
