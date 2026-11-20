import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("inventory", Path(__file__).resolve().parents[1] / "hardware" / "inventory.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class FakeCompleted:
    returncode = 0
    stdout = "ok"
    stderr = ""

class TestInventory(unittest.TestCase):
    def test_collect_all_commands(self):
        calls = []
        def fake_run(argv, **kwargs):
            calls.append(argv)
            self.assertTrue(kwargs["capture_output"])
            self.assertLessEqual(kwargs["timeout"], 15)
            return FakeCompleted()
        result = module.collect(fake_run)
        self.assertEqual(len(calls), 3)
        self.assertEqual(result["status"], "inventory_only")
        self.assertTrue(all(v["returncode"] == 0 for v in result["commands"].values()))

    def test_missing_nvidia_smi_is_recorded(self):
        def fail(*args, **kwargs):
            raise FileNotFoundError("nvidia-smi")
        result = module.collect(fail)
        self.assertEqual(len(result["commands"]), 3)
        self.assertTrue(all("FileNotFoundError" in x["error"] for x in result["commands"].values()))

if __name__ == "__main__":
    unittest.main()
