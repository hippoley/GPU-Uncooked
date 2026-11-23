#!/usr/bin/env python3
"""Offline SASS probe for pinned public Nsight reports. No GPU execution."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path

def inspect(text):
    # Never infer machine instructions from an ordinary metric-row CSV.
    markers=("SASS","Instruction","Assembly")
    if not any(m in text for m in markers):
        return {"status":"SASS_NOT_CONFIRMED","reason":"No recognizable SASS/source markers"}
    # This probe intentionally only records raw source output. A parser may
    # declare SASS instructions only after reviewing the actual saved format.
    return {"status":"SASS_VIEW_PRESENT_UNVALIDATED",
            "reason":"Source output is present; SASS instruction boundaries are not yet independently validated"}

def decode(ncu,report,out):
    report=Path(report);out=Path(out)
    if out.exists():raise ValueError("Refusing to overwrite evidence directory")
    if not report.is_file():raise ValueError("Input report missing")
    cmd=[str(ncu),"--import",str(report.resolve()),"--page","source","--print-source","sass","--csv"]
    result=subprocess.run(cmd,capture_output=True,text=True,timeout=180,check=False)
    out.mkdir(parents=True,exist_ok=False)
    (out/"source.stdout.csv").write_text(result.stdout,encoding="utf-8")
    (out/"source.stderr.txt").write_text(result.stderr,encoding="utf-8")
    state=inspect(result.stdout) if result.returncode==0 else {"status":"TOOL_FAILED","reason":"ncu import exit code "+str(result.returncode)}
    state.update({
       "schema":"gpu-uncooked.public-sass-probe.v1","source_report_sha256":hashlib.sha256(report.read_bytes()).hexdigest(),
       "source_stdout_sha256":hashlib.sha256(result.stdout.encode()).hexdigest(),
       "ncu_command":cmd,"ncu_exit_code":result.returncode,
       "instruction_count":"UNKNOWN","same_binary":"UNKNOWN",
       "hardware_attested":False,"cycle_accurate_trace":False,
       "classification":"THIRD_PARTY_UNVERIFIED"})
    (out/"sass-probe.json").write_text(json.dumps(state,indent=2)+"\n")
    return state

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ncu",required=True);ap.add_argument("--report",required=True);ap.add_argument("--output",required=True)
    args=ap.parse_args()
    try:
        report=decode(args.ncu,args.report,args.output)
        print(json.dumps({k:report[k] for k in ("status","reason","ncu_exit_code","source_report_sha256")}))
        return 0 if report["ncu_exit_code"]==0 else 1
    except (ValueError,OSError,subprocess.TimeoutExpired) as exc:
        print("REJECTED:",exc,file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
