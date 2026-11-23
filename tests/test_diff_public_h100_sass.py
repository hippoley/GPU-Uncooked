import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from diff_public_h100_sass import parse,compare
def csv_fixture(kernel,opcode,executions):
 return (f'"Kernel Name","{kernel}",\n'
         '"Address","Source","Instructions Executed"\n'
         f'"0x100","      @!UP1 {opcode} R4, R5","{executions}"\n'
         '"0x110","      @P0 QGMMA.64x8x32.F32.E4M3.E4M3 R24, gdesc[UR8], RZ, !UPT","16"\n')
class SassTests(unittest.TestCase):
 def test_predication_qgmma_and_executions(self):
  a=parse(csv_fixture("rsw","STS",64))
  self.assertEqual(a["dynamic"]["QGMMA"],16)
  self.assertEqual(a["dynamic"]["STS"],64)
  self.assertEqual(a["static_lines"],2)
 def test_mixed_kernels_keep_duration_unknown(self):
  a=compare(csv_fixture("rsw","STS",64),csv_fixture("memdesc","PRMT",16))
  self.assertEqual(a["duration_correspondence"],"UNKNOWN")
  self.assertFalse(a["causal_speedup_proven"])
  self.assertFalse(a["same_binary_verified"])
 def test_duplicate_machine_address_rejected(self):
  x=csv_fixture("rsw","STS",1)+'"0x100","MOV R1, R2","1"\n'
  with self.assertRaisesRegex(ValueError,"Duplicate"):
   parse(x)
 def test_invalid_instruction_counter_rejected(self):
  with self.assertRaisesRegex(ValueError,"Noninteger"):
   parse(csv_fixture("rsw","STS",-1))
if __name__=="__main__":unittest.main()
