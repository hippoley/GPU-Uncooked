#!/usr/bin/env python3
"""Immutable third-party H100 ncu report intake. Does NOT run CUDA or attest hardware."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

REPO="smartxiaohuolong/triton-tle-attention-optimization-demo"
REVISION="53fcfbf0c11430ca9db23f8d90c4ec71b686efc8"
REPORTS={
 "rswgmma_uniform4096":("rswgmma_uniform4096.ncu-rep",1100024,"13ce934a7a036a4690bb62aa0be88929a75606d4"),
 "memdesc_transpose_uniform4096":("memdesc_transpose_uniform4096.ncu-rep",1007277,"c35316d5e68eaee8f9cc005eb030415ec2ccb0ce"),
 "rswgmma_uniform4096_full_source":("rswgmma_uniform4096_full_source_cleaned_20261111.ncu-rep",1419155,"852eaf2bcc2aba85efdf0574ef79b5b3824c08df"),
 "memdesc_transpose_uniform4096_full_source":("memdesc_transpose_uniform4096_full_source_cleaned_20261111.ncu-rep",1357278,"3850ae38e2f158cb42f3dad8db281f58dcc5550a")
}
def git_blob_sha(data):
 return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
def verify_blob(data,name):
 filename,n,sha=REPORTS[name]
 if len(data)!=n or git_blob_sha(data)!=sha: raise ValueError("Pinned report size / git-blob SHA mismatch: "+filename)
 return {"filename":filename,"bytes":n,"git_blob_sha1":sha,"sha256":hashlib.sha256(data).hexdigest()}
def fetch(name,folder,*,opener=urllib.request.urlopen):
 if name not in REPORTS:raise ValueError("Unknown report")
 path=Path(folder)/REPORTS[name][0]
 if path.exists():return {**verify_blob(path.read_bytes(),name),"path":str(path),"downloaded":False}
 url="https://raw.githubusercontent.com/"+REPO+"/"+REVISION+"/reports/"+REPORTS[name][0]
 with opener(url,timeout=90) as resp:data=resp.read(4_000_001)
 info=verify_blob(data,name)
 path.parent.mkdir(parents=True,exist_ok=True)
 try:
  with path.open("xb") as f:f.write(data)
 except FileExistsError:
  verify_blob(path.read_bytes(),name)
  return {**info,"path":str(path),"downloaded":False}
 return {**info,"path":str(path),"downloaded":True}
def parse_ncu_raw_csv(text):
 rows=list(csv.reader(io.StringIO(text)))
 required=("ID","Kernel Name","Metric Name","Metric Unit","Metric Value")
 headers=[(i,r) for i,r in enumerate(rows) if all(k in r for k in required)]
 if len(headers)!=1:raise ValueError("Unsupported ncu raw CSV layout; keep original transcript")
 begin,header=headers[0]
 ix={k:header.index(k) for k in required}
 records=[]
 for r in rows[begin+1:]:
  # Nsight Compute 2026.2 Details CSV emits rows with trailing empty
  # rule columns omitted (e.g. 16 fields for a 20-column header).
  # Only indexed mandatory fields must exist; never shift their positions.
  if len(r)<=max(ix.values()):continue
  if len(r)>len(header):raise ValueError("Unexpected extra Nsight CSV columns")
  metric=r[ix["Metric Name"]].strip()
  if not metric:continue
  launch=r[ix["ID"]].strip();kernel=r[ix["Kernel Name"]].strip()
  if not launch or not kernel:raise ValueError("Metric lacks explicit kernel identity")
  section=r[header.index("Section Name")].strip() if "Section Name" in header else ""
  records.append({"launch_id":launch,"kernel":kernel,"section":section,"metric":metric,
                  "unit":r[ix["Metric Unit"]].strip(),"raw_value":r[ix["Metric Value"]].strip()})
 if not records:raise ValueError("No identifiable metric records")
 return records
def extract(name,report_folder,out_folder,*,ncu="ncu",runner=subprocess.run):
 if name not in REPORTS:raise ValueError("Unknown report")
 src=Path(report_folder)/REPORTS[name][0]
 info=verify_blob(src.read_bytes(),name)
 out=Path(out_folder)
 if out.exists():raise ValueError("Output directory already exists")
 if shutil.which(ncu) is None:raise ValueError("ncu is unavailable; install compatible Nsight Compute")
 command=[ncu,"--import",str(src.resolve()),"--page","details","--csv","--print-units","base"]
 result=runner(command,capture_output=True,text=True,timeout=90,check=False)
 status="PARSED_UNVERIFIED";error=None;metrics=[]
 if result.returncode!=0:
  status="EXTRACTION_FAILED";error="ncu exit code "+str(result.returncode)
 else:
  try:metrics=parse_ncu_raw_csv(result.stdout)
  except ValueError as exc:status="UNSUPPORTED_CSV_SCHEMA";error=str(exc)
 out.mkdir(parents=True)
 (out/"ncu-stdout.txt").write_text(result.stdout,encoding="utf-8")
 (out/"ncu-stderr.txt").write_text(result.stderr,encoding="utf-8")
 report={
  "schema":"gpu-uncooked.public-ncu-report.v1","report_id":name,
  "source_repo":REPO,"source_revision":REVISION,"source_git_path":"reports/"+info["filename"],
  "source_size_bytes":info["bytes"],"source_git_blob_sha1":info["git_blob_sha1"],
  "source_sha256":info["sha256"],
  "source_device_claim":"NVIDIA H100 SM90 (upstream README; unverified)",
  "source_device_verified":False,
  "status":status,"classification":"THIRD_PARTY_UNVERIFIED","hardware_attested":False,
  "binary_identity_bound_to_our_gather":False,"reproduces_our_stride_experiment":False,
  "ncu_command":command,"ncu_page":"details","ncu_exit_code":result.returncode,
  "ncu_stdout_sha256":hashlib.sha256(result.stdout.encode()).hexdigest(),
  "ncu_stderr_sha256":hashlib.sha256(result.stderr.encode()).hexdigest(),
  "error":error,"metrics":metrics}
 (out/"report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 return report
def main():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest="command",required=True)
 f=sub.add_parser("fetch");f.add_argument("--report",required=True,choices=REPORTS);f.add_argument("--dir",required=True)
 e=sub.add_parser("extract");e.add_argument("--report",required=True,choices=REPORTS)
 e.add_argument("--dir",required=True);e.add_argument("--output",required=True);e.add_argument("--ncu",default="ncu")
 a=p.parse_args()
 try:
  result=fetch(a.report,a.dir) if a.command=="fetch" else extract(a.report,a.dir,a.output,ncu=a.ncu)
  print(json.dumps(result if a.command=="fetch" else {k:result[k] for k in ("report_id","status","classification","error")},ensure_ascii=False))
  return 0 if a.command=="fetch" or result["status"]=="PARSED_UNVERIFIED" else 1
 except (OSError,ValueError,subprocess.TimeoutExpired) as exc:
  print("REJECTED: "+str(exc),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
