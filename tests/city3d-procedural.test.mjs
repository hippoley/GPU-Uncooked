import test from "node:test";
import assert from "node:assert/strict";
import {hash2,noise,fbm} from "../playground/city3d/procedural.mjs";
test("procedural city material seeds reproduce the same surface",()=>{
 const h=hash2(12,4,71);
 assert.equal(h,hash2(12,4,71));
 assert.notEqual(h,hash2(12,4,72));
 assert.ok(h>=0&&h<=1);
});
test("noise and fbm are smooth bounded fields",()=>{
 for(const p of [[0,0],[7.35,9.2],[-1.04,42.2],[100,300]]){
  const n=noise(...p,55),v=fbm(...p,55);
  assert.ok(n>=0&&n<=1);
  assert.ok(v>=0&&v<=1);
  assert.ok(Math.abs(noise(p[0],p[1],55)-noise(p[0]+.0001,p[1]+.0001,55))<.003);
 }
});
test("procedural noise does not require a server or GPU",()=>{
 assert.equal(typeof document,"undefined");
 assert.equal(typeof fbm(7,12,99),"number");
});
