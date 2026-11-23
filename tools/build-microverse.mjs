/** 
 * A true self-contained one-file Three.js miniature GPU tour.
 * Exact dependency versions installed by GitHub Actions.
 * Linked Silicon City chapters are independent and intentionally excluded.
 */
import {build} from "esbuild";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync,brotliCompressSync,constants} from "node:zlib";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const entry=resolve(root,"playground/microverse/main.mjs");
const src=resolve(root,"playground/microverse/index.html");
const dest=resolve(root,"dist/microverse");
const bundle=await build({entryPoints:[entry],bundle:true,write:false,format:"esm",
 platform:"browser",target:"es2022",minify:true,legalComments:"none",splitting:false});
if(bundle.outputFiles.length!==1)throw Error("Expected one JS bundle");
const js=Buffer.from(bundle.outputFiles[0].contents).toString("utf8").replaceAll("</script","<\\/script");
let html=readFileSync(src,"utf8");
const script='<script type="module" src="./main.mjs"></script>';
if(!html.includes(script))throw Error("Missing microverse entry script");
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,"");
const template=html.replace(script,"");
if(/<script\b[^>]*\bsrc\s*=/i.test(template)||/https?:\/\/cdn\.jsdelivr\.net/.test(template))
 throw Error("Unexpected external JS in HTML template");
html=html.replace(script,()=>'<script type="module">'+js+'</script>');
if([...html.matchAll(/<script\b/gi)].length!==1||[...html.matchAll(/<\/script\s*>/gi)].length!==1)
 throw Error("Embedded browser module must be the only script");
const raw=Buffer.from(html),gzip=gzipSync(raw,{level:9});
const brotli=brotliCompressSync(raw,{params:{[constants.BROTLI_PARAM_QUALITY]:9}});
const report={
 product:"GPU Uncooked · Inside the GPU / episode 1",
 scope:"self-contained microverse interactive entry with Three.js; external Silicon City pages excluded",
 path:"dist/microverse/index.html",engine:"three@0.170.0",totalRooms:11,
 includesThreeJs:true,externalRuntimeAssets:0,uncompressedBytes:raw.length,
 gzipBytes:gzip.length,brotliBytes:brotli.length,limitBytes:1400000,
 underLimit:brotli.length<=1400000,realHardwareExecution:false,realGpuFps:"NOT_TESTED"
};
mkdirSync(dest,{recursive:true});
writeFileSync(resolve(dest,"index.html"),raw);
writeFileSync(resolve(dest,"build-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.underLimit)process.exitCode=1;
