/**
 * Reproducible self-contained Silicon City 3D entry build.
 * Requires: npm install --no-save esbuild@0.25.12 three@0.170.0
 * Output: dist/city3d/index.html (all 3D JavaScript including Three.js is inline).
 *
 * This bundles only the CITY ENTRY. Freight and CUDA game links remain separate pages.
 * No external runtime assets are permitted in this generated city entry.
 */
import {build} from "esbuild";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync,brotliCompressSync,constants} from "node:zlib";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const src=resolve(root,"playground/city3d");
const dist=resolve(root,"dist/city3d");
const buildResult=await build({
 entryPoints:[resolve(src,"main.mjs")],bundle:true,write:false,format:"esm",
 platform:"browser",target:"es2022",minify:true,treeShaking:true,
 legalComments:"none",splitting:false,logLevel:"warning"
});
if(buildResult.outputFiles?.length!==1)throw Error("Expected exactly one bundled JS file");
const js=Buffer.from(buildResult.outputFiles[0].contents).toString("utf8").replaceAll("</script","<\\/script");
const original=readFileSync(resolve(src,"index.html"),"utf8");
let html=original.replace(/<script type="importmap">[\s\S]*?<\/script>/,"");
const script='<script type="module" src="./main.mjs"></script>';
if(!html.includes(script))throw Error("Entry script anchor absent");
const remainingTemplate=html.replace(script,"");
if(/<script\b[^>]*\bsrc\s*=/i.test(remainingTemplate)||/<script\b[^>]*type\s*=\s*["']importmap/i.test(remainingTemplate))
 throw Error("Unexpected external script or import map in HTML template");
html=html.replace(script,'<script type="module">'+js+'</script>');
// Inline JS can legitimately contain literal HTML strings. Do not regex-scan
// script source as if it were HTML tags. The browser smoke test enforces zero network requests.
if(/https?:\/\/cdn\.jsdelivr\.net/.test(remainingTemplate))throw Error("CDN reference survived in HTML template");
const bytes=Buffer.from(html);
const gzip=gzipSync(bytes,{level:9});
const brotli=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:9}});
const max=1_400_000;
mkdirSync(dist,{recursive:true});
writeFileSync(resolve(dist,"index.html"),bytes);
const report={
 target:"single-file 3D city entry (other game chapters are separate)",path:"dist/city3d/index.html",
 includesThreeJs:true,externalRuntimeAssets:0,rawBytes:bytes.length,
 gzipBytes:gzip.length,brotliBytes:brotli.length,
 limitBytes:max,underLimit:brotli.length<=max,
 linkedChapterPagesNotBundled:true,
 visualParityWithGta6:"NOT_TESTED",realGpuFps:"NOT_TESTED"
};
writeFileSync(resolve(dist,"build-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.underLimit){console.error("Single-file city entry exceeds compressed target");process.exitCode=1}
