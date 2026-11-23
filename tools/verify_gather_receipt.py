#!/usr/bin/env python3
"""Offline structural and SHA256 verification of a GPU-Uncooked capture.

Passing is integrity validation ONLY, not trusted GPU attestation or measured
hardware behavior. Malicious operators may fabricate a coherent receipt.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

REQUIRED = {"inventory.json","compile.json","sass-command.json",
            "ptx-command.json","gather","source-gather.cu","gather.ptx.txt","gather.sass.txt",
            "run-stride1.json","run-stride4.json","run-stride8.json"}
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify(folder):
    folder=Path(folder).resolve()
    m=json.loads((folder/"manifest.json").read_text())
    if m.get("schema_version")!="gpu-uncooked.raw-gpu-receipt.v1":
        raise ValueError("Unsupported manifest version")
    if m.get("status")!="COLLECTED_UNVERIFIED" or m.get("trust")!="UNVERIFIED_CAPTURE_NOT_ATTESTATION":
        raise ValueError("Not a completed raw capture")
    files=m.get("file_sha256")
    if not isinstance(files,dict) or not REQUIRED.issubset(files):
        raise ValueError("Required raw files missing from manifest")
    if (folder/"failure.txt").exists():
        raise ValueError("Capture contains failure.txt")
    for name,claimed in files.items():
        if name in (".","..") or Path(name).name!=name or not re.fullmatch(r"[0-9a-f]{64}",str(claimed)):
            raise ValueError("Unsafe or malformed hashed filename")
        p=folder/name
        if not p.is_file() or digest(p)!=claimed:
            raise ValueError("Mismatching file hash: "+name)
    disk_files={p.name for p in folder.iterdir() if p.is_file() and p.name!="manifest.json"}
    if disk_files!=set(files):
        raise ValueError("Unhashed or unlisted file detected")
    if digest(folder/"source-gather.cu")!=m.get("source_sha256"):
        raise ValueError("Captured CUDA source hash mismatch")
    d=m.get("device",{})
    if not isinstance(d.get("uuid"),str) or not d["uuid"].startswith("GPU-"):
        raise ValueError("Missing GPU identity")
    if m.get("environment",{}).get("CUDA_VISIBLE_DEVICES")!=d["uuid"]:
        raise ValueError("Selection inconsistent with UUID")
    if not re.fullmatch(r"sm_[0-9]+",str(m.get("compiler_arch"))):
        raise ValueError("Unknown target architecture")
    if m.get("strides")!=[1,4,8] or not re.fullmatch(r"[0-9a-f]{64}",str(m.get("source_sha256"))):
        raise ValueError("Source or stride selection missing")
    expected_commands={"compile":"compile.json","sass":"sass-command.json",
                       "ptx":"ptx-command.json",**{"run_"+str(s):f"run-stride{s}.json" for s in (1,4,8)}}
    for key,name in expected_commands.items():
        if m.get("command_files",{}).get(key)!=name:
            raise ValueError("Command file mapping mismatch: "+key)
        cmd=json.loads((folder/name).read_text())
        if cmd.get("exit_code")!=0 or not isinstance(cmd.get("argv"),list):
            raise ValueError("Failed or incomplete command: "+key)
    build=json.loads((folder/"compile.json").read_text())["argv"]
    # The compiler must consume the source bytes that the receipt actually hashes.
    if not any(str(arg).endswith("/source-gather.cu") or str(arg)=="source-gather.cu" for arg in build):
        raise ValueError("Compile did not use captured CUDA source")
    if not any(str(arg).startswith("arch=compute_") and str(m["compiler_arch"]) in str(arg) for arg in build):
        raise ValueError("Compiler target not tied to selected architecture")
    if not str(m.get("git_commit","")) or not re.fullmatch(r"[0-9a-f]{40}",str(m.get("git_commit",""))):
        raise ValueError("Missing pinned Git commit")
    for s in (1,4,8):
        obj=json.loads((folder/f"run-stride{s}.json").read_text())
        if re.search(r"PASS stride="+str(s)+r"\b",str(obj.get("stdout",""))) is None:
            raise ValueError("Missing CUDA correctness PASS: "+str(s))
        if str(s) not in [str(v) for v in obj["argv"]]:
            raise ValueError("Wrong stride argument: "+str(s))
    if not (folder/"gather.ptx.txt").read_text().strip() or not (folder/"gather.sass.txt").read_text().strip():
        raise ValueError("Empty disassembly")
    if m.get("profile_requested"):
        if m.get("command_files",{}).get("profile")!="ncu-command.json":
            raise ValueError("Profiler transcript missing")
        if json.loads((folder/"ncu-command.json").read_text()).get("exit_code")!=0:
            raise ValueError("Profiler failed")
        if not any(name.endswith(".ncu-rep") for name in files):
            raise ValueError("Profiler raw report missing")
    return {"integrity":"PASS","trust":"UNVERIFIED", "hardware_attested":False,
            "experiment":"gather-stride","device_uuid":d["uuid"]}

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder")
    args=parser.parse_args()
    try:
        print(json.dumps(verify(args.folder)))
    except (ValueError,OSError,KeyError,TypeError,json.JSONDecodeError) as e:
        print("REJECTED: "+str(e),file=sys.stderr)
        sys.exit(1)
