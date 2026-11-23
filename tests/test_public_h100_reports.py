"""Offline test fixtures only: no H100 execution or actual Nsight decoding."""
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
import public_h100_reports as m

CSV="==PROF== Report\nID,Kernel Name,Metric Name,Metric Unit,Metric Value\n1,attention_kernel,dram__bytes_read.sum,byte,4096\n1,attention_kernel,sm__cycles_active.avg,cycle,1245\n"
class TestPublicH100Intake(unittest.TestCase):
 def test_csv_values_preserved_and_attributed(self):
  x=m.parse_ncu_raw_csv(CSV)
  self.assertEqual((x[0]["kernel"],x[0]["unit"],x[0]["raw_value"]),("attention_kernel","byte","4096"))
  self.assertEqual(len(x),2)
 def test_unknown_schema_and_missing_identity_refused(self):
  with self.assertRaisesRegex(ValueError,"Unsupported"):
   m.parse_ncu_raw_csv("unstructured summary")
  with self.assertRaisesRegex(ValueError,"identity"):
   m.parse_ncu_raw_csv(CSV.replace("1,attention_kernel,","1,,",1))
 def test_git_blob_hash_is_git_specific_not_sha256(self):
  data=b"known fixture"
  self.assertEqual(m.git_blob_sha(data),hashlib.sha1(b"blob 13\0known fixture").hexdigest())
 def test_tampered_source_rejected(self):
  with self.assertRaisesRegex(ValueError,"SHA mismatch"):m.verify_blob(b"fake","rswgmma_uniform4096")
 def test_full_fake_offline_import_and_no_attestation(self):
  with tempfile.TemporaryDirectory() as td:
   home=Path(td);root=home/"reports";root.mkdir()
   name="rswgmma_uniform4096";filename=m.REPORTS[name][0];payload=b"fake ncu bytes"
   with patch.dict(m.REPORTS,{name:(filename,len(payload),m.git_blob_sha(payload))}):
    (root/filename).write_bytes(payload)
    class R:
     returncode=0
     stdout=CSV
     stderr=""
    def runner(argv,**kwargs):
     self.assertEqual(argv[argv.index("--page")+1],"details")
     self.assertIn("--import",argv)
     return R()
    with patch.object(m.shutil,"which",return_value="/usr/bin/ncu"):
     result=m.extract(name,root,home/"out",runner=runner)
    self.assertEqual(result["status"],"PARSED_UNVERIFIED")
    self.assertEqual(result["classification"],"THIRD_PARTY_UNVERIFIED")
    self.assertFalse(result["hardware_attested"])
    self.assertFalse(result["reproduces_our_stride_experiment"])
    self.assertTrue((home/"out"/"ncu-stdout.txt").exists())
    with self.assertRaisesRegex(ValueError,"already exists"):
     m.extract(name,root,home/"out")
 def test_details_csv_preserves_section_and_rejects_empty_kernel(self):
  sample="ID,Kernel Name,Section Name,Metric Name,Metric Unit,Metric Value\n1,rswgmma,Memory Workload,dram__bytes_read.sum,byte,4096\n"
  x=m.parse_ncu_raw_csv(sample)
  self.assertEqual(x[0]["kernel"],"rswgmma")
  self.assertEqual(x[0]["raw_value"],"4096")
  with self.assertRaisesRegex(ValueError,"identity"):
   m.parse_ncu_raw_csv(sample.replace("1,rswgmma,","1,,"))
 def test_actual_2026_2_style_details_csv_omits_trailing_rule_columns(self):
  header='"ID","Process ID","Process Name","Host Name","Kernel Name","Context","Stream","Block Size","Grid Size","Device","CC","Section Name","Metric Name","Metric Unit","Metric Value","Rule Name","Rule Type","Rule Description","Estimated Speedup Type","Estimated Speedup"\\n'
  metric='"0","1562070","python3.12","127.0.0.1","attention_kernel","1","7","(128, 1, 1)","(512, 1, 1)","0","9.0","GPU Speed Of Light Throughput","Duration","ns","61056",\\n'
  result=m.parse_ncu_raw_csv(header+metric)
  self.assertEqual(len(result),1)
  self.assertEqual(result[0]["raw_value"],"61056")
  self.assertEqual(result[0]["section"],"GPU Speed Of Light Throughput")
  self.assertEqual(result[0]["unit"],"ns")

 def test_extractor_records_failure_without_manufacturing_metrics(self):
  with tempfile.TemporaryDirectory() as td:
   home=Path(td);root=home/"reports";root.mkdir()
   name="rswgmma_uniform4096";filename=m.REPORTS[name][0];payload=b"fake report"
   with patch.dict(m.REPORTS,{name:(filename,len(payload),m.git_blob_sha(payload))}):
    (root/filename).write_bytes(payload)
    class R:
     returncode=0
     stdout="this output contains no metric rows"
     stderr=""
    with patch.object(m.shutil,"which",return_value="/bin/ncu"):
     result=m.extract(name,root,home/"out",runner=lambda argv,**kwargs:R())
    self.assertEqual(result["status"],"UNSUPPORTED_CSV_SCHEMA")
    self.assertEqual(result["metrics"],[])
    self.assertFalse(result["hardware_attested"])
 def test_binary_modified_rejected_before_import(self):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td)/m.REPORTS["rswgmma_uniform4096"][0];p.write_bytes(b"spoof")
   with self.assertRaisesRegex(ValueError,"SHA mismatch"):
    m.extract("rswgmma_uniform4096",td,Path(td)/"output")
if __name__=="__main__":unittest.main()
