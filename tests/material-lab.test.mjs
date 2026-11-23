import test from "node:test";
import assert from "node:assert/strict";
import {kernelGather,createInput,sourceForStride,transition,initialSnapshot,replay} from "../playground/material-lab/physics.mjs";
test("32 exact thread addresses, data values and 32B sectors are derived from same kernel expression",()=>{
 const expected=new Map([[1,4],[4,16],[8,32]]);
 for(const [stride,sectors] of expected){
  const result=kernelGather({stride});
  assert.equal(result.lanes.length,32);
  assert.equal(result.sectorCount,sectors);
  assert.equal(result.requestedBytes,128);
  assert.equal(result.coveredBytes,sectors*32);
  assert.deepEqual(result.lanes.map(l=>l.byteAddress),Array.from({length:32},(_,lane)=>lane*stride*4));
  assert.deepEqual(result.result,Array.from({length:32},(_,lane)=>lane*stride+.25));
  assert.ok(sourceForStride(stride).includes("gather<<<1, 32>>>(d_src, d_dst, "+stride+")"));
 }
});
test("clicking a thread changes selected real memory index, never simulated GPU timing",()=>{
 let state=initialSnapshot();
 state=transition(state,{type:"STRIDE",value:8});
 state=transition(state,{type:"SELECT_LANE",value:31});
 const request=kernelGather({stride:state.stride}).lanes[state.selectedLane];
 assert.deepEqual([request.index,request.byteAddress,request.sector,request.value],[248,992,31,248.25]);
 assert.deepEqual(replay([{type:"STRIDE",value:8},{type:"SELECT_LANE",value:31}]),state);
});
test("invalid actions, missing data and fake state are rejected",()=>{
 assert.throws(()=>kernelGather({stride:3}),RangeError);
 assert.throws(()=>kernelGather({stride:1,input:[1]}),RangeError);
 assert.throws(()=>transition(initialSnapshot(),{type:"SELECT_LANE",value:32}),RangeError);
 assert.throws(()=>transition(initialSnapshot(),{type:"FAKE_GPU_TIME",value:2}),RangeError);
});
