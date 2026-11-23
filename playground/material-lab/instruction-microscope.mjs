/**
 * Instruction microscope: reproducible arithmetic consequences of the CUDA gather
 * source. This is a *semantic* trace, NOT PTX/SASS execution or a cycle timeline.
 *
 * The same gather kernel binary receives a runtime stride argument. The actual
 * instruction listing does not have to change when stride changes; the operands
 * and memory address sets do. Only a real disassembly may establish instruction
 * identity on a chosen GPU.
 */
import {kernelGather,STRIDES,LANE_COUNT,ELEMENT_BYTES,SECTOR_BYTES} from "./physics.mjs";

export const TRACE_PHASES=Object.freeze([
 {id:"launch",name:"Launch / 配置",code:"gather<<<1, 32>>>(d_src, d_dst, stride);",question:"为什么只有一个 Warp？"},
 {id:"lane",name:"Thread / 身份",code:"int lane = threadIdx.x;",question:"线程 31 到底拿到了什么？"},
 {id:"index",name:"Index / 算数",code:"int index = lane * stride;",question:"换 stride 之后哪一个乘数变了？"},
 {id:"address",name:"Address / 偏移",code:"src[index]",question:"到底读取 src 的哪四个字节？"},
 {id:"load",name:"Load / 请求集合",code:"dst[lane] = src[index];",question:"32 条线程落在多少个 32B 区域？"},
 {id:"store",name:"Store / 写回",code:"dst[lane] = src[index];",question:"为什么写入仍连续？"},
 {id:"proof",name:"Proof / 可证伪",code:"CUDA C++ → compile → PTX → SASS → GPU → NCU",question:"哪些是真正观察到的？"}
]);
const byteOffset=(index)=>index*ELEMENT_BYTES;
function region(index){return Math.floor(byteOffset(index)/SECTOR_BYTES);}
function regionsForOffsets(offsets){return [...new Set(offsets.map(x=>Math.floor(x/SECTOR_BYTES)))].sort((a,b)=>a-b);}
export function traceGather(stride,lane=31){
 if(!STRIDES.includes(stride)||!Number.isInteger(lane)||lane<0||lane>=LANE_COUNT)
  throw new RangeError("Invalid gather trace coordinates");
 const m=kernelGather({stride});
 const source=m.lanes[lane];
 const destination={index:lane,byteOffset:byteOffset(lane),sector:region(lane)};
 const loadRegions=regionsForOffsets(m.lanes.map(x=>x.byteAddress));
 const storeRegions=regionsForOffsets(m.lanes.map(x=>byteOffset(x.lane)));
 const inputsByRegion=loadRegions.map(s=>{
  const contributing=m.lanes.filter(x=>x.sector===s);
  return {region:s,startByte:s*SECTOR_BYTES,endByte:s*SECTOR_BYTES+SECTOR_BYTES-1,
   lanes:contributing.map(x=>x.lane),indices:contributing.map(x=>x.index),
   bytesRequested:contributing.length*ELEMENT_BYTES};
 });
 return {
  kind:"DERIVED",assumption:"src and dst bases independently 32B aligned; offsets are relative, not GPU addresses",
  stride,lane,threadsPerBlock:32,blocks:1,warpCount:1,
  operands:{lane,stride,index:source.index,elementBytes:ELEMENT_BYTES,srcOffset:source.byteAddress,
    srcRegion:source.sector,dstOffset:destination.byteOffset,dstRegion:destination.sector,
    srcValue:source.value,dstValue:source.value},
  loads:{
   uniqueRegions:loadRegions.length,regionNumbers:loadRegions,
   groups:inputsByRegion,requestedBytes:LANE_COUNT*ELEMENT_BYTES,
   coveredRegionBytes:loadRegions.length*SECTOR_BYTES,
   regionUtilization:(LANE_COUNT*ELEMENT_BYTES)/(loadRegions.length*SECTOR_BYTES)
  },
  stores:{
   uniqueRegions:storeRegions.length,regionNumbers:storeRegions,
   requestedBytes:LANE_COUNT*ELEMENT_BYTES,
   coveredRegionBytes:storeRegions.length*SECTOR_BYTES
  },
  instructionIdentity:"UNKNOWN_UNTIL_DISASSEMBLED",
  ncuCounters:null,cacheHitPath:null,physicalLaneToSm:null
 };
}
export function compareGatherStrides(){
 return STRIDES.map(stride=>{
  const t=traceGather(stride);
  return {stride,sourceRegions:t.loads.uniqueRegions,
   sourceCoveredBytes:t.loads.coveredRegionBytes,
   sourceRegionUtilization:t.loads.regionUtilization,
   destinationRegions:t.stores.uniqueRegions,destinationCoveredBytes:t.stores.coveredRegionBytes};
 });
}
export function phaseExplanation(phaseId,trace){
 if(!TRACE_PHASES.some(x=>x.id===phaseId))throw new RangeError("Unknown trace phase");
 const a=trace.operands,l=trace.loads,s=trace.stores;
 const explanations={
  launch:{label:"1 个 Block × 32 Threads",detail:"一个 Block 中共 32 条线程，恰好是一个 Warp 的线程数。此处描述启动配置，不是 SM 的精确物理位置。"},
  lane:{label:"threadIdx.x = "+a.lane,detail:"同一个 CUDA C++ kernel 会由不同线程执行，每条线程读取自己的 threadIdx.x。当前选中 lane "+a.lane+"。"},
  index:{label:a.lane+" × "+a.stride+" = "+a.index,detail:"stride 作为运行时参数传入。改变它通常改变乘法输入值，不必改变 CUDA 源代码或同一编译二进制中的 SASS。真正的 SASS 必须反汇编确认。"},
  address:{label:"src + "+a.srcOffset+" bytes",detail:"float32 每项 4 字节：src["+a.index+"] 占相对偏移 "+a.srcOffset+"…"+(a.srcOffset+3)+"。假设 src 基地址按 32B 对齐，落入相对区域 "+a.srcRegion+"；实际设备地址未采集。"},
  load:{label:l.uniqueRegions+" × 32B regions / "+l.requestedBytes+"B useful",detail:"32 条线程每人读 4B，总有效载荷 128B。相对源地址覆盖 "+l.uniqueRegions+" 个不重复的对齐 32B 区域、共 "+l.coveredRegionBytes+"B 的区域跨度总和。不是已测 DRAM 事务次数，缓存命中和硬件合并请求仍未知。"},
  store:{label:s.uniqueRegions+" × 32B store regions",detail:"无论 stride 是几，dst[lane] 都连续：写入 32 × 4B = 128B，覆盖 "+s.uniqueRegions+" 个 32B 区域（假设目的地址对齐）。变稀疏的是源读取，不是目的写入。"},
  proof:{label:"SASS/NCU = NOT VERIFIED",detail:"源索引、相对地址及预测区域可由代码推导；编译后 PTX/SASS、实机返回结果及 Nsight 指标必须有设备收据才能称为观测。具体 L1→L2→HBM 路径不可从聚合指标复原。"}
 };
 return {phaseId,kind:"DERIVED",...explanations[phaseId]};
}
