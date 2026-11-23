import test from "node:test";
import assert from "node:assert/strict";
import {parseNcuComparison} from "../playground/material-lab/ncu-comparison-view.mjs";
const metricNames=["l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum","dram__bytes_read.sum","dram__bytes_write.sum"];
function sample(){
 return {
  schema:"gpu-uncooked.ncu-comparison.v1",
  classification:"REPORTED_UNVERIFIED",
  hardware_attested:false,origin_bytes_rechecked:true,
  binary_sha256:"a".repeat(64),source_manifest_sha256:"b".repeat(64),series_manifest_sha256:"c".repeat(64),
  device_uuid_claim:"GPU-FAKE-FIXTURE",
  rows:[1,4,8].map((stride,i)=>({
   stride,expected_source_32b_regions:[4,16,32][i],
   source_region_bytes_span:[128,512,1024][i],kernel:"gather",
   profile_transcript_sha256:"d".repeat(64),
   claimed_profiler_metrics:Object.fromEntries(metricNames.map((k,j)=>[k,100*(i+1)+j]))
  }))
 };
}
test("legitimate-shape sample stays reported-unverified",()=>{
 const v=parseNcuComparison(sample());
 assert.equal(v.status,"REPORTED_UNVERIFIED");
 assert.equal(v.hardwareAttested,false);
 assert.deepEqual(v.rows.map(x=>x.sourceRegions),[4,16,32]);
 assert.deepEqual(v.rows.map(x=>x.l1LoadSectors),[100,200,300]);
});
test("forged attestation and malformed comparison are rejected",()=>{
 assert.throws(()=>parseNcuComparison({...sample(),hardware_attested:true}),/Cannot upgrade/);
 assert.throws(()=>parseNcuComparison({...sample(),origin_bytes_rechecked:false}),/not been rechecked/);
 assert.throws(()=>parseNcuComparison({...sample(),classification:"MEASURED"}),/Cannot upgrade/);
 assert.throws(()=>parseNcuComparison({...sample(),binary_sha256:"fake"}),/receipt hash/);
 const bad=sample();bad.rows[2].stride=4;
 assert.throws(()=>parseNcuComparison(bad),/not reproducible/);
});
test("missing, negative, and undeclared metrics cannot become results",()=>{
 const m=sample();delete m.rows[0].claimed_profiler_metrics[metricNames[0]];
 assert.throws(()=>parseNcuComparison(m),/metrics invalid/);
 const negative=sample();negative.rows[2].claimed_profiler_metrics[metricNames[1]]=-1;
 assert.throws(()=>parseNcuComparison(negative),/metrics invalid/);
 const forged=sample();forged.rows[1].claimed_profiler_metrics.fake=999;
 assert.throws(()=>parseNcuComparison(forged),/metrics invalid/);
});
