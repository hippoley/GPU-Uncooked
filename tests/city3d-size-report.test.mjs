import test from "node:test";
import assert from "node:assert/strict";
import {budgetReport} from "../playground/city3d/size-report.mjs";
test("measure first-party Brotli bytes without pretending that CDN Three.js is included",()=>{
 const r=budgetReport();
 assert.ok(r.sourceFiles>=7);
 assert.ok(r.firstPartyRawBytes>r.firstPartyBrotliBytes);
 assert.ok(r.firstPartyGzipBytes>0);
 assert.ok(r.externalRuntime.urls.some(u=>u.includes("three@0.170.0")));
 assert.equal(r.completeInitialDownloadBytes,null);
 assert.equal(r.meetsCompleteTarget,null);
 assert.equal(r.externalRuntime.verified,false);
 assert.ok(r.firstPartyBrotliBytes<1_400_000,"First party code alone must fit budget");
});
