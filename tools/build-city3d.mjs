/**
 * Produce a real self-contained Silicon City HTML.
 * npm install --no-save esbuild@0.25.12 three@0.170.0
 * node tools/build-city3d.mjs
 * Three.js and the complete city ENTRY are inline; linked game pages are separate.
 */
import {build} from "esbuild";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync,brotliCompressSync,constants} from "node:zlib";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const src=resolve(root,"playground/city3d");
const dist=resolve(root,"dist/city3d");
const bundle=await build({
 entryPoints:[resolve(src,"main.mjs")],
 bundle:true,write:false,format:"esm",platform:"browser",target:"es2022",
 minify:true,treeShaking:true,legalComments:"none",splitting:false,logLevel:"warning"
});
if(bundle.outputFiles?.length!==1)throw Error("Expected one bundled JS output");
const js=Buffer.from(bundle.outputFiles[0].contents).toString("utf8").replaceAll("</script","<\\/script");
const original=readFileSync(resolve(src,"index.html"),"utf8");
const entry='<script type="module" src="./main.mjs"></script>';
if(!original.includes(entry))throw Error("Entry script anchor absent");
const template=original.replace(/<script type="importmap">[\s\S]*?<\/script>/,"");
const other=template.replace(entry,"");
if(/<script\b[^>]*\bsrc\s*=/i.test(other)||/<script\b[^>]*type\s*=\s*["']importmap/i.test(other))
 throw Error("Unexpected external script or import map in HTML template");
// Function replacement is essential: esbuild minified code contains dollar sequences
// that must be inserted verbatim, never interpreted as String.replace substitution tokens.
const html=template.replace(entry,()=>'<script type="module">'+js+'</script>');
if([...html.matchAll(/<script\b/gi)].length!==1||[...html.matchAll(/<\/script\s*>/gi)].length!==1)
 throw Error("Generated HTML must contain exactly one inlined script");
if(/<script\b[^>]*\bsrc\s*=/i.test(html))throw Error("External script survived bundling");
if(/https?:\/\/cdn\.jsdelivr\.net/.test(other))throw Error("CDN reference in HTML template");
const bytes=Buffer.from(html),gzip=gzipSync(bytes,{level:9});
const brotli=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:9}});
mkdirSync(dist,{recursive:true});
writeFileSync(resolve(dist,"index.html"),bytes);
const report={
 target:"single-file 3D city entry (other game chapters are separate)",
 path:"dist/city3d/index.html",
 includesThreeJs:true,externalRuntimeAssets:0,
 rawBytes:bytes.length,gzipBytes:gzip.length,brotliBytes:brotli.length,
 limitBytes:1400000,underLimit:brotli.length<=1400000,
 linkedChapterPagesNotBundled:true,
 visualParityWithGta6:"NOT_TESTED",realGpuFps:"NOT_TESTED"
};
writeFileSync(resolve(dist,"build-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.underLimit){console.error("Single-file city entry exceeds 1.4MB Brotli target");process.exitCode=1}
