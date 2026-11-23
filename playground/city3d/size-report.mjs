/** Byte budget for our first-party WebGL city source.
 * This deliberately DOES NOT equate source bytes with complete browser delivery:
 * Three.js is imported from jsDelivr and counted as an unresolved external runtime.
 *
 * Run: node playground/city3d/size-report.mjs
 *     or: node playground/city3d/size-report.mjs --json
 */
import {readdirSync,readFileSync,statSync} from "node:fs";
import {join,relative,resolve} from "node:path";
import {brotliCompressSync,gzipSync,constants} from "node:zlib";
import {fileURLToPath} from "node:url";
const folder=fileURLToPath(new URL(".",import.meta.url));
export function budgetReport(dir=folder){
 const files=[];
 function walk(path){
  for(const entry of readdirSync(path,{withFileTypes:true})){
   const p=join(path,entry.name);
   if(entry.isDirectory())walk(p);
   else if(entry.isFile()&&/\.(mjs|html|css|js)$/.test(entry.name)&&!/(^size-report\.mjs$)/.test(entry.name)){
    files.push({path:relative(dir,p).replaceAll("\\","/"),bytes:readFileSync(p)});
   }
  }
 }
 walk(dir);
 files.sort((a,b)=>a.path.localeCompare(b.path));
 // Simulates a single concatenated transport blob WITHOUT claiming it is a production bundle.
 const combined=Buffer.concat(files.map(f=>Buffer.concat([Buffer.from("\n/* "+f.path+" */\n"),f.bytes])));
 const brotli=brotliCompressSync(combined,{params:{[constants.BROTLI_PARAM_QUALITY]:9}});
 const gzip=gzipSync(combined,{level:9});
 const index=files.find(f=>f.path==="index.html")?.bytes.toString("utf8")||"";
 const cdn=[...index.matchAll(/https?:\/\/[^"'<>\s]+/g)].map(m=>m[0]);
 return {
  scope:"first-party city3d HTML and JS source only; not a deployable single-file bundle",
  sourceFiles:files.length,firstPartyRawBytes:combined.length,
  firstPartyBrotliBytes:brotli.length,firstPartyGzipBytes:gzip.length,
  completeInitialDownloadBytes:null,
  externalRuntime:{urls:cdn,bytes:null,verified:false},
  targetTotalTransferBytes:1400000,
  meetsCompleteTarget:null,
  note:"Build a true self-contained bundle and measure all linked resources before claiming <=1.4 MB."
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=budgetReport();
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
 // Fails only if author-controlled source exceeds 1.4MB: this does not certify total transport.
 if(report.firstPartyBrotliBytes>1400000)process.exitCode=1;
}
