"""No-GPU acceptance tests for identity-bound Nsight comparison."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"tools"))
from summarize_gather_ncu_series import parse_raw_csv, summarize, REQUIRED

HEADER = "ID,Kernel Name,Metric Name,Metric Value\n"

def csv_text(stride):
    return "==PROF== Connected\n"+HEADER+ "".join(
        f'1,gather,"{metric}",{stride*100+i}\n'
        for i,metric in enumerate(REQUIRED)) + f"PASS stride={stride} lanes=32 input=256 verified=32\n"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

class NcuComparisonTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.binary = self.root/"origin"/"gather"
        self.binary.parent.mkdir()
        self.binary.write_bytes(b"TEST BINARY FIXTURE ONLY")
        self.folder = self.root/"series"
        self.folder.mkdir()
        self.manifest = dict(
            schema="gpu-uncooked.ncu-stride-series.v1",
            status="COLLECTED_UNVERIFIED",
            hardware_attested=False,
            device_uuid="GPU-fixture-123456",
            binary_sha256=sha(self.binary),
            source_manifest_sha256="c"*64,
            strides=[1,4,8],metrics_requested=list(REQUIRED),
            file_sha256={},commands={}
        )
        self.save("ncu-version.json",{"argv":["ncu","--version"],"exit_code":0,"stdout":"Fixture ncu","stderr":""})
        for stride in (1,4,8):
            name=f"ncu-stride{stride}.json"
            argv=["ncu","--csv","--page","raw","--kernel-name","regex:gather",
                  "--kernel-name-base","function","--launch-count","1",
                  "--metrics",",".join(REQUIRED),"--",str(self.binary),str(stride)]
            self.save(name,{"argv":argv,"exit_code":0,"stdout":csv_text(stride),"stderr":""})
            self.manifest["commands"][str(stride)]=name
        self.refresh()

    def save(self,name,obj):
        path=self.folder/name
        path.write_text(json.dumps(obj))
        self.manifest["file_sha256"][name]=sha(path)

    def refresh(self):
        (self.folder/"manifest.json").write_text(json.dumps(self.manifest))

    def edit_command(self,stride,mutator):
        name=f"ncu-stride{stride}.json"
        data=json.loads((self.folder/name).read_text())
        mutator(data)
        self.save(name,data)
        self.refresh()

    def test_three_strides_share_binary_and_keep_profiler_claims_unverified(self):
        result=summarize(self.folder)
        self.assertEqual(result["classification"],"REPORTED_UNVERIFIED")
        self.assertFalse(result["hardware_attested"])
        self.assertEqual([x["expected_source_32b_regions"] for x in result["rows"]],[4,16,32])
        self.assertEqual([x["source_region_bytes_span"] for x in result["rows"]],[128,512,1024])
        self.assertEqual([x["claimed_profiler_metrics"][REQUIRED[0]] for x in result["rows"]],[100,400,800])

    def bind_origin_fixture(self):
        # The original verifier is separately covered by test_gather_receipt.py.
        # These tests isolate the extra cross-receipt identity requirement.
        raw_manifest = {
            "compiler_arch": "sm_90",
            "git_commit": "f"*40,
            "file_sha256": {"gather": sha(self.binary)}
        }
        (self.binary.parent/"manifest.json").write_text(json.dumps(raw_manifest))
        self.manifest["source_manifest_sha256"] = sha(self.binary.parent/"manifest.json")
        self.manifest["compiler_arch"] = "sm_90"
        self.manifest["git_commit"] = "f"*40
        self.refresh()
        return self.binary.parent

    def test_bound_origin_checks_actual_binary_and_gpu_identity(self):
        raw = self.bind_origin_fixture()
        with patch("summarize_gather_ncu_series.verify_raw_receipt",
                   return_value={"device_uuid":self.manifest["device_uuid"]}):
            v = summarize(self.folder,raw_folder=raw)
        self.assertTrue(v["origin_bytes_rechecked"])
        self.assertFalse(v["hardware_attested"])

    def test_bound_origin_rejects_changed_binary_bytes(self):
        raw = self.bind_origin_fixture()
        self.binary.write_bytes(b"CHANGED BYTES")
        with patch("summarize_gather_ncu_series.verify_raw_receipt",
                   return_value={"device_uuid":self.manifest["device_uuid"]}):
            with self.assertRaisesRegex(ValueError,"Original binary bytes"):
                summarize(self.folder,raw_folder=raw)

    def test_bound_origin_rejects_swapped_device_uuid(self):
        raw = self.bind_origin_fixture()
        with patch("summarize_gather_ncu_series.verify_raw_receipt",
                   return_value={"device_uuid":"GPU-some-other-device"}):
            with self.assertRaisesRegex(ValueError,"Original GPU UUID"):
                summarize(self.folder,raw_folder=raw)

    def test_bound_origin_rejects_mismatched_manifest(self):
        raw = self.bind_origin_fixture()
        self.manifest["source_manifest_sha256"] = "0"*64
        self.refresh()
        with patch("summarize_gather_ncu_series.verify_raw_receipt",
                   return_value={"device_uuid":self.manifest["device_uuid"]}):
            with self.assertRaisesRegex(ValueError,"manifest hash"):
                summarize(self.folder,raw_folder=raw)

    def test_reject_missing_metric(self):
        self.edit_command(8,lambda d:d.update(stdout=d["stdout"].replace(REQUIRED[1],"not_a_counter")))
        with self.assertRaisesRegex(ValueError,"Missing requested"): summarize(self.folder)

    def test_reject_mismatched_stride(self):
        self.edit_command(8,lambda d:d["argv"].__setitem__(-1,"4"))
        with self.assertRaisesRegex(ValueError,"stride argument"): summarize(self.folder)

    def test_reject_swapped_binary(self):
        self.edit_command(4,lambda d:d["argv"].__setitem__(-2,"/tmp/fake/gather"))
        with self.assertRaisesRegex(ValueError,"Different binary paths"): summarize(self.folder)

    def test_reject_multiple_kernel_launch_ids(self):
        self.edit_command(1,lambda d:d.update(stdout=d["stdout"].replace(
            f'1,gather,"{REQUIRED[0]}"',f'2,gather,"{REQUIRED[0]}"')))
        with self.assertRaisesRegex(ValueError,"exactly one"): summarize(self.folder)

    def test_reject_tampered_capture(self):
        p=self.folder/"ncu-stride1.json"
        p.write_text(p.read_text()+" ")
        with self.assertRaisesRegex(ValueError,"checksum mismatch"): summarize(self.folder)

    def test_reject_self_attestation(self):
        self.manifest["hardware_attested"]=True
        self.refresh()
        with self.assertRaisesRegex(ValueError,"not complete"): summarize(self.folder)

    def test_reject_non_numeric_and_duplicate_rows(self):
        text=csv_text(1).replace("100\n","nan\n")
        with self.assertRaisesRegex(ValueError,"non-numeric"): parse_raw_csv(text)
        duplicated=csv_text(1)+f'1,gather,"{REQUIRED[0]}",222\n'
        with self.assertRaisesRegex(ValueError,"Duplicate metric"): parse_raw_csv(duplicated)

if __name__=="__main__":
    unittest.main()
