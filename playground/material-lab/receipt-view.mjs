/** A strict display-only parser. Browser-supplied JSON is NOT proof of GPU execution. */
export function parseReceiptView(x){
 if(!x||typeof x!=="object"||Array.isArray(x))throw new TypeError("Invalid receipt view");
 if(x.schema!=="gpu-uncooked.receipt-view.v1"||x.classification!=="UNATTESTED_RAW_CAPTURE"||
    x.integrity_checked_locally!==true||x.hardware_attested!==false||
    x.measured_gpu_metrics!==null)
  throw new Error("Receipt cannot claim independently attested GPU measurements");
 if(!x.device||typeof x.device.uuid!=="string"||!/^GPU-[a-zA-Z0-9-]{4,}$/.test(x.device.uuid))
  throw new Error("Invalid GPU identity");
 if(typeof x.git_commit!=="string"||!/^[0-9a-f]{40}$/.test(x.git_commit))
  throw new Error("Missing source commit");
 if(typeof x.source_sha256!=="string"||!/^[0-9a-f]{64}$/.test(x.source_sha256))
  throw new Error("Missing source digest");
 for(const key of ["source","ptx","sass"]){
  const value=x[key];
  if(!value||typeof value.text!=="string"||value.text.length>120000||
      typeof value.sha256!=="string"||!/^[0-9a-f]{64}$/.test(value.sha256)||
      typeof value.truncated!=="boolean")throw new Error("Malformed "+key);
 }
 if(!Array.isArray(x.runs)||x.runs.length!==3||[1,4,8].some((v,i)=>
   x.runs[i]?.stride!==v||x.runs[i]?.exit_code!==0||
   typeof x.runs[i]?.stdout!=="string"||x.runs[i].stdout.length>2000))
  throw new Error("Missing gather execution transcripts");
 // No user-input-controlled label can be elevated to MEASURED in the browser.
 return Object.freeze({
  classification:"UNATTESTED_RAW_CAPTURE",
  hardwareAttested:false,
  note:"Imported transcripts, not independently witnessed GPU execution",
  deviceUuid:x.device.uuid,
  deviceName:String(x.device.name||"unknown").slice(0,120),
  commit:x.git_commit,
  sourceSha256:x.source_sha256,
  text:Object.freeze({source:x.source.text,ptx:x.ptx.text,sass:x.sass.text}),
  hashes:Object.freeze({source:x.source.sha256,ptx:x.ptx.sha256,sass:x.sass.sha256}),
  runs:x.runs.map(r=>Object.freeze({stride:r.stride,stdout:r.stdout}))
 });
}
