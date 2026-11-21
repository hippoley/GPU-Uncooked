import test from "node:test";
import assert from "node:assert/strict";
import {traceGather,compareGatherStrides,TRACE_PHASES,phaseExplanation} from "../playground/material-lab/instruction-microscope.mjs";
test("runtime stride changes input region footprint but never contiguous output footprint",()=>{
 const rows=compareGatherStrides();
 assert.deepEqual(rows.map(x=>x.sourceRegions),[4,16,32]);
 assert.deepEqual(rows.map(x=>x.sourceCoveredBytes),[128,512,1024]);
 assert.deepEqual(rows.map(x=>x.destinationRegions),[4,4,4]);
 assert.deepEqual(rows.map(x=>x.destinationCoveredBytes),[128,128,128]);
 assert.deepEqual(rows.map(x=>x.sourceRegionUtilization),[1,.25,.125]);
});
test("selected lane has exactly derived source index, byte range and destination offset",()=>{
 const t=traceGather(8,31);
 assert.equal(t.operands.index,248);
 assert.equal(t.operands.srcOffset,992);
 assert.equal(t.operands.srcRegion,31);
 assert.equal(t.operands.srcValue,248.25);
 assert.equal(t.operands.dstOffset,124);
 assert.equal(t.operands.dstRegion,3);
 assert.equal(t.loads.groups.find(x=>x.region===31).lanes[0],31);
 assert.equal(t.loads.groups.find(x=>x.region===31).bytesRequested,4);
 assert.equal(t.ncuCounters,null);
 assert.equal(t.instructionIdentity,"UNKNOWN_UNTIL_DISASSEMBLED");
});
test("stride1 has eight neighboring lanes per 32B region, stride4 has two, stride8 has one",()=>{
 for(const [stride,lanes] of [[1,8],[4,2],[8,1]]){
  const t=traceGather(stride,0);
  assert.ok(t.loads.groups.every(x=>x.lanes.length===lanes));
 }
});
test("seven probe stages have code and explicit evidence labels",()=>{
 assert.equal(TRACE_PHASES.length,7);
 for(const phase of TRACE_PHASES){
  const e=phaseExplanation(phase.id,traceGather(4,7));
  assert.equal(e.phaseId,phase.id);assert.equal(e.kind,"DERIVED");
  assert.ok(e.label.length&&e.detail.length);
 }
 assert.match(phaseExplanation("proof",traceGather(8)).detail,/Nsight/);
 assert.throws(()=>traceGather(2,1),RangeError);
 assert.throws(()=>traceGather(8,32),RangeError);
 assert.throws(()=>phaseExplanation("fake",traceGather(8)),RangeError);
});
