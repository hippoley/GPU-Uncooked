import test from "node:test";
import assert from "node:assert/strict";
import {pulseTargets,pulseReady} from "../playground/arcade/pulse.mjs";
test("pulse only collects nearby uncollected data",()=>{
 const items=[{x:0,y:0,index:0,got:false},{x:8,y:0,index:1,got:true},{x:1000,y:0,index:2,got:false}];
 assert.deepEqual(pulseTargets(items,0,0,40),[0]);
});
test("pulse caps batch at eight nearest indices",()=>{
 const items=Array.from({length:14},(_,index)=>({x:index*3,y:0,index,got:false}));
 assert.deepEqual(pulseTargets(items,0,0,110,8),[0,1,2,3,4,5,6,7]);
});
test("pulse tie breaks deterministically",()=>{
 const items=[{x:1,y:0,index:2},{x:-1,y:0,index:1}];
 assert.deepEqual(pulseTargets(items,0,0,10),[1,2]);
});
test("cooldown boundary",()=>{
 assert.equal(pulseReady(8,2,6),true);assert.equal(pulseReady(7.99,2,6),false);
});
test("invalid pulse config is rejected",()=>{
 assert.throws(()=>pulseTargets([],0,0,0),RangeError);
 assert.throws(()=>pulseReady(1,Infinity),RangeError);
});
