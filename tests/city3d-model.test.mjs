import test from "node:test";
import assert from "node:assert/strict";
import {START,DISTRICTS,normalizeMove,advance,nearestMission,missionLink} from "../playground/city3d/logic.mjs";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../playground/city3d/index.html",import.meta.url),"utf8");
test("six 3D districts preserve game and lab routes",()=>{
 assert.equal(DISTRICTS.length,6);
 assert.equal(new Set(DISTRICTS.map(x=>x.id)).size,6);
 assert.equal(DISTRICTS.filter(x=>missionLink(x)).length,3);
 assert.ok(DISTRICTS.some(x=>x.kind==="game"));
});
test("third-person movement normalizes diagonal velocity",()=>{
 const p=advance(START,{forward:1,right:1},.2,10);
 assert.ok(Math.abs(Math.hypot(p.x-START.x,p.z-START.z)-2)<.00001);
});
test("movement remains inside world bounds",()=>{
 const p=advance({x:54,z:-54},{forward:1,right:1},1,100);
 assert.ok(p.x<=54&&p.z>=-54);
 assert.throws(()=>advance(START,{forward:1},-1),RangeError);
});
test("mission links require physical proximity",()=>{
 assert.equal(nearestMission(START),null);
 for(const d of DISTRICTS)assert.equal(nearestMission({x:d.x,z:d.z})?.id,d.id);
 assert.equal(missionLink(DISTRICTS.find(x=>x.kind==="planned")),null);
});
test("3D entry has Three.js import and accessible error fallback",()=>{
 assert.match(html,/three@0\.170\.0\/build\/three\.module\.js/);
 assert.match(html,/id="loading"/);
 assert.match(html,/id="viewport"/);
 assert.match(html,/id="dialog"/);
});
