import test from "node:test";
import assert from "node:assert/strict";
import {FULL_SOURCE_SASS,validateFullSourceSass,investigateFullSourceOpcode} from "../playground/material-lab/public-h100-sass-snapshot.mjs";
test("real full-source report-linked SASS remains third-party unverified",()=>{
 const x=validateFullSourceSass(FULL_SOURCE_SASS);
 assert.equal(x.hardwareAttested,false);
 assert.equal(x.sameBinaryVerified,false);
 assert.equal(x.causalSpeedupProven,false);
 assert.equal(x.variants[0].durationNs,60864);
 assert.equal(x.variants[1].durationNs,41184);
 assert.equal(x.variants[0].staticSassLines,1488);
 assert.equal(x.variants[1].staticSassLines,1440);
 assert.equal(x.variants[0].reportedInstructionExecutions,7640064);
 assert.equal(x.variants[1].reportedInstructionExecutions,6978048);
 assert.deepEqual(x.rows.find(r=>r.opcode==="QGMMA"),{opcode:"QGMMA",left:131072,right:131072});
 assert.deepEqual(x.rows.find(r=>r.opcode==="STS"),{opcode:"STS",left:1229824,right:181248});
 assert.deepEqual(x.rows.find(r=>r.opcode==="PRMT"),{opcode:"PRMT",left:17152,right:803584});
});
test("SASS comparisons cannot self-promote to attestation or causal proof",()=>{
 assert.throws(()=>validateFullSourceSass({...FULL_SOURCE_SASS,hardwareAttested:true}),/Cannot promote/);
 assert.throws(()=>validateFullSourceSass({...FULL_SOURCE_SASS,causalSpeedupProven:true}),/Cannot promote/);
 assert.throws(()=>validateFullSourceSass({...FULL_SOURCE_SASS,sameBinaryVerified:true}),/Cannot promote/);
});

test("opcode inspector computes evidence-backed deltas without inventing cycles",()=>{
 const sts=investigateFullSourceOpcode(FULL_SOURCE_SASS,"STS");
 const prmt=investigateFullSourceOpcode(FULL_SOURCE_SASS,"PRMT");
 const qgmma=investigateFullSourceOpcode(FULL_SOURCE_SASS,"QGMMA");
 assert.equal(sts.delta,-1048576);
 assert.equal(prmt.delta,786432);
 assert.equal(qgmma.delta,0);
 assert.equal(sts.classification,"THIRD_PARTY_UNVERIFIED");
 assert.equal(sts.cyclePositionKnown,false);
 assert.equal(sts.causalLinkProven,false);
 assert.equal(qgmma.leftFraction,1);
 assert.equal(qgmma.rightFraction,1);
 assert.equal(sts.leftFraction,1);
 assert.ok(sts.rightFraction<1);
 assert.match(prmt.claimLimit,/无法/);
 assert.match(sts.provenance,/45096310906/);
});
test("unsupported opcode or untrusted snapshot cannot become an investigation",()=>{
 assert.throws(()=>investigateFullSourceOpcode(FULL_SOURCE_SASS,"FAKE"),/Unsupported/);
 assert.throws(()=>investigateFullSourceOpcode({...FULL_SOURCE_SASS,hardwareAttested:true},"QGMMA"),/Cannot promote/);
});
