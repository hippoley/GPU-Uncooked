import test from "node:test";
import assert from "node:assert/strict";
import {footprint,expeditionReward} from "../playground/arcade/mission.mjs";
test("eight contiguous float indexes occupy one sector",()=>{
 const f=footprint([0,1,2,3,4,5,6,7]);assert.equal(f.count,1);assert.equal(f.coverage,1);
});
test("eight stride eight float indexes occupy eight sectors",()=>{
 const f=footprint([0,8,16,24,32,40,48,56]);assert.equal(f.count,8);assert.equal(f.coverage,.125);
});
test("scattered collects are not assumed to be contiguous",()=>{
 assert.equal(footprint([0,1,10,11,20,21,40,41]).count,4);
});
test("rewards locality for equal completed packet count",()=>{
 const a=expeditionReward([0,1,2,3,4,5,6,7],40,true);
 const b=expeditionReward([0,8,16,24,32,40,48,56],40,true);
 assert.ok(a.reward>b.reward);assert.equal(a.localityBonus,90);assert.equal(b.localityBonus,11);
});
test("failed extraction does not receive a locality bonus",()=>{
 assert.equal(expeditionReward([0,1,2],0,false).localityBonus,0);
});
test("empty inputs do not divide by zero",()=>assert.deepEqual(footprint([]).coverage,0));
test("invalid addresses rejected",()=>assert.throws(()=>footprint([-1]),RangeError));
