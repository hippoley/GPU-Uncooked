import test from "node:test";
import assert from "node:assert/strict";
import {LANES,TOTAL,stripedManifest,contiguousManifest,seededManifest,manifestFootprint,swapRequests,regroupManifest,evaluateDispatch,validateManifest,sectorOf} from "../playground/freight/physics.mjs";
test("32 lane groups faithfully count unique 32-byte sectors",()=>{
 const striped=manifestFootprint(stripedManifest());
 const packed=manifestFootprint(contiguousManifest());
 assert.equal(striped.waves.length,4);
 assert.equal(striped.sectors,64);
 assert.equal(packed.sectors,16);
 assert.equal(packed.requestedBytes,512);
 assert.equal(packed.efficiency,1);
 assert.equal(striped.efficiency,.25);
 assert.equal(sectorOf(7),0);assert.equal(sectorOf(8),1);
});
test("cargo swaps cannot create or destroy requests",()=>{
 const m=stripedManifest(),other=swapRequests(m,0,39);
 assert.equal(m[0],0);assert.equal(other[0],m[39]);
 assert.equal(new Set(other).size,TOTAL);
 assert.deepEqual(regroupManifest(other),contiguousManifest());
});
test("repacking allows meaningful winning choices and scoring",()=>{
 const bad=evaluateDispatch(stripedManifest());
 const good=evaluateDispatch(regroupManifest(stripedManifest()),{sortActions:1});
 assert.equal(bad.withinBudget,false);assert.equal(bad.credits,0);
 assert.equal(good.withinBudget,true);assert.equal(good.rank,"SILICON ACE");
 assert.equal(good.credits,180);
});
test("seeded tasks replay deterministically and remain solvable",()=>{
 const a=seededManifest(241),b=seededManifest(241);
 assert.deepEqual(a,b);assert.notDeepEqual(a,seededManifest(242));
 assert.equal(new Set(a).size,TOTAL);
 assert.equal(manifestFootprint(regroupManifest(a)).sectors,16);
});
test("invalid manifests rejected",()=>{
 assert.throws(()=>validateManifest([1,2]),RangeError);
 assert.throws(()=>validateManifest(new Array(TOTAL).fill(1)),RangeError);
 assert.throws(()=>swapRequests(stripedManifest(),-1,2),RangeError);
 assert.throws(()=>evaluateDispatch(stripedManifest(),{budget:-3}),RangeError);
});
