"""No-GPU acceptance tests for identity-bound Nsight comparison."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"tools"))
from capture_gather_ncu_series import capture
from summarize_gather_ncu_series import parse_raw_csv, summarize, REQUIRED

HEADER = "ID,Kernel Name,Metric Name,Metric Unit,Metric Value\n"

def csv_text(stride):
    return "==PROF== Connected\n"+HEADER+ "".join(
        f'1,gather,"{metric}",{"sector" if i==0 else "byte"},{stride*100+i}\n'
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
            argv=["ncu","--csv","--page","details","--print-units","base",
                  "--cache-control","all","--kernel-name","regex:gather",
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

    def test_full_collection_pipeline_via_fake_profiler(self):
        raw = self.bind_origin_fixture()
        comparison_dir = self.root/"new-capture"
        uuid = self.manifest["device_uuid"]
        def fake_run(argv,*,env,timeout=300):
            self.assertEqual(env["CUDA_VISIBLE_DEVICES"],uuid)
            if "--version" in argv:
                return {"argv":argv,"exit_code":0,"stdout":"ncu 2026 fixture","stderr":""}
            self.assertIn("--page",argv)
            self.assertEqual(argv[argv.index("--page")+1],"details")
            self.assertIn("--cache-control",argv)
            self.assertEqual(argv[argv.index("--cache-control")+1],"all")
            self.assertIn("--metrics",argv)
            self.assertEqual(argv[-2],str(self.binary))
            stride=int(argv[-1])
            return {"argv":argv,"exit_code":0,"stdout":csv_text(stride),"stderr":""}
        with patch("capture_gather_ncu_series.verify",return_value={"device_uuid":uuid}),\
             patch("capture_gather_ncu_series.shutil.which",return_value="/usr/bin/ncu"),\
             patch("capture_gather_ncu_series.run",side_effect=fake_run):
            receipt=capture(raw,comparison_dir,uuid,execute=True)
        self.assertEqual(receipt["status"],"COLLECTED_UNVERIFIED")
        self.assertFalse(receipt["hardware_attested"])
        with patch("summarize_gather_ncu_series.verify_raw_receipt",
                   return_value={"device_uuid":uuid}):
            summary=summarize(comparison_dir,raw_folder=raw)
        self.assertTrue(summary["origin_bytes_rechecked"])
        self.assertEqual(len(summary["rows"]),3)

    def test_full_collection_pipeline_rejects_wrong_metric_rows(self):
        raw=self.bind_origin_fixture()
        folder=self.root/"invalid-capture"
        uuid=self.manifest["device_uuid"]
        def fake_run(argv,*,env,timeout=300):
            if "--version" in argv:
                return {"argv":argv,"exit_code":0,"stdout":"ncu fixture","stderr":""}
            stride=int(argv[-1])
            stdout=csv_text(stride).replace(REQUIRED[1],"wrong_metric")
            return {"argv":argv,"exit_code":0,"stdout":stdout,"stderr":""}
        with patch("capture_gather_ncu_series.verify",return_value={"device_uuid":uuid}),\
             patch("capture_gather_ncu_series.shutil.which",return_value="/usr/bin/ncu"),\
             patch("capture_gather_ncu_series.run",side_effect=fake_run):
            receipt=capture(raw,folder,uuid,execute=True)
        self.assertEqual(receipt["status"],"INCOMPLETE")
        self.assertTrue(any("lacks attributable" in e for e in receipt["error_messages"]))
        with self.assertRaisesRegex(ValueError,"not complete"):
            summarize(folder)

    def test_collection_never_runs_without_explicit_execute(self):
        with self.assertRaisesRegex(ValueError,"--execute"):
            capture(self.binary.parent,self.root/"not-created","GPU-fixture",execute=False)
        self.assertFalse((self.root/"not-created").exists())

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

    def test_reject_wrong_profiler_units(self):
        raw=csv_text(1).replace(f'"{REQUIRED[1]}",byte',f'"{REQUIRED[1]}",%')
        with self.assertRaisesRegex(ValueError,"unit is incompatible"):
            parse_raw_csv(raw)

    def test_reject_missing_or_ambiguous_launch_id(self):
        no_id=csv_text(1).replace("ID,Kernel Name,","Kernel Name,").replace("1,gather,","gather,")
        with self.assertRaisesRegex(ValueError,"per-launch ID"):
            parse_raw_csv(no_id)
        blank=csv_text(1).replace("1,gather,"," ,gather,")
        with self.assertRaisesRegex(ValueError,"launch ID"):
            parse_raw_csv(blank)

    def test_reject_fractional_counter_claim(self):
        fractional=csv_text(1).replace(f'"{REQUIRED[0]}",sector,100',f'"{REQUIRED[0]}",sector,100.5')
        with self.assertRaisesRegex(ValueError,"finite nonnegative"):
            parse_raw_csv(fractional)

    def test_reject_non_numeric_and_duplicate_rows(self):
        text=csv_text(1).replace("100\n","nan\n")
        with self.assertRaisesRegex(ValueError,"non-numeric"): parse_raw_csv(text)
        duplicated=csv_text(1)+f'1,gather,"{REQUIRED[0]}",sector,222\n'
        with self.assertRaisesRegex(ValueError,"Duplicate metric"): parse_raw_csv(duplicated)

if __name__=="__main__":
    unittest.main()
