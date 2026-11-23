/** Curated, vendor-decoded third-party public H100 report snapshot.
 * Only the 11 listed metric cells were transcribed from the raw CLI CSV.
 * Pinned input: GitHub CI 45095035273, Nsight Compute 2026.2.0.
 * This is NOT a per-cycle trace, not a re-executed H100 benchmark, and
 * never a substitute for importing the full original report.json.
 */
export const SNAPSHOT_ORIGIN=Object.freeze({
 runUrl:"https://github.com/hippoley/GPU-Uncooked/actions/runs/45095035273",
 sourceRevision:"53fcfbf0c11430ca9db23f8d90c4ec71b686efc8",
 vendorTool:"NVIDIA Nsight Compute 2026.2.0",
 classification:"THIRD_PARTY_UNVERIFIED"
});
const VALUES=Object.freeze([
 ["GPU Speed Of Light Throughput","Duration","ns","61056","38816"],
 ["GPU Speed Of Light Throughput","Elapsed Cycles","cycle","96471","61160"],
 ["Launch Statistics","Registers Per Thread","register/thread","124","80"],
 ["Launch Statistics","Dynamic Shared Memory Per Block","byte/block","46656","38592"],
 ["Occupancy","Theoretical Active Warps per SM","warp","16","20"],
 ["Occupancy","Theoretical Occupancy","%","25","31.25"],
 ["Occupancy","Achieved Occupancy","%","21.74","25.11"],
 ["Compute Workload Analysis","Executed Ipc Active","inst/cycle","0.83","1.18"],
 ["Compute Workload Analysis","Issue Slots Busy","%","20.88","29.55"],
 ["Memory Workload Analysis","L1/TEX Hit Rate","%","35.85","36.39"],
 ["Memory Workload Analysis","L2 Hit Rate","%","7.97","6.69"]
]);
function one(id,size,blob,sha,stdout,direction){
 return Object.freeze({
  schema:"gpu-uncooked.public-ncu-report.v1",report_id:id,
  source_repo:"smartxiaohuolong/triton-tle-attention-optimization-demo",
  source_revision:SNAPSHOT_ORIGIN.sourceRevision,
  source_size_bytes:size,source_git_blob_sha1:blob,source_sha256:sha,
  source_device_claim:"NVIDIA H100 SM90 (upstream README; unverified)",
  ncu_stdout_sha256:stdout,status:"PARSED_UNVERIFIED",
  classification:"THIRD_PARTY_UNVERIFIED",
  hardware_attested:false,binary_identity_bound_to_our_gather:false,
  reproduces_our_stride_experiment:false,
  metrics:VALUES.map(([section,metric,unit,rsw,mem])=>({
   launch_id:"0",kernel:"fp8_kvpertensor_tle_splitk_v52_cluster8_paged_vtranspose_log2_kernel",
   section,metric,unit,raw_value:direction==="rsw"?rsw:mem
  }))
 });
}
export const PUBLIC_H100_SNAPSHOT=Object.freeze({
 left:one("rswgmma_uniform4096",1100024,
  "13ce934a7a036a4690bb62aa0be88929a75606d4",
  "9306945be3a48e7df590a319c3360df0e24f7d64e2aca8eaaa3993c8159fcc65",
  "1b197f809bbc9c0aaf52c277641b95d3f8c40af3cb94d6648d27a4822f8c4074","rsw"),
 right:one("memdesc_transpose_uniform4096",1007277,
  "c35316d5e68eaee8f9cc005eb030415ec2ccb0ce",
  "e2845164a11721415d780e94e61bc41ce2833829b91695b8bec2778cf5adb424",
  "8798372f7ffaa0858fe08c9229ed93f6144f9af7eaad955dab5c5ccef9346e11","mem")
});
