import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";
const report=JSON.parse(readFileSync("dist/material-lab/build-report.json","utf8"));
assert.equal(report.underLimit,true);
assert.equal(report.completeThreeJs,true);
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],external=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8765/")&&!r.url().startsWith("data:"))external.push(r.url())});
await page.goto("http://127.0.0.1:8765/dist/material-lab/index.html",{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>document.documentElement.dataset.materialReady==="true",null,{timeout:45000});
assert.equal(await page.locator("#loading").isHidden(),true);
assert.equal(await page.locator("#lane-list button").count(),32);
assert.equal(await page.locator("#sectors").innerText(),"16");
assert.equal(await page.locator("#bytes").innerText(),"512B");
const render=await page.evaluate(()=>window.__MATERIAL_LAB.getRenderer());
assert.ok(render.drawCalls>0&&render.triangles>0,"Must render actual 3D structures");
await page.screenshot({path:"dist/material-lab/industrial-overview.png"});
await page.locator("[data-stride='1']").click();
assert.equal(await page.locator("#sectors").innerText(),"4");
assert.equal(await page.locator("#bytes").innerText(),"128B");
await page.locator("[data-stride='8']").click();
assert.equal(await page.locator("#sectors").innerText(),"32");
assert.equal(await page.locator("#account-coverage").innerText(),"32 × 32 B");
assert.equal(await page.locator("#account-load").innerText(),"128 B");
assert.match(await page.locator("#account-missing").innerText(),/DRAM bytes: UNKNOWN/);
assert.equal(await page.locator("html").getAttribute("data-material-profiler-kind"),"UNKNOWN");

assert.equal(await page.locator("#micro-matrix tbody tr").count(),3);
assert.match(await page.locator("#micro-matrix tbody").innerText(),/1024B/);
await page.locator('[data-micro-phase="index"]').click();
assert.match(await page.locator("#micro-detail").innerText(),/stride/);
await page.locator('[data-micro-phase="store"]').click();
assert.match(await page.locator("#micro-value").innerText(),/4 × 32B/);
await page.locator('[data-micro-phase="proof"]').click();
assert.match(await page.locator("#micro-value").innerText(),/NOT VERIFIED/);

await page.locator("[data-lane='31']").click();
assert.match(await page.locator("#address-detail").innerText(),/src\[248\]/);
assert.equal(await page.locator("html").getAttribute("data-material-selected-address"),"248");
await page.locator("[data-step='memory']").click();
const inspection=await page.evaluate(()=>window.__MATERIAL_LAB.getCamera());
assert.equal(inspection.focusX,8,"Memory mode must actually move the 3D camera focus onto real cells");

assert.equal(await page.locator("html").getAttribute("data-material-step"),"memory");
await page.screenshot({path:"dist/material-lab/industrial-memory.png"});
const data=await page.evaluate(()=>window.__MATERIAL_LAB.getModel());
assert.equal(data.output[31],248.25);
assert.equal(data.addresses[31],992);
// Browser receipt import: fixture transcripts must never upgrade to measured GPU data.
const fixture={
 schema:"gpu-uncooked.receipt-view.v1",classification:"UNATTESTED_RAW_CAPTURE",
 integrity_checked_locally:true,hardware_attested:false,measured_gpu_metrics:null,
 device:{uuid:"GPU-fixture-0001",name:"TEST FIXTURE ONLY"},
 git_commit:"a".repeat(40),source_sha256:"b".repeat(64),
 source:{text:"__global__ void gather() {}",sha256:"c".repeat(64),truncated:false},
 ptx:{text:".entry gather()",sha256:"d".repeat(64),truncated:false},
 sass:{text:"Function : _Z6gatherPKfPfi\n /*0000*/ MOV R1, c[0x0][0x28] ;\n /*0010*/ LDG.E R4, [R2] ;\n /*0020*/ STG.E [R6], R4 ;\n /*0030*/ EXIT ;",sha256:"e".repeat(64),truncated:false},
 runs:[1,4,8].map(stride=>({stride,exit_code:0,stdout:"PASS fixture"}))
};
await page.locator("#receipt-file").setInputFiles({
 name:"receipt-view.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(fixture))
});
await page.waitForFunction(()=>document.querySelector("#receipt-info")?.textContent?.includes("UNATTESTED (NOT MEASURED)"),null,{timeout:10000});
assert.match(await page.locator("#receipt-info").innerText(),/UNATTESTED \(NOT MEASURED\)/);
assert.match(await page.locator("#sass-static-summary").innerText(),/4 SASS instruction rows/);
assert.match(await page.locator("#sass-static-breakdown").innerText(),/Runtime instruction executions: UNKNOWN/);
await page.locator('[data-receipt-tab="ptx"]').click();
assert.match(await page.locator("#receipt-text").innerText(),/\.entry gather/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
fixture.hardware_attested=true;
await page.locator("#receipt-file").setInputFiles({
 name:"forged-receipt.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(fixture))
});
await page.waitForFunction(()=>document.querySelector("#receipt-info")?.textContent?.startsWith("REJECTED"),null,{timeout:10000});
assert.match(await page.locator("#receipt-info").innerText(),/REJECTED/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
// Imported profiler comparison must remain unauthenticated, even with plausible data.
const ncuMetrics=["l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum",
 "dram__bytes_read.sum","dram__bytes_write.sum"];
const ncuComparison={schema:"gpu-uncooked.ncu-comparison.v1",
 classification:"REPORTED_UNVERIFIED",hardware_attested:false,origin_bytes_rechecked:true,
 binary_sha256:"a".repeat(64),source_manifest_sha256:"b".repeat(64),
 series_manifest_sha256:"c".repeat(64),device_uuid_claim:"GPU-TEST-FIXTURE",
 rows:[1,4,8].map((stride,i)=>({
  stride,expected_source_32b_regions:[4,16,32][i],
  source_region_bytes_span:[128,512,1024][i],kernel:"gather",
  profile_transcript_sha256:"d".repeat(64),
  claimed_profiler_metrics:Object.fromEntries(ncuMetrics.map((m,j)=>[m,100*(i+1)+j]))
 }))};
await page.locator("#ncu-comparison-file").setInputFiles({
 name:"comparison-fixture.json",mimeType:"application/json",
 buffer:Buffer.from(JSON.stringify(ncuComparison))
});
await page.waitForFunction(()=>document.querySelector("#ncu-comparison-status")?.textContent?.startsWith("REPORTED_UNVERIFIED"));
assert.match(await page.locator("#ncu-comparison-table tbody").innerText(),/1024|32/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
ncuComparison.hardware_attested=true;
await page.locator("#ncu-comparison-file").setInputFiles({
 name:"comparison-forged.json",mimeType:"application/json",
 buffer:Buffer.from(JSON.stringify(ncuComparison))
});
await page.waitForFunction(()=>document.querySelector("#ncu-comparison-status")?.textContent?.startsWith("REJECTED"));
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
// Public report intake is separate from the original gather profiler series.
function publicFixture(id,value){
 return {schema:"gpu-uncooked.public-ncu-report.v1",report_id:id,
  classification:"THIRD_PARTY_UNVERIFIED",status:"PARSED_UNVERIFIED",
  hardware_attested:false,binary_identity_bound_to_our_gather:false,
  reproduces_our_stride_experiment:false,
  source_repo:"smartxiaohuolong/triton-tle-attention-optimization-demo",
  source_revision:"53fcfbf0c11430ca9db23f8d90c4ec71b686efc8",
  source_sha256:"a".repeat(64),ncu_stdout_sha256:"b".repeat(64),
  source_device_claim:"H100 third-party author claim",
  metrics:[{launch_id:"1",kernel:"attention_kernel",metric:"dram__bytes_read.sum",unit:"byte",raw_value:value}]};
}
await page.locator("#public-ncu-left").setInputFiles({
 name:"left-public.json",mimeType:"application/json",
 buffer:Buffer.from(JSON.stringify(publicFixture("rswgmma_uniform4096","4096")))
});
await page.locator("#public-ncu-right").setInputFiles({
 name:"right-public.json",mimeType:"application/json",
 buffer:Buffer.from(JSON.stringify(publicFixture("memdesc_transpose_uniform4096","2048")))
});
await page.waitForFunction(()=>document.querySelector("#public-ncu-status")?.textContent?.includes("1 unique shared metrics"));
assert.match(await page.locator("#public-ncu-table").innerText(),/dram__bytes_read/);
assert.match(await page.locator("#public-ncu-status").innerText(),/THIRD_PARTY_UNVERIFIED/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
const forgedPublic=publicFixture("memdesc_transpose_uniform4096","2048");
forgedPublic.hardware_attested=true;
await page.locator("#public-ncu-right").setInputFiles({
 name:"forged-public.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(forgedPublic))
});
await page.waitForFunction(()=>document.querySelector("#public-ncu-status")?.textContent?.startsWith("REJECTED"));
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
assert.deepEqual(errors,[],"No uncaught browser failures");
assert.deepEqual(external,[],"No external runtime requests");
console.log(JSON.stringify({status:"PASS",threeJsInline:true,drawCalls:render.drawCalls,
 triangles:render.triangles,byteBudgetBrotli:report.brotliBytes,
 verifiedLane31Index:248,verifiedLane31ByteAddress:992,uncaughtErrors:0,externalRequests:0},null,2));
await browser.close();
