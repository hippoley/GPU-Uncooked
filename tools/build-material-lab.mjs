/** Build one true self-contained realistic CUDA memory workbench; no external assets. */
import {build} from "esbuild";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync,brotliCompressSync,constants} from "node:zlib";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const base=resolve(root,"playground/material-lab"),out=resolve(root,"dist/material-lab");
const result=await build({entryPoints:[resolve(base,"main.mjs")],bundle:true,write:false,
 platform:"browser",format:"esm",target:"es2022",minify:true,treeShaking:true,legalComments:"none"});
if(result.outputFiles.length!==1)throw Error("Expected a single JS bundle");
const js=Buffer.from(result.outputFiles[0].contents).toString("utf8").replaceAll("</script","<\\/script");
let html=readFileSync(resolve(base,"index.html"),"utf8");
const source='<script type="module" src="./main.mjs"></script>';
if(!html.includes(source))throw Error("Missing script anchor");
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,"");
const template=html.replace(source,"");
if(/<script\b[^>]*\bsrc\s*=/i.test(template))throw Error("Unexpected external script");
html=html.replace(source,()=>'<script type="module">'+js+'</script>');
const count=[...html.matchAll(/<script\b/gi)].length;
if(count!==1||[...html.matchAll(/<\/script\s*>/gi)].length!==1)throw Error("Expected one inline script");
const bytes=Buffer.from(html);
const gz=gzipSync(bytes,{level:9}),br=brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:9}});
const report={target:"real-material CUDA workbench one-file browser entry",completeThreeJs:true,
 sourceKernel:"playground/material-lab/gather.cu",kernelExecutedOnNvidiaGpu:false,
 rawBytes:bytes.length,gzipBytes:gz.length,brotliBytes:br.length,limitBytes:1400000,underLimit:br.length<=1400000};
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,"index.html"),bytes);
writeFileSync(resolve(out,"build-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(!report.underLimit)process.exitCode=1;
