#!/usr/bin/env python3
"""Compare archived third-party Nsight Source CSV SASS and execution counters."""
import argparse,csv,hashlib,io,json,re
from collections import Counter
from pathlib import Path
ADDR=re.compile(r"0x[0-9a-fA-F]+\Z")
PRED=re.compile(r"^@!?[A-Za-z0-9_]+\s+")
OP=re.compile(r"([A-Z][A-Za-z0-9_.]*)(?:\s|\Z)")

def parse(text):
    rows=list(csv.reader(io.StringIO(text)))
    kernels=[r[1].strip() for r in rows if len(r)>1 and r[0]=="Kernel Name"]
    if len(kernels)!=1 or not kernels[0]:raise ValueError("No unique kernel identity")
    required={"Address","Source","Instructions Executed"}
    headers=[(i,r) for i,r in enumerate(rows) if required.issubset(r)]
    if len(headers)!=1:raise ValueError("Unrecognized Nsight Source CSV layout")
    start,header=headers[0]
    ix={k:header.index(k) for k in required}
    static,dynamic=Counter(),Counter()
    seen=set()
    for r in rows[start+1:]:
        if not r or not r[0].strip():continue
        addr=r[ix["Address"]].strip() if len(r)>ix["Address"] else ""
        if not ADDR.fullmatch(addr):raise ValueError("Unexpected SASS address")
        if addr in seen:raise ValueError("Duplicate SASS address")
        seen.add(addr)
        if len(r)<=max(ix.values()):raise ValueError("Truncated SASS instruction row")
        source=PRED.sub("",r[ix["Source"]].strip())
        match=OP.match(source)
        if not match:raise ValueError("Missing SASS opcode at "+addr)
        raw=r[ix["Instructions Executed"]].replace(",","").strip()
        if not re.fullmatch(r"\d+",raw):raise ValueError("Noninteger SASS execution count")
        opcode=match.group(1).split(".")[0]
        static[opcode]+=1
        dynamic[opcode]+=int(raw)
    if not seen:raise ValueError("Empty SASS listing")
    return {"kernel":kernels[0],"static_lines":sum(static.values()),
            "reported_instruction_executions":sum(dynamic.values()),
            "static":static,"dynamic":dynamic}

def compare(left_text,right_text):
    a,b=parse(left_text),parse(right_text)
    ops=sorted(set(a["static"])|set(b["static"]))
    return {
      "schema":"gpu-uncooked.public-sass-diff.v1",
      "classification":"THIRD_PARTY_UNVERIFIED",
      "hardware_attested":False,"same_binary_verified":False,
      "duration_correspondence":"UNKNOWN","causal_speedup_proven":False,
      "instruction_executions_are_not_cycles":True,
      "left":{"kernel":a["kernel"],"sha256":hashlib.sha256(left_text.encode()).hexdigest(),
              "static_sass_lines":a["static_lines"],"reported_instruction_executions":a["reported_instruction_executions"]},
      "right":{"kernel":b["kernel"],"sha256":hashlib.sha256(right_text.encode()).hexdigest(),
               "static_sass_lines":b["static_lines"],"reported_instruction_executions":b["reported_instruction_executions"]},
      "opcodes":[{"opcode":op,"static_left":a["static"][op],"static_right":b["static"][op],
                  "executions_left":a["dynamic"][op],"executions_right":b["dynamic"][op],
                  "static_delta":b["static"][op]-a["static"][op],
                  "executions_delta":b["dynamic"][op]-a["dynamic"][op]} for op in ops],
      "limitations":["Third-party reported counters, not an independently measured H100 execution",
                     "Source lines are static SASS; instruction execution counters are not individual cycle traces",
                     "The full-source kernels are not identity-linked to the separate two Duration reports"]}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--left",required=True);p.add_argument("--right",required=True)
    p.add_argument("--output",required=True);a=p.parse_args()
    out=Path(a.output)
    if out.exists():p.error("Refusing to overwrite output")
    result=compare(Path(a.left).read_text(),Path(a.right).read_text())
    out.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"left":result["left"]["kernel"],"right":result["right"]["kernel"],
                      "left_executions":result["left"]["reported_instruction_executions"],
                      "right_executions":result["right"]["reported_instruction_executions"]}))
if __name__=="__main__":main()
