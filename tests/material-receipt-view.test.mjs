import test from "node:test";
import assert from "node:assert/strict";
import {parseReceiptView} from "../playground/material-lab/receipt-view.mjs";
const h="a".repeat(64),ref={text:"PTX / SASS",sha256:h,truncated:false};
const base=()=>({
 schema:"gpu-uncooked.receipt-view.v1",classification:"UNATTESTED_RAW_CAPTURE",
 integrity_checked_locally:true,hardware_attested:false,measured_gpu_metrics:null,
 device:{uuid:"GPU-12345678",name:"Example GPU"},
 git_commit:"b".repeat(40),source_sha256:h,
 source:{...ref},ptx:{...ref},sass:{...ref},
 runs:[1,4,8].map(stride=>({stride,exit_code:0,stdout:"PASS"}))
});
test("imported receipt never becomes hardware attestation",()=>{
 const receipt=parseReceiptView(base());
 assert.equal(receipt.classification,"UNATTESTED_RAW_CAPTURE");
 assert.equal(receipt.hardwareAttested,false);
 assert.equal(receipt.runs.length,3);
});
test("reject forged MEASURED and wrong metric attribution",()=>{
 const a=base();a.classification="MEASURED";
 assert.throws(()=>parseReceiptView(a),/cannot claim/);
 const b=base();b.hardware_attested=true;
 assert.throws(()=>parseReceiptView(b),/cannot claim/);
 const c=base();c.measured_gpu_metrics={dram_reads:32};
 assert.throws(()=>parseReceiptView(c),/cannot claim/);
});
test("reject missing experiment and malformed instructions",()=>{
 const a=base();a.runs.pop();
 assert.throws(()=>parseReceiptView(a),/transcripts/);
 const b=base();b.sass.text=2;
 assert.throws(()=>parseReceiptView(b),/Malformed sass/);
});
