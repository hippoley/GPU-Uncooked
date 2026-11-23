/** Immutable presentation excerpt of two actual vendor-decoded full-source Nsight reports.
 * SASS counters are profiler-reported, NOT clock cycles.
 * GitHub verification: https://github.com/hippoley/GPU-Uncooked/actions/runs/45096310906
 */
export const FULL_SOURCE_SASS=Object.freeze({
 classification:"THIRD_PARTY_UNVERIFIED",hardwareAttested:false,
 causalSpeedupProven:false,sameBinaryVerified:false,
 sourceRun:"https://github.com/hippoley/GPU-Uncooked/actions/runs/45096310906",
 variants:[
  {label:"RS-WGMMA full_source",kernel:"rswgmma_uniform4096_kernel",
   durationNs:60864,registersPerThread:118,staticSassLines:1488,
   reportedInstructionExecutions:7640064,
   sourceViewSha256:"2adedcaa5e572db1d765a8b47817e0bb3e6ef20b4300ed8478035b125b714d50"},
  {label:"Memdesc full_source",kernel:"memdesc_transpose_uniform4096_kernel",
   durationNs:41184,registersPerThread:80,staticSassLines:1440,
   reportedInstructionExecutions:6978048,
   sourceViewSha256:"d134ffa493971a609449a3c6bf428744d5f0ce69cfc0d9bcffbea9690baf19e3"}
 ],
 rows:[
  {opcode:"QGMMA",left:131072,right:131072},
  {opcode:"STS",left:1229824,right:181248},
  {opcode:"PRMT",left:17152,right:803584},
  {opcode:"LDS",left:1250304,right:1250304},
  {opcode:"FFMA",left:227328,right:227328},
  {opcode:"LDG",left:34816,right:34816}
 ]
});
export function validateFullSourceSass(snapshot){
 if(snapshot.classification!=="THIRD_PARTY_UNVERIFIED"||
    snapshot.hardwareAttested!==false||
    snapshot.causalSpeedupProven!==false||
    snapshot.sameBinaryVerified!==false)throw new Error("Cannot promote third-party SASS");
 if(snapshot.variants.length!==2||snapshot.rows.length<1)throw new Error("Incomplete SASS evidence");
 for(const variant of snapshot.variants){
  if(!/^[a-f0-9]{64}$/.test(variant.sourceViewSha256))throw new Error("Missing SASS provenance");
 }
 for(const row of snapshot.rows){
  if(!Number.isSafeInteger(row.left)||!Number.isSafeInteger(row.right)||
     row.left<0||row.right<0)throw new Error("Invalid instruction count");
 }
 return snapshot;
}
