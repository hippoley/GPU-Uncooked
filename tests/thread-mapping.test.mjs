import test from "node:test";
import assert from "node:assert/strict";
import {layout,threadAt,checkPrediction} from "../playground/chapters/01-thread-mapping/model.mjs";
test("ceil-div launch covers all elements and guards leftovers",()=>{
 const l=layout(50,16);
 assert.equal(l.blocks,4);assert.equal(l.launched,64);assert.equal(l.active,50);assert.equal(l.guarded,14);
 assert.equal(l.threads[50].valid,false);assert.equal(l.threads[49].valid,true);
});
test("map thread to global index",()=>{
 assert.deepEqual(threadAt(2,3,16,50),{i:35,valid:true});
 assert.deepEqual(threadAt(3,3,16,50),{i:51,valid:false});
});
test("prediction checks exact block count",()=>{
 assert.equal(checkPrediction(4,50,16).correct,true);
 assert.equal(checkPrediction(3,50,16).correct,false);
});
test("invalid launches rejected",()=>{
 assert.throws(()=>layout(0,32),RangeError);
 assert.throws(()=>layout(20,0),RangeError);
 assert.throws(()=>threadAt(0,32,32,100),RangeError);
});
