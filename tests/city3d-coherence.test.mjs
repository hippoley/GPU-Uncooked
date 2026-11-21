import test from "node:test";
import assert from "node:assert/strict";
import {facadePlan,FACADE_UNITS,SCENE_SEED} from "../playground/city3d/coherence.mjs";
test("six stable buildings produce real windows consistent across camera viewpoints",()=>{
 const a=facadePlan(),b=facadePlan();
 assert.deepEqual(a,b);
 assert.equal(a.seed,SCENE_SEED);
 assert.equal(a.buildings.length,6);
 assert.equal(new Set(a.buildings.map(x=>x.id)).size,6);
 assert.ok(a.windowCount>=40);
 for(const building of a.buildings){
  assert.equal(building.windows.length>0,true);
  assert.equal(building.front,building.z+(building.z<0?building.d/2:-building.d/2));
  assert.ok(building.windows.every(w=>w.y>=8&&w.y<building.h));
  assert.ok(building.windows.every(w=>w.x>=building.x-building.w/2&&w.x<=building.x+building.w/2));
 }
});
test("quality tiers change model density but not building identity or spatial anchors",()=>{
 const low=facadePlan(731,"low"),medium=facadePlan(731,"medium"),high=facadePlan(731,"high");
 assert.ok(low.windowCount<=medium.windowCount&&medium.windowCount<=high.windowCount);
 for(let i=0;i<FACADE_UNITS.length;i++){
  assert.equal(low.buildings[i].x,high.buildings[i].x);
  assert.equal(low.buildings[i].front,high.buildings[i].front);
 }
 assert.throws(()=>facadePlan(1,"extreme"),RangeError);
 assert.throws(()=>facadePlan(NaN),RangeError);
});
