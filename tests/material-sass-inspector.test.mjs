import test from "node:test";
import assert from "node:assert/strict";
import {inspectSassListing} from "../playground/material-lab/sass-inspector.mjs";
// These are purpose-built syntax fixtures, not actual NVIDIA GPU disassembly.
const fixture=`Fatbin elf code:
Function : _Z6gatherPKfPfi
.headerflags @"EF_CUDA_SM90"
        /*0000*/                   MOV R1, c[0x0][0x28] ; /* 0x000000000001 */
        /*0010*/                   S2R R0, SR_TID.X ; /* 0x000000000002 */
        /*0020*/                   IMAD R2, R0, R4, RZ ; /* 0x000000000003 */
        /*0030*/               @P0 LDG.E.STRONG.SM R4, [R2] ; /* 0x000000000004 */
        /*0040*/                   STG.E [R6], R4 ; /* 0x000000000005 */
        /*0050*/                   EXIT ; /* 0x000000000006 */
Function : _Z5otherv
        /*0000*/                   FFMA R1, R2, R3, R4 ; /* 0x000000000007 */
`;
test("selects gather function, ignores other functions and encoding comments",()=>{
 const r=inspectSassListing(fixture);
 assert.equal(r.staticInstructionCount,6);
 assert.equal(r.byCategory.load,1);
 assert.equal(r.byCategory.store,1);
 assert.equal(r.byCategory.integerAddressLogic,1);
 assert.equal(r.byCategory.control,1);
 assert.equal(r.byOpcode.IMAD,1);
 assert.equal(r.byOpcode.S2R,1);
 assert.equal(r.targetFunction,"_Z6gatherPKfPfi");
 assert.equal(r.runtimeWarpIssues,null);
 assert.equal(r.runtimeInstructionExecutions,null);
 assert.equal(r.hardwareAttested,false);
 assert.equal(r.listingType,"STATIC_DISASSEMBLY");
});
test("cannot mistake static instructions for measured dynamic execution",()=>{
 const r=inspectSassListing(fixture);
 assert.equal(r.kind,"REPORTED_UNVERIFIED");
 assert.equal(r.cycles,null);
 assert.equal(r.registersPerThread,null);
 assert.ok(r.caveat.includes("Do NOT"));
 assert.throws(()=>inspectSassListing(fixture,{functionFilter:"missing"}),/missing or ambiguous/);
});
test("fail closed when multiple target functions or duplicate offsets are present",()=>{
 assert.throws(()=>inspectSassListing(fixture+fixture),/ambiguous/);
 const duplicate=fixture.replace("/*0050*/","/*0040*/");
 assert.throws(()=>inspectSassListing(duplicate),/Duplicate SASS/);
 assert.throws(()=>inspectSassListing("invented counts"),/missing or ambiguous/);
});
