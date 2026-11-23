/** Compare pinned public ncu report metadata; NEVER promote third-party values. */
const SHA256=/^[0-9a-f]{64}$/;
const REV="53fcfbf0c11430ca9db23f8d90c4ec71b686efc8";
const ALLOWED=new Set(["rswgmma_uniform4096","memdesc_transpose_uniform4096","rswgmma_uniform4096_full_source","memdesc_transpose_uniform4096_full_source"]);
export function validatePublicNcuReport(x){
 if(!x||typeof x!=="object"||Array.isArray(x)||
 x.schema!=="gpu-uncooked.public-ncu-report.v1"||
 x.classification!=="THIRD_PARTY_UNVERIFIED"||
 x.hardware_attested!==false||
 x.binary_identity_bound_to_our_gather!==false||
 x.reproduces_our_stride_experiment!==false||
 x.status!=="PARSED_UNVERIFIED")throw new TypeError("Third-party report is not safely classified");
 if(x.source_repo!=="smartxiaohuolong/triton-tle-attention-optimization-demo"||
  x.source_revision!==REV||!ALLOWED.has(x.report_id)||!SHA256.test(x.source_sha256||"")||
  !SHA256.test(x.ncu_stdout_sha256||""))throw new TypeError("Unpinned source identity");
 if(!Array.isArray(x.metrics)||x.metrics.length<1||x.metrics.length>50000)
  throw new TypeError("Metric records missing or excessive");
 const items=x.metrics.map(m=>{
  if(!m||typeof m!=="object"||typeof m.launch_id!=="string"||m.launch_id.length>100||
   typeof m.kernel!=="string"||!m.kernel||m.kernel.length>500||
   typeof m.metric!=="string"||m.metric.length>240||
   typeof m.unit!=="string"||m.unit.length>80||
   (m.section!==undefined&&(typeof m.section!=="string"||m.section.length>180))||
   typeof m.raw_value!=="string"||m.raw_value.length>300)
    throw new TypeError("Malformed third-party metric");
  return {launch:m.launch_id,kernel:m.kernel,section:m.section||"",name:m.metric,unit:m.unit,value:m.raw_value};
 });
 return Object.freeze({reportId:x.report_id,status:"THIRD_PARTY_UNVERIFIED",
  declaredDevice:x.source_device_claim,sourceRevision:x.source_revision,sourceSha256:x.source_sha256,
  rows:Object.freeze(items)});
}
export function comparePublicNcuReports(a,b){
 if(a.reportId===b.reportId)throw new TypeError("Select two different kernel reports");
 const same=new Map();
 for(const row of a.rows){
  const k=row.section+"|"+row.name+"|"+row.unit;
  if(!same.has(k))same.set(k,[]);
  same.get(k).push(row);
 }
 const comparable=[];
 const used=new Set();
 for(const row of b.rows){
  const k=row.section+"|"+row.name+"|"+row.unit;
  if(used.has(k))continue;
  const matches=same.get(k)||[];
  const other=b.rows.filter(y=>y.section===row.section&&y.name===row.name&&y.unit===row.unit);
  // Only compare metrics with exactly one row in each report;
  // don't collapse different launches or silently average.
  if(matches.length===1&&other.length===1){
   comparable.push({section:row.section,metric:row.name,unit:row.unit,left:matches[0].value,right:row.value});
   used.add(k);
  }
 }
 return Object.freeze({
  classification:"THIRD_PARTY_UNVERIFIED",hardwareAttested:false,
  left:a.reportId,right:b.reportId,metrics:Object.freeze(comparable),
  warning:"Raw published metric strings; no claimed speedup, kernel-equivalence proof, or GPU attestation."
 });
}
