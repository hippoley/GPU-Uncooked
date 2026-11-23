"""Strict no-GPU checks for saved public Nsight SASS probe."""
import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
import probe_public_h100_sass as m
class TestProbe(unittest.TestCase):
 def test_duration_metrics_do_not_become_instructions(self):
  d=m.inspect("ID,Kernel Name,Metric Name,Metric Value\n0,foo,Duration,38816")
  self.assertEqual(d["status"],"SASS_NOT_CONFIRMED")
 def test_saved_source_does_not_assert_sass_instruction_count(self):
  with tempfile.TemporaryDirectory() as root:
   inp=Path(root)/"fixture.ncu-rep";inp.write_bytes(b"fixture")
   class Fake:
    returncode=0
    stdout="Instruction\nOpaque vendor source output"
    stderr=""
   with patch.object(m.subprocess,"run",return_value=Fake()) as runner:
    d=m.decode("ncu",inp,Path(root)/"out")
   self.assertEqual(runner.call_args.args[0][-5:],["--page","source","--print-source","sass","--csv"])
   self.assertEqual(d["instruction_count"],"UNKNOWN")
   self.assertFalse(d["hardware_attested"])
   self.assertTrue((Path(root)/"out"/"source.stdout.csv").exists())
 def test_empty_source_fails_closed(self):
  self.assertEqual(m.inspect("")["status"],"SASS_NOT_CONFIRMED")
 def test_overwriting_evidence_refused(self):
  with tempfile.TemporaryDirectory() as root:
   inp=Path(root)/"fixture.ncu-rep";inp.write_bytes(b"x")
   with self.assertRaisesRegex(ValueError,"overwrite"):
    m.decode("ncu",inp,Path(root))
if __name__=="__main__":unittest.main()
