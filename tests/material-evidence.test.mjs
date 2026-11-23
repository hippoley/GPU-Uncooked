import test from "node:test";
import assert from "node:assert/strict";
import {buildDerivedEvidence,describeWorldObject,classifyExternalClaim,measurementState} from "../playground/material-lab/evidence.mjs";

test("stride prediction matches known aligned 32-byte regions",()=>{
 for(const [stride,count] of [[1,4],[4,16],[8,32]]){
  const e=buildDerivedEvidence(stride,31);
  assert.equal(e.kind,"DERIVED");
  assert.equal(e.predicted.unique32ByteRegions,count);
  assert.equal(e.address.elementIndex,31*stride);
  assert.equal(e.address.byteOffset,31*stride*4);
  assert.equal(e.address.expectedValue,31*stride+.25);
  assert.equal(e.measured,null);
  assert.equal(e.receiptId,null);
  assert.equal(e.address.baseAddressKnown,false);
 }
});
test("logical path explicitly disclaims hardware route",()=>{
 const r=describeWorldObject("address-edge",buildDerivedEvidence(8,31));
 assert.equal(r.kind,"DERIVED");
 assert.match(r.claim,/NOT an observed physical route/);
 assert.equal(r.receiptId,null);
});
test("physical substrate has no physical layout provenance",()=>{
 const r=describeWorldObject("physical-substrate",buildDerivedEvidence(8,31));
 assert.equal(r.kind,"ILLUSTRATIVE");
 assert.match(r.claim,/NOT GH100 die coordinates/);
});
test("reject invalid indices, classifications and fake profiler receipts",()=>{
 assert.throws(()=>buildDerivedEvidence(3),RangeError);
 assert.throws(()=>buildDerivedEvidence(8,32),RangeError);
 assert.throws(()=>describeWorldObject("HBM-read",buildDerivedEvidence(8)),RangeError);
 assert.throws(()=>classifyExternalClaim({kind:"MEASURED",receiptId:"fake",gpuUuid:"GPU-fake",metrics:{dram_reads:32}}),/UNVERIFIED_MEASUREMENT/);
 assert.throws(()=>classifyExternalClaim({kind:"DERIVED",predicted:{unique32ByteRegions:0}}),/UNVERIFIED_DERIVATION/);
});
test("no GPU measured status until verified evidence adapter exists",()=>{
 assert.equal(measurementState().status,"NOT_MEASURED");
 assert.equal(measurementState().sass,null);
 assert.equal(measurementState().nsightCompute,null);
});
