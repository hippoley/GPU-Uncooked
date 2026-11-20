import test from "node:test";
import assert from "node:assert/strict";
import {analyze,grade} from "../playground/chapters/03-memory-coalescing/model.mjs";
test("aligned contiguous 32 float loads touch four 32-byte sectors",()=>{
 const a=analyze({stride:1,offset:0});assert.equal(a.uniqueSectors,4);assert.equal(a.usefulFraction,1);assert.equal(a.footprintBytes,128);
});
test("one float offset touches five sectors",()=>{
 const a=analyze({stride:1,offset:1});assert.equal(a.uniqueSectors,5);assert.equal(a.usefulFraction,.8);
});
test("stride two touches eight sectors",()=>assert.equal(analyze({stride:2}).uniqueSectors,8));
test("stride eight touches 32 sectors",()=>assert.equal(analyze({stride:8}).uniqueSectors,32));
test("stride 16 also touches 32 not 64 sectors",()=>assert.equal(analyze({stride:16}).uniqueSectors,32));
test("grade does not confuse a sector count with latency",()=>{
 assert.deepEqual(grade(5,{stride:1,offset:1}),{correct:true,answer:5});
 assert.equal(grade(4,{stride:1,offset:1}).correct,false);
});
test("parameter validation",()=>{
 assert.throws(()=>analyze({stride:0}),RangeError);
 assert.throws(()=>analyze({stride:1.5}),RangeError);
 assert.throws(()=>analyze({offset:-1}),RangeError);
 assert.throws(()=>analyze({elementBytes:8}),RangeError);
});
