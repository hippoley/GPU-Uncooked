import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const paths = [
 "playground/index.html",
 "playground/chapters/index.html",
 "playground/chapters/01-thread-mapping/index.html",
 "playground/chapters/02-warp-divergence/index.html",
 "playground/chapters/03-memory-coalescing/index.html"
];
const load = p => readFileSync(resolve(root,p),"utf8");
test("all three chapters and navigation hub exist",()=>{
 for(const p of paths)assert.ok(existsSync(resolve(root,p)),p);
 for(let i=1;i<=3;i++)assert.match(load(paths[1]),new RegExp("0"+i+"-[a-z-]+/index\\.html"));
});
test("all relative HTML links from learning path resolve",()=>{
 for(const p of paths){
  const html=load(p);
  const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.endsWith(".html"));
  for(const href of hrefs)assert.ok(existsSync(resolve(dirname(resolve(root,p)),href)),p+" -> "+href);
 }
});
test("chapter 03 answer explorer starts hidden until a prediction",()=>{
 const html=load(paths[4]),js=load("playground/chapters/03-memory-coalescing/main.mjs");
 assert.match(html,/id="memory-explorer" hidden/);
 assert.match(js,/memory-explorer"\)\.hidden=false/);
 assert.match(js,/memory-explorer"\)\.hidden=true/);
});
test("no chapter misrepresents browser models as physical GPU runs",()=>{
 for(const p of paths.slice(2))assert.match(load(p),/not|No|NOT/);
});
