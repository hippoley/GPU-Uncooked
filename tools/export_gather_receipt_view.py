#!/usr/bin/env python3
"""Export a bounded, explicitly *unattested* receipt view for the browser.

This calls the offline integrity verifier first. Importing the resulting JSON
does not prove the device ran the code. No counters are invented.
"""
import argparse
import json
from pathlib import Path
from tools.verify_gather_receipt import verify

MAX_TEXT = 120000
def export(folder):
    folder=Path(folder).resolve()
    integrity=verify(folder)
    manifest=json.loads((folder/"manifest.json").read_text())
    def read_text(name):
        text=(folder/name).read_text(errors="replace")
        return {"text":text[:MAX_TEXT],"truncated":len(text)>MAX_TEXT,
                "sha256":manifest["file_sha256"][name]}
    executions=[]
    for stride in (1,4,8):
        raw=json.loads((folder/f"run-stride{stride}.json").read_text())
        executions.append({"stride":stride,"exit_code":raw["exit_code"],
                           "stdout":str(raw["stdout"])[:2000],
                           "transcript_sha256":manifest["file_sha256"][f"run-stride{stride}.json"]})
    return {
        "schema":"gpu-uncooked.receipt-view.v1",
        "classification":"UNATTESTED_RAW_CAPTURE",
        "integrity_checked_locally":integrity["integrity"]=="PASS",
        "hardware_attested":False,
        "measured_gpu_metrics":None,
        "device":{"uuid":manifest["device"]["uuid"],"name":manifest["device"].get("name","unknown"),
                  "compute_cap":manifest["device"].get("compute_cap","unknown")},
        "git_commit":manifest["git_commit"],
        "source_sha256":manifest["source_sha256"],
        "source":read_text("source-gather.cu"),
        "ptx":read_text("gather.ptx.txt"),
        "sass":read_text("gather.sass.txt"),
        "runs":executions,
        "limitations":["File hashes are only integrity checks",
                       "GPU identity and execution have not been independently witnessed",
                       "No per-lane cache or HBM path is observed",
                       "No Nsight metric is imported or asserted"]
    }
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("folder")
    ap.add_argument("--output",required=True)
    args=ap.parse_args()
    out=Path(args.output).resolve()
    if out.exists():
        ap.error("Output already exists; refusing overwrite")
    obj=export(args.folder)
    out.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"output":str(out),"classification":obj["classification"]}))
if __name__=="__main__": main()
