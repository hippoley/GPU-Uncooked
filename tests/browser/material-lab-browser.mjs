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
 sass:{text:"FAKE FIXTURE SASS",sha256:"e".repeat(64),truncated:false},
 runs:[1,4,8].map(stride=>({stride,exit_code:0,stdout:"PASS fixture"}))
};
await page.locator("#receipt-file").setInputFiles({
 name:"receipt-view.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(fixture))
});
assert.match(await page.locator("#receipt-info").innerText(),/UNATTESTED \(NOT MEASURED\)/);
await page.locator('[data-receipt-tab="ptx"]').click();
assert.match(await page.locator("#receipt-text").innerText(),/\.entry gather/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
fixture.hardware_attested=true;
await page.locator("#receipt-file").setInputFiles({
 name:"forged-receipt.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(fixture))
});
assert.match(await page.locator("#receipt-info").innerText(),/REJECTED/);
assert.equal(await page.locator("html").getAttribute("data-material-gpu-measured"),"false");
assert.deepEqual(errors,[],"No uncaught browser failures");
assert.deepEqual(external,[],"No external runtime requests");
console.log(JSON.stringify({status:"PASS",threeJsInline:true,drawCalls:render.drawCalls,
 triangles:render.triangles,byteBudgetBrotli:report.brotliBytes,
 verifiedLane31Index:248,verifiedLane31ByteAddress:992,uncaughtErrors:0,externalRequests:0},null,2));
await browser.close();
