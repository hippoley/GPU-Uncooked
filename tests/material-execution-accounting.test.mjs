import test from "node:test";
import assert from "node:assert/strict";
import {occupancyBound,gatherAccounting,rooflineBound,acceptUnverifiedObservation,reconcileGather} from "../playground/material-lab/execution-accounting.mjs";

const device={threadsPerBlock:256,registersPerThread:32,sharedBytesPerBlock:0,
 registersPerSM:65536,sharedBytesPerSM:228*1024,maxThreadsPerSM:2048,
 maxBlocksPerSM:32,maxWarpsPerSM:64,warpSize:32};

test("gather ledgers separate logical operations from unobserved hardware events",()=>{
 const r=gatherAccounting(8);
 assert.equal(r.algorithmic.floatFma,0);
 assert.equal(r.algorithmic.integerIndexProducts,32);
 assert.deepEqual([r.algorithmic.usefulLoadBytes,r.algorithmic.source32ByteRegions,r.algorithmic.sourceRegionSpanBytes],[128,32,1024]);
 assert.equal(r.algorithmic.destination32ByteRegions,4);
 assert.equal(r.hardware.sassInstructions,null);
 assert.equal(r.hardware.dramBytesRead,null);
 assert.equal(r.timing.kernelNs,null);
 assert.throws(()=>gatherAccounting(8,{blocks:132}),/single block/);
});
test("occupancy is a resource upper bound not observed scheduling",()=>{
 for(const [regs,blocks,occupancy] of [[32,8,1],[64,4,.5],[96,2,.25],[128,2,.25]]){
  const r=occupancyBound({...device,registersPerThread:regs});
  assert.equal(r.activeBlocksUpperBound,blocks);
  assert.equal(r.occupancyUpperBound,occupancy);
  assert.equal(r.kind,"DERIVED");
 }
 const withShared=occupancyBound({...device,sharedBytesPerBlock:100000});
 assert.equal(withShared.activeBlocksUpperBound,2);
 assert.throws(()=>occupancyBound({...device,threadsPerBlock:255}),/integer number of warps/);
});
test("roofline explicitly reports a bound with the right units",()=>{
 const r=rooflineBound({fp32Tflops:60,hbmTBps:3.35,arithmeticIntensityFlopsPerByte:1/12});
 assert.ok(Math.abs(r.idealTflopsUpperBound-3.35/12)<1e-12);
 assert.equal(r.fp32TflopsLimit,60);
 assert.equal(r.kind,"DERIVED");
});
test("profiler claims are quarantined as unverified and never silently become measurements",()=>{
 const raw={trust:"UNVERIFIED_CAPTURE_NOT_ATTESTATION",deviceUuid:"GPU-12345678",
  receiptSha256:"b".repeat(64),stride:8,
  metrics:{"dram__bytes_read.sum":4096,"l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum":32}};
 const receipt=acceptUnverifiedObservation(raw);
 assert.equal(receipt.kind,"REPORTED_UNVERIFIED");
 assert.equal(receipt.hardwareAttested,false);
 assert.equal(receipt.metrics.dramBytesRead,4096);
 const ledger=reconcileGather(8,receipt);
 assert.equal(ledger.evidence.profiler,"REPORTED_UNVERIFIED");
 assert.equal(ledger.comparison.measuredDramBytesRead,null);
 assert.equal(ledger.derived.algorithmic.source32ByteRegions,32);
 assert.throws(()=>reconcileGather(4,receipt),/Incorrect/);
 assert.throws(()=>acceptUnverifiedObservation({...raw,verified:true}),/No verification/);
 assert.throws(()=>acceptUnverifiedObservation({...raw,metrics:{fake:10}}),/Unsupported/);
 assert.throws(()=>acceptUnverifiedObservation({...raw,metrics:{"dram__bytes_read.sum":-1}}),/Invalid metric/);
});
test("unconnected execution ledger always remains UNKNOWN for performance",()=>{
 const r=reconcileGather(1);
 assert.equal(r.evidence.profiler,"UNKNOWN");
 assert.equal(r.evidence.sass,"UNKNOWN");
 assert.equal(r.comparison.measuredGlobalLoadSectors,null);
});
