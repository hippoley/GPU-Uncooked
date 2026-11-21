import test from "node:test";
import assert from "node:assert/strict";
import {filmicRecipe} from "../playground/city3d/filmic.mjs";
test("cinematic skyline is seeded, deterministic, layered and bounded",()=>{
 const a=filmicRecipe(79,"medium");
 assert.deepEqual(a,filmicRecipe(79,"medium"));
 assert.notDeepEqual(a,filmicRecipe(80,"medium"));
 assert.equal(a.depth,2);
 assert.equal(a.skyline.length,52);
 assert.ok(a.skyline.every(b=>b.h>=13&&b.h<=51&&b.z< -100));
});
test("quality tiers reduce distant geometry, particle and light cost",()=>{
 const low=filmicRecipe(79,"low"),mid=filmicRecipe(79,"medium"),high=filmicRecipe(79,"high");
 assert.equal(low.skyline.length,26);
 assert.equal(high.skyline.length,78);
 assert.ok(low.lightCount<mid.lightCount&&mid.lightCount<high.lightCount);
 assert.throws(()=>filmicRecipe(71,"cinema-unlimited"),RangeError);
 assert.throws(()=>filmicRecipe(NaN),RangeError);
});
