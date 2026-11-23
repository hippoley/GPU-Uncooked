import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from tools.verify_gather_receipt import verify
from tools.export_gather_receipt_view import export

def h(b): return hashlib.sha256(b).hexdigest()
class ReceiptTests(unittest.TestCase):
 def make(self,root):
  files={}
  for name in ("inventory.json","compile.json","sass-command.json","ptx-command.json",
               "gather","source-gather.cu","gather.ptx.txt","gather.sass.txt",
               "run-stride1.json","run-stride4.json","run-stride8.json"):
   if name.startswith("run-stride"):
    s=int(name.split("stride")[1].split(".")[0])
    val=json.dumps({"argv":["./gather",str(s)],"exit_code":0,"stdout":f"PASS stride={s} lanes=32 input=256 verified=32","stderr":""})
   elif name=="compile.json":
    val=json.dumps({"argv":["nvcc","-gencode","arch=compute_80,code=[sm_80,compute_80]",str(root/"source-gather.cu"),"-o","gather"],"exit_code":0,"stdout":"ok","stderr":""})
   elif name in ("sass-command.json","ptx-command.json"):
    val=json.dumps({"argv":["cuobjdump"],"exit_code":0,"stdout":"ok","stderr":""})
   else: val="test binary or disassembly"
   (root/name).write_text(val)
   files[name]=h(val.encode())
  manifest={"schema_version":"gpu-uncooked.raw-gpu-receipt.v1",
   "status":"COLLECTED_UNVERIFIED","trust":"UNVERIFIED_CAPTURE_NOT_ATTESTATION",
   "device":{"uuid":"GPU-test"},"environment":{"CUDA_VISIBLE_DEVICES":"GPU-test"},
   "compiler_arch":"sm_80","git_commit":"a"*40,"strides":[1,4,8],"source_sha256":files["source-gather.cu"],
   "command_files":{"compile":"compile.json","sass":"sass-command.json",
      "ptx":"ptx-command.json",**{"run_"+str(i):f"run-stride{i}.json" for i in (1,4,8)}},
   "profile_requested":False,"file_sha256":files}
  (root/"manifest.json").write_text(json.dumps(manifest))
  return manifest
 def test_export_view_never_upgrades_trust(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.make(root)
   result=export(root)
   self.assertEqual(result["schema"],"gpu-uncooked.receipt-view.v1")
   self.assertEqual(result["classification"],"UNATTESTED_RAW_CAPTURE")
   self.assertFalse(result["hardware_attested"])
   self.assertIsNone(result["measured_gpu_metrics"])
   self.assertEqual(len(result["runs"]),3)
 def test_export_rejects_modified_sass(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.make(root)
   (root/"gather.sass.txt").write_text("unverified altered instructions")
   with self.assertRaisesRegex(ValueError,"Mismatching file hash"): export(root)
 def test_coherent_mock_passes_integrity_but_not_attestation(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.make(root)
   result=verify(root)
   self.assertEqual(result["integrity"],"PASS")
   self.assertFalse(result["hardware_attested"])
 def test_tampering_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.make(root)
   (root/"gather.sass.txt").write_text("tampered")
   with self.assertRaisesRegex(ValueError,"Mismatching file hash"): verify(root)
 def test_fake_measured_status_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);m=self.make(root);m["status"]="MEASURED"
   (root/"manifest.json").write_text(json.dumps(m))
   with self.assertRaisesRegex(ValueError,"Not a completed"): verify(root)
 def test_unhashed_extra_file_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);self.make(root);(root/"secret.txt").write_text("unlisted")
   with self.assertRaisesRegex(ValueError,"Unhashed"): verify(root)
 def test_wrong_compiled_source_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);m=self.make(root)
   p=root/"compile.json";cmd=json.loads(p.read_text());cmd["argv"][-3]="/tmp/other.cu"
   p.write_text(json.dumps(cmd));m["file_sha256"]["compile.json"]=h(p.read_bytes())
   (root/"manifest.json").write_text(json.dumps(m))
   with self.assertRaisesRegex(ValueError,"Compile did not use captured"): verify(root)
 def test_wrong_compiler_arch_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);m=self.make(root)
   p=root/"compile.json";cmd=json.loads(p.read_text());cmd["argv"][2]="arch=compute_90,code=[sm_90,compute_90]"
   p.write_text(json.dumps(cmd));m["file_sha256"]["compile.json"]=h(p.read_bytes())
   (root/"manifest.json").write_text(json.dumps(m))
   with self.assertRaisesRegex(ValueError,"Compiler target"): verify(root)
 def test_missing_profiler_report_fails(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);m=self.make(root);m["profile_requested"]=True
   m["command_files"]["profile"]="ncu-command.json"
   p=root/"ncu-command.json";p.write_text(json.dumps({"argv":["ncu"],"exit_code":0,"stdout":"ok"}))
   m["file_sha256"]["ncu-command.json"]=h(p.read_bytes())
   (root/"manifest.json").write_text(json.dumps(m))
   with self.assertRaisesRegex(ValueError,"Profiler raw report missing"): verify(root)
if __name__=="__main__": unittest.main()
