import test from "node:test";
import assert from "node:assert/strict";
import {cornerRecipe,QUALITY_LEVELS,CORNER_VERSION} from "../playground/city3d/corner.mjs";
test("corner grammar builds deterministic independent street-level scene",()=>{
 const a=cornerRecipe(2309,"medium"),b=cornerRecipe(2309,"medium");
 assert.deepEqual(a,b);
 assert.equal(a.props.length,22);
 assert.equal(a.panelCount,8);
 assert.notDeepEqual(a,cornerRecipe(2308,"medium"));
 assert.match(CORNER_VERSION,/^1\./);
});
test("quality tiers bound close-up object density and do not change seed identity",()=>{
 const low=cornerRecipe(2309,"low"),medium=cornerRecipe(2309,"medium"),high=cornerRecipe(2309,"high");
 assert.equal(low.props.length,10);
 assert.ok(low.props.length<medium.props.length&&medium.props.length<high.props.length);
 assert.equal(low.glass,false);assert.equal(high.glass,true);
 assert.equal(Object.keys(QUALITY_LEVELS).length,3);
});
test("street grammar keeps set dressing outside center roadway",()=>{
 for(const q of Object.keys(QUALITY_LEVELS)){
  const plan=cornerRecipe(2309,q);
  for(const prop of plan.props){
   assert.ok(Math.abs(prop.x)>=17.8,"decor must remain off central driving lanes");
   assert.ok(prop.z>-22&&prop.z<35);
  }
 }
 assert.throws(()=>cornerRecipe(22,"ultra"),RangeError);
 assert.throws(()=>cornerRecipe(NaN,"medium"),RangeError);
});
