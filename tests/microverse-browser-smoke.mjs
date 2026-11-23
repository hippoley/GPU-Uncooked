import assert from "node:assert/strict";
import {chromium} from "playwright";
import {readFileSync} from "node:fs";
const report=JSON.parse(readFileSync("dist/microverse/build-report.json","utf8"));
assert.equal(report.includesThreeJs,true);
assert.equal(report.externalRuntimeAssets,0);
assert.equal(report.underLimit,true,"Entire interactive expedition must fit 1.4MB Brotli");
const base="http://127.0.0.1:8765";
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[],external=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",request=>{
 if(!request.url().startsWith(base)&&!request.url().startsWith("data:"))external.push(request.url());
});
await page.goto(base+"/dist/microverse/index.html?speed=fast",{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>document.documentElement.dataset.microverseReady==="true",{},{timeout:45000});
assert.equal(await page.locator("#start").isVisible(),true);
assert.equal(await page.locator("#stops li").count(),11,"World must include 11 physical stops");
assert.deepEqual(external,[],"All game engine and visual assets must be inline");
await page.screenshot({path:"dist/microverse/start-screen.png"});
await page.locator("#begin").click();
assert.equal(await page.locator("#operate").isDisabled(),false,"First station must be playable with zero walking");
await page.screenshot({path:"dist/microverse/first-room.png"});
await page.locator("#show-truth").click();
assert.equal(await page.locator("#truth").isVisible(),true,"Optional hardware explanation must be accessible");
await page.locator("#show-truth").click();
for(let i=0;i<11;i++){
 await page.waitForFunction(()=>!document.getElementById("operate").disabled,null,{timeout:45000});
 assert.equal(Number(await page.locator("html").getAttribute("data-microverse-index")),i);
 await page.locator("#operate").click();
 assert.equal(Number(await page.locator("html").getAttribute("data-microverse-progress")),i+1);
 if(i===6)await page.screenshot({path:"dist/microverse/inside-warp.png"});
}
assert.equal(await page.locator("html").getAttribute("data-microverse-complete"),"true");
assert.equal(await page.locator("#done").isVisible(),true);
await page.screenshot({path:"dist/microverse/expedition-complete.png"});
const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("gpu-uncooked.microverse.v1")));
assert.equal(save.seen.length,11);
await page.reload({waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>document.documentElement.dataset.microverseReady==="true",null,{timeout:45000});
assert.equal(await page.locator("html").getAttribute("data-microverse-progress"),"11","Progress survives reload");
await page.locator("#again").click();
assert.equal(await page.locator("html").getAttribute("data-microverse-progress"),"0");
assert.deepEqual(errors,[],"Browser must have no uncaught page errors");
assert.deepEqual(external,[],"No third-party runtime requests");
console.log(JSON.stringify({status:"PASS",rooms:11,hardwareExhibits:11,
 screenshotCount:4,engineIncluded:true,brotliBytes:report.brotliBytes,
 extraNetworkRequests:external.length,uncaughtErrors:errors.length},null,2));
await browser.close();
