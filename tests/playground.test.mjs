import test from "node:test";
import assert from "node:assert/strict";
import { simulate, roofline } from "../playground/model.mjs";
test("compute-limited kitchen improves with more cooks", () => {
 const a=simulate({cooks:2,cookSeconds:8,ingredientRate:3,orders:100});
 const b=simulate({cooks:4,cookSeconds:8,ingredientRate:3,orders:100});
 assert.equal(a.bottleneck,"compute");
 assert.equal(b.throughput,2*a.throughput);
});
test("supply-limited kitchen cannot improve by hiring", () => {
 const a=simulate({cooks:16,cookSeconds:8,ingredientRate:1,orders:100});
 const b=simulate({cooks:64,cookSeconds:8,ingredientRate:1,orders:100});
 assert.equal(a.bottleneck,"supply");
 assert.equal(a.throughput,b.throughput);
 assert.equal(a.estimatedSeconds,100);
});
test("equal ceilings are balanced", () => {
 assert.equal(simulate({cooks:8,cookSeconds:8,ingredientRate:1,orders:100}).bottleneck,"balanced");
});
test("invalid input rejected", () => {
 assert.throws(()=>simulate({cooks:0,cookSeconds:8,ingredientRate:1,orders:100}),RangeError);
});
test("roofline tracks compute and memory regimes", () => {
 assert.deepEqual(roofline({arithmeticIntensity:1,peakCompute:100,peakBandwidth:10}),{attainable:10,ridgePoint:10,bound:"memory"});
 assert.equal(roofline({arithmeticIntensity:20,peakCompute:100,peakBandwidth:10}).bound,"compute");
});
