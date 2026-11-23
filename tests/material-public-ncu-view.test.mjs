import test from "node:test";
import assert from "node:assert/strict";
import {validatePublicNcuReport,comparePublicNcuReports} from "../playground/material-lab/public-ncu-view.mjs";
function fixture(id){
 return {
  schema:"gpu-uncooked.public-ncu-report.v1",report_id:id,
  classification:"THIRD_PARTY_UNVERIFIED",status:"PARSED_UNVERIFIED",
  hardware_attested:false,binary_identity_bound_to_our_gather:false,
  reproduces_our_stride_experiment:false,
  source_repo:"smartxiaohuolong/triton-tle-attention-optimization-demo",
  source_revision:"53fcfbf0c11430ca9db23f8d90c4ec71b686efc8",
  source_size_bytes:id.startsWith("rswgmma")?1100024:1007277,
  source_git_blob_sha1:id.startsWith("rswgmma")?"13ce934a7a036a4690bb62aa0be88929a75606d4":"c35316d5e68eaee8f9cc005eb030415ec2ccb0ce",
  source_sha256:"a".repeat(64),ncu_stdout_sha256:"b".repeat(64),
  source_device_claim:"H100 (upstream claim)",
  metrics:[{launch_id:"1",kernel:"attention_kernel",metric:"dram__bytes_read.sum",unit:"byte",raw_value:id.startsWith("rsw")?"4096":"2048"}]
 };
}
test("public WGMMA comparison keeps third party status and exact raw units",()=>{
 const left=validatePublicNcuReport(fixture("rswgmma_uniform4096"));
 const right=validatePublicNcuReport(fixture("memdesc_transpose_uniform4096"));
 const result=comparePublicNcuReports(left,right);
 assert.equal(result.classification,"THIRD_PARTY_UNVERIFIED");
 assert.equal(result.hardwareAttested,false);
 assert.deepEqual(result.metrics,[{section:"",metric:"dram__bytes_read.sum",unit:"byte",left:"4096",right:"2048"}]);
});
test("spoofed gathered source and independently attested booleans rejected",()=>{
 for(const change of [{hardware_attested:true},{classification:"MEASURED"},
 {reproduces_our_stride_experiment:true},{source_revision:"main"},
 {source_sha256:"fake"},{source_git_blob_sha1:"0".repeat(40)},{source_size_bytes:500}]){
  assert.throws(()=>validatePublicNcuReport({...fixture("rswgmma_uniform4096"),...change}));
 }
});
test("two reports with same metric names but different Nsight sections never compare",()=>{
 const one=fixture("rswgmma_uniform4096");
 const two=fixture("memdesc_transpose_uniform4096");
 one.metrics[0].section="Memory Workload Analysis";
 two.metrics[0].section="Speed Of Light";
 const a=validatePublicNcuReport(one),b=validatePublicNcuReport(two);
 assert.equal(comparePublicNcuReports(a,b).metrics.length,0);
});
test("multiple launches and nonmatching units are excluded rather than averaged",()=>{
 const a=validatePublicNcuReport({...fixture("rswgmma_uniform4096"),metrics:[
  ...fixture("rswgmma_uniform4096").metrics,
  {launch_id:"2",kernel:"attention_kernel",metric:"dram__bytes_read.sum",unit:"byte",raw_value:"777"}]});
 const b=validatePublicNcuReport(fixture("memdesc_transpose_uniform4096"));
 assert.equal(comparePublicNcuReports(a,b).metrics.length,0);
 const x=fixture("memdesc_transpose_uniform4096");x.metrics[0].unit="sector";
 assert.equal(comparePublicNcuReports(validatePublicNcuReport(fixture("rswgmma_uniform4096")),validatePublicNcuReport(x)).metrics.length,0);
});
