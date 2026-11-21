import test from "node:test";
import assert from "node:assert/strict";
import {DISTRICTS,stepPlayer,currentInteraction,clampPlayer,districtLink,BOUNDS} from "../playground/city/model.mjs";
test("six original districts, only existing activities link",()=>{
 assert.equal(DISTRICTS.length,6);
 assert.equal(new Set(DISTRICTS.map(d=>d.id)).size,6);
 assert.equal(DISTRICTS.filter(d=>districtLink(d)).length,3);
 assert.equal(DISTRICTS.find(d=>d.id==="marina").kind,"game");
});
test("diagonal movement is normalized",()=>{
 const p=stepPlayer({x:450,y:260},{up:true,right:true},.5,100);
 assert.ok(Math.abs(Math.hypot(p.x-450,p.y-260)-50)<.001);
});
test("clamp to streets and reject invalid positions",()=>{
 assert.deepEqual(clampPlayer({x:-1,y:900}),{x:BOUNDS.minX,y:BOUNDS.maxY});
 assert.throws(()=>clampPlayer({x:NaN,y:8}),RangeError);
 assert.throws(()=>stepPlayer({x:3,y:4},{},-1),RangeError);
});
test("proximity gating prevents teleport into a mission",()=>{
 const marina=DISTRICTS.find(d=>d.id==="marina");
 assert.equal(currentInteraction({x:marina.x,y:marina.y}).id,"marina");
 assert.equal(currentInteraction({x:400,y:400}),null);
});
test("planned districts have no playable href",()=>{
 assert.equal(districtLink(DISTRICTS.find(d=>d.id==="castle")),null);
});
