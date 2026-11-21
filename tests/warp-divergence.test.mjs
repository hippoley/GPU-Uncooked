import test from "node:test";
import assert from "node:assert/strict";
import {evaluate,preset,toggle,checkAnswer,WARP_SIZE} from "../playground/chapters/02-warp-divergence/model.mjs";
test("a uniform warp has one path without divergence",()=>{
 const s=evaluate(preset("uniform-a"));
 assert.equal(s.a,WARP_SIZE);assert.equal(s.b,0);assert.equal(s.activePaths,1);
 assert.equal(s.divergent,false);assert.equal(s.illustrativeLaneUtilization,1);
});
test("half split requires two nonempty paths in conceptual model",()=>{
 const s=evaluate(preset("half"));assert.equal(s.a,16);assert.equal(s.b,16);
 assert.equal(s.activePaths,2);assert.equal(s.illustrativeLaneUtilization,.5);
 assert.equal(s.maskA.filter(Boolean).length,16);
});
test("one lane creates divergent control flow",()=>{
 const s=evaluate(preset("one"));assert.equal(s.a,1);assert.equal(s.b,31);assert.equal(s.activePaths,2);
});
test("lane toggles work and leave original unchanged",()=>{
 const original=preset("uniform-a");
 const next=toggle(original,0);assert.equal(original[0],1);assert.equal(next[0],0);
 assert.equal(evaluate(next).divergent,true);
});
test("prediction validated against number of distinct nonempty paths",()=>{
 assert.equal(checkAnswer(preset("uniform-b"),1).correct,true);
 assert.equal(checkAnswer(preset("alternating"),1).correct,false);
 assert.equal(checkAnswer(preset("alternating"),2).correct,true);
});
test("bad masks and lane indices rejected",()=>{
 assert.throws(()=>evaluate([1,0]),RangeError);
 assert.throws(()=>evaluate(Array(32).fill(2)),RangeError);
 assert.throws(()=>toggle(preset("half"),32),RangeError);
});
