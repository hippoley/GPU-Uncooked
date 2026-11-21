/**
 * GPU Execution Accounting Engine v0.1
 *
 * Three independent accounting lanes:
 * - DERIVED: source-level address/traffic and simple occupancy bounds.
 * - REPORTED_UNVERIFIED: operator-supplied compiler / profiler observations.
 * - UNKNOWN: no observation, never fill unknowns with invented cycles or SASS.
 *
 * A data structure that passes validation is not a hardware attestation.
 */
import {traceGather} from "./instruction-microscope.mjs";

const whole=(x)=>Number.isSafeInteger(x)&&x>=0;
const positive=(x)=>Number.isSafeInteger(x)&&x>0;
function assert(cond,msg){if(!cond)throw new TypeError(msg);}
const numberOrNull=(x)=>x===null||typeof x==="number"&&Number.isFinite(x)&&x>=0;
const DATA_LABELS=Object.freeze(["DERIVED","REPORTED_UNVERIFIED","UNKNOWN"]);
const opaque=(x)=>Object.freeze(x);
export function occupancyBound(config){
 assert(config&&typeof config==="object","Missing occupancy inputs");
 const {threadsPerBlock,registersPerThread,sharedBytesPerBlock,
  registersPerSM,sharedBytesPerSM,maxThreadsPerSM,maxBlocksPerSM,maxWarpsPerSM,
  warpSize=32,registerAllocationQuantum=null}=config;
 for(const [k,v] of Object.entries({threadsPerBlock,registersPerThread,sharedBytesPerBlock,
  registersPerSM,sharedBytesPerSM,maxThreadsPerSM,maxBlocksPerSM,maxWarpsPerSM,warpSize})){
  assert(k==="sharedBytesPerBlock"||k==="registersPerThread"||k==="sharedBytesPerSM"||k==="registersPerSM"?whole(v):positive(v),"Invalid "+k);
 }
 assert(threadsPerBlock%warpSize===0,"Threads must be an integer number of warps in this simplified model");
 assert(registerAllocationQuantum===null||positive(registerAllocationQuantum),"Bad register allocation quantum");
 const warpsPerBlock=threadsPerBlock/warpSize;
 const naiveRegisters=registersPerThread*threadsPerBlock;
 const allocatedRegisters=registerAllocationQuantum===null?naiveRegisters:
  Math.ceil(naiveRegisters/registerAllocationQuantum)*registerAllocationQuantum;
 const byRegisters=allocatedRegisters===0?Infinity:Math.floor(registersPerSM/allocatedRegisters);
 const byShared=sharedBytesPerBlock===0?Infinity:Math.floor(sharedBytesPerSM/sharedBytesPerBlock);
 const byThreads=Math.floor(maxThreadsPerSM/threadsPerBlock);
 const byWarps=Math.floor(maxWarpsPerSM/warpsPerBlock);
 const activeBlocks=Math.min(maxBlocksPerSM,byRegisters,byShared,byThreads,byWarps);
 const activeWarps=activeBlocks*warpsPerBlock;
 return opaque({
  kind:"DERIVED",model:"upper-bound-only",
  activeBlocksUpperBound:activeBlocks,activeWarpsUpperBound:activeWarps,
  occupancyUpperBound:activeWarps/maxWarpsPerSM,
  allocatedRegistersPerBlock:allocatedRegisters,
  limits:{blocks:maxBlocksPerSM,registers:byRegisters,shared:byShared,threads:byThreads,warps:byWarps},
  caveat:"Not measured occupancy. Compiler allocation granularities, architecture, scheduling, and kernel resources must be verified."
 });
}
export function gatherAccounting(stride,{blocks=1,threadsPerBlock=32}={}){
 assert(positive(blocks)&&threadsPerBlock===32,"Only the exact gather<<<1,32>>> semantics are supported; use future grid-stride kernel for scaling");
 assert(blocks===1,"This gather source has a single block");
 const t=traceGather(stride,31);
 return opaque({
  kind:"DERIVED",kernel:"gather",stride,launch:{blocks,threadsPerBlock,warps:1},
  algorithmic:{floatAdd:0,floatMultiply:0,floatFma:0,
    integerIndexProducts:32,sourceElements:32,destinationElements:32,
    usefulLoadBytes:t.loads.requestedBytes,usefulStoreBytes:t.stores.requestedBytes,
    source32ByteRegions:t.loads.uniqueRegions,destination32ByteRegions:t.stores.uniqueRegions,
    sourceRegionSpanBytes:t.loads.coveredRegionBytes,
    destinationRegionSpanBytes:t.stores.coveredRegionBytes},
  timing:{kernelNs:null,smCycles:null,stallCycles:null},
  hardware:{sassInstructions:null,registersPerThread:null,
    l1Sectors:null,l2Sectors:null,dramBytesRead:null,dramBytesWritten:null},
  caveat:"Counts describe 32 CUDA source-level lane operations, not SASS instruction issue count or DRAM traffic."
 });
}
export function rooflineBound({fp32Tflops,hbmTBps,arithmeticIntensityFlopsPerByte}){
 for(const [k,v] of Object.entries({fp32Tflops,hbmTBps,arithmeticIntensityFlopsPerByte}))
  assert(typeof v==="number"&&Number.isFinite(v)&&v>=0,"Invalid "+k);
 return opaque({kind:"DERIVED",fp32TflopsLimit:fp32Tflops,
  memoryTflopsLimit:hbmTBps*arithmeticIntensityFlopsPerByte,
  idealTflopsUpperBound:Math.min(fp32Tflops,hbmTBps*arithmeticIntensityFlopsPerByte),
  caveat:"Ideal steady-state roofline bound, not a latency prediction or measured throughput."});
}
const PROFILER_KEYS=Object.freeze({
 "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum":"l1LoadSectors",
 "dram__bytes_read.sum":"dramBytesRead",
 "dram__bytes_write.sum":"dramBytesWritten",
 "sm__cycles_active.avg":"smActiveCycles"
});
export function acceptUnverifiedObservation(observation){
 assert(observation&&typeof observation==="object"&&!Array.isArray(observation),"Observation missing");
 assert(observation.trust==="UNVERIFIED_CAPTURE_NOT_ATTESTATION","Cannot self-certify observation");
 assert(typeof observation.deviceUuid==="string"&&/^GPU-[a-zA-Z0-9-]{4,}$/.test(observation.deviceUuid),"Invalid device UUID");
 assert(/^[0-9a-f]{64}$/.test(observation.receiptSha256||""),"Missing receipt digest");
 assert([1,4,8].includes(observation.stride),"Invalid stride");
 const metrics={};
 for(const [name,value] of Object.entries(observation.metrics||{})){
  assert(Object.prototype.hasOwnProperty.call(PROFILER_KEYS,name),"Unsupported profiler metric "+name);
  assert(numberOrNull(value),"Invalid metric value "+name);
  metrics[PROFILER_KEYS[name]]=value;
 }
 assert(!("verified" in observation)||observation.verified===false,"No verification permitted");
 return opaque({kind:"REPORTED_UNVERIFIED",deviceUuid:observation.deviceUuid,
  receiptSha256:observation.receiptSha256,stride:observation.stride,
  metrics:opaque(metrics),hardwareAttested:false,
  caveat:"Caller data is an untrusted claim. Not linked to validated kernel invocation, cache state or independent GPU witness."});
}
export function reconcileGather(stride,observation=null){
 const derived=gatherAccounting(stride);
 if(observation!==null){
  assert(observation.kind==="REPORTED_UNVERIFIED"&&observation.stride===stride,"Incorrect or untrusted observation");
 }
 return opaque({
  schema:"gpu-uncooked.execution-account.v1",
  experiment:"gather-stride",derived,
  observed:observation,
  evidence:{derived:"DERIVED",compiler:"UNKNOWN",sass:"UNKNOWN",
   profiler:observation?"REPORTED_UNVERIFIED":"UNKNOWN",
   hardwareAttested:false},
  comparison:{
   sourceRegionCount:derived.algorithmic.source32ByteRegions,
   measuredGlobalLoadSectors:null,
   measuredDramBytesRead:null,
   explanation:"Theoretical source regions cannot be equated with profiler counters without kernel-specific collection and attribution."
  }
 });
}
