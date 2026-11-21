import assert from "node:assert/strict";
import {chromium} from "playwright";
import {readFileSync} from "node:fs";
const base="http://127.0.0.1:8765";
const report=JSON.parse(readFileSync("dist/city3d/build-report.json","utf8"));
assert.equal(report.includesThreeJs,true);
assert.equal(report.externalRuntimeAssets,0);
assert.equal(report.underLimit,true,"The actual bundled entry must be <=1.4MB Brotli");
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1365,height:768},deviceScaleFactor:1});
const external=[];
page.on("request",r=>{if(!r.url().startsWith(base)&&!r.url().startsWith("data:"))external.push(r.url())});
page.on("pageerror",e=>{console.error("Browser page error:",e.message)});
await page.goto(base+"/dist/city3d/index.html?shot=corner&quality=medium",{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>["true","false"].includes(document.documentElement.dataset.city3dReady),null,{timeout:45000});
assert.equal(await page.locator("html").getAttribute("data-city3d-ready"),"true","Bundled WebGL must actually initialize");
assert.equal(await page.locator("#loading").isHidden(),true);
const metrics=await page.evaluate(()=>window.__CITY3D_DIAGNOSTICS);
assert.ok(metrics.drawCalls>0&&metrics.triangles>0,"Actual 3D geometry must have been rendered");
assert.ok(metrics.cornerProps>=20,"Bundled storefront grammar must be present");
assert.ok(metrics.cornerBatchCalls>=3,"Scene must batch repeated detail");
assert.ok(metrics.facadeWindows>=40,"Rendered architecture must include 3D depth-bearing windows");
assert.ok(metrics.facadeInstancedBatches>=20,"Repeated frames and glazing must be batched");
assert.ok(metrics.facadeGeometryPieces>30,"Parallax details must use actual geometry");
assert.ok(metrics.filmicDistantBuildings>=26,"Night city must contain layered distant geometry");
assert.ok(metrics.filmicInstanceBatches>=5,"Cinematic detail must use instanced geometry");
assert.ok(metrics.filmicLocalizedLights>=3&&metrics.filmicLocalizedLights<=8,"Quality tier must bound local lights");
assert.ok(metrics.drawCalls<500,"Avoid runaway draw calls for the six-building streetscape");
assert.deepEqual(external,[],"No runtime CDN, textures or geometry downloads allowed");
await page.locator("#start").click();
await page.screenshot({path:"dist/city3d/standalone-desktop.png"});
// View-consistency is tested as two distinct real camera poses of one unchanged 3D scene.
await page.locator("#viewmode").click();
assert.match(await page.locator("#viewmode").innerText(),/第一人称/);
await page.waitForTimeout(250);
await page.screenshot({path:"dist/city3d/standalone-first-person.png"});
const sameScene=await page.evaluate(()=>({
 facades:window.__CITY3D_DIAGNOSTICS.facadeWindows,
 batches:window.__CITY3D_DIAGNOSTICS.facadeInstancedBatches,
 quality:document.documentElement.dataset.sceneQuality
}));
assert.equal(sameScene.facades,metrics.facadeWindows,"Geometry must persist across camera mode");
assert.equal(sameScene.batches,metrics.facadeInstancedBatches,"Batched geometry must persist across camera mode");
await page.locator("#viewmode").click();
await page.keyboard.press("p");
assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("photo-mode")),true);
await page.screenshot({path:"dist/city3d/standalone-cinematic.png"});
await page.keyboard.press("p");
// Real in-world interaction: spawn beside physical terminal; manually operate R,
// open X-Ray, complete the budget, reload, prove journal replay and prop continuity.
await page.goto(base+"/dist/city3d/index.html?spawn=freight&quality=low",{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>document.documentElement.dataset.city3dReady==="true",null,{timeout:45000});
await page.locator("#start").click();
assert.equal(await page.locator("#freight-operate").isDisabled(),false,"Player must be physically within freight terminal radius");
await page.locator("#xray-toggle").click();
assert.equal(await page.locator("#cuda-xray").isVisible(),true);
assert.equal(await page.locator("#xray-sectors").innerText(),"64");
assert.equal(await page.locator("#xray-memory-map > div").count(),32);
assert.match(await page.locator("#xray-memory-map > div").first().getAttribute("title"),/lane 0/);
await page.locator("[data-wave='1']").click();
assert.equal(await page.locator("[data-wave='1']").getAttribute("aria-pressed"),"true");
assert.equal(await page.locator("#xray-memory-map > div").count(),32);
await page.locator("[data-wave='0']").click();
let actions=0;
while((await page.locator("html").getAttribute("data-freight-model-completed"))!=="true"&&actions<16){
 const before=Number(await page.locator("#xray-sectors").innerText());
 await page.locator("#freight-operate").click();
 const after=Number(await page.locator("#xray-sectors").innerText());
 assert.ok(after<before,"Real street button must decrease sector cost");
 actions++;
}
assert.equal(await page.locator("html").getAttribute("data-freight-model-completed"),"true");
const completedSectors=await page.locator("#xray-sectors").innerText();
assert.ok(Number(completedSectors)<=40);
const receipt=await page.evaluate(()=>JSON.parse(localStorage.getItem("gpu-uncooked.city-freight.v1")));
assert.equal(receipt.actions.length,actions);
assert.equal(receipt.sectors,Number(completedSectors));
await page.screenshot({path:"dist/city3d/standalone-cuda-xray.png"});
await page.reload({waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>document.documentElement.dataset.city3dReady==="true",null,{timeout:45000});
assert.equal(await page.locator("html").getAttribute("data-freight-model-sectors"),completedSectors);
assert.equal(await page.locator("html").getAttribute("data-freight-model-completed"),"true");
await page.locator("#start").click();
await page.locator("#freight-reset").click();
assert.equal(await page.locator("html").getAttribute("data-freight-model-sectors"),"64");
assert.equal(await page.evaluate(()=>localStorage.getItem("gpu-uncooked.city-freight.v1")),null);
console.log(JSON.stringify({status:"PASS",selfContained:true,compressedBytes:report.brotliBytes,
 drawCalls:metrics.drawCalls,triangles:metrics.triangles,cornerProps:metrics.cornerProps,externalRequests:external.length},null,2));
await browser.close();
