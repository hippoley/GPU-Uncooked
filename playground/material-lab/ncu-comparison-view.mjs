/** Read-only view of an independently *unverified* operator Nsight comparison. */
const HASH=/^[0-9a-f]{64}$/;
const METRICS=[
 "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum",
 "dram__bytes_read.sum",
 "dram__bytes_write.sum"
];
export function parseNcuComparison(value){
 if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Invalid comparison");
 if(value.schema!=="gpu-uncooked.ncu-comparison.v1"||
    value.classification!=="REPORTED_UNVERIFIED"||
    value.hardware_attested!==false)throw new TypeError("Cannot upgrade profiler claim");
 for(const key of ["binary_sha256","source_manifest_sha256","series_manifest_sha256"])
  if(!HASH.test(value[key]||""))throw new TypeError("Invalid cross-linked receipt hash "+key);
 if(typeof value.device_uuid_claim!=="string"||!value.device_uuid_claim.startsWith("GPU-"))
  throw new TypeError("Invalid claimed device");
 if(!Array.isArray(value.rows)||value.rows.length!==3)throw new TypeError("Expected three Nsight captures");
 const rows=value.rows.map((r,i)=>{
  const stride=[1,4,8][i],expected=[4,16,32][i];
  if(r.stride!==stride||r.expected_source_32b_regions!==expected||
     r.source_region_bytes_span!==expected*32)throw new TypeError("Source comparison not reproducible");
  if(typeof r.kernel!=="string"||!r.kernel.includes("gather")||r.kernel.length>300)
   throw new TypeError("Unknown kernel");
  if(!HASH.test(r.profile_transcript_sha256||""))throw new TypeError("Transcript digest absent");
  const metrics=r.claimed_profiler_metrics;
  if(!metrics||typeof metrics!=="object"||Object.keys(metrics).length!==3||
     !METRICS.every(k=>typeof metrics[k]==="number"&&Number.isFinite(metrics[k])&&metrics[k]>=0))
   throw new TypeError("Profiler metrics invalid or unavailable");
  return Object.freeze({
   stride,sourceRegions:expected,
   l1LoadSectors:metrics[METRICS[0]],
   dramReadBytes:metrics[METRICS[1]],
   dramWriteBytes:metrics[METRICS[2]]
  });
 });
 return Object.freeze({
  status:"REPORTED_UNVERIFIED",hardwareAttested:false,
  binarySha256:value.binary_sha256,deviceClaim:value.device_uuid_claim,
  rows:Object.freeze(rows)
 });
}
