#!/usr/bin/env python3
"""Read-only GPU inventory: no workload or configuration changes."""
import argparse
import datetime as dt
import json
import pathlib
import subprocess

COMMANDS = {
    "devices": ["nvidia-smi", "-L"],
    "topology": ["nvidia-smi", "topo", "-m"],
    "gpu_csv": ["nvidia-smi", "--query-gpu=index,name,uuid,memory.total,driver_version,pci.bus_id,power.limit", "--format=csv"],
}

def collect(run=subprocess.run):
    result = {"schema_version": 1, "status": "inventory_only",
              "captured_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "commands": {}}
    for key, argv in COMMANDS.items():
        try:
            p = run(argv, capture_output=True, text=True, check=False, timeout=15)
            result["commands"][key] = {"argv": argv, "returncode": p.returncode,
                                       "stdout": p.stdout, "stderr": p.stderr}
        except (OSError, subprocess.TimeoutExpired) as exc:
            result["commands"][key] = {"argv": argv, "error": type(exc).__name__ + ": " + str(exc)}
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    result = collect()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Inventory saved: {args.output}. No benchmarks executed.")
    if any("error" in p or p.get("returncode") != 0 for p in result["commands"].values()):
        raise SystemExit(2)

if __name__ == "__main__":
    main()
