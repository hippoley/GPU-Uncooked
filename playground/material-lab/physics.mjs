/**
 * Memory Workbench: one actual CUDA gather request model, grounded in addresses.
 * Visual objects represent real float32 input slots and 32B aligned sectors.
 * No hardware performance is inferred from the teaching model.
 */
export const LANE_COUNT=32;
export const ELEMENT_BYTES=4;
export const SECTOR_BYTES=32;
export const INPUT_COUNT=256;
export const STRIDES=Object.freeze([1,4,8]);
export const STEPS=Object.freeze(["source","dispatch","memory","result"]);
export function createInput(){
 return Array.from({length:INPUT_COUNT},(_,i)=>i+0.25);
}
export function kernelGather({stride=1,input=createInput()}={}){
 if(!STRIDES.includes(stride))throw new RangeError("Unsupported gather stride");
 if(input.length!==INPUT_COUNT||input.some(n=>!Number.isFinite(n)))throw new RangeError("Expected 256 finite float values");
 const lanes=Array.from({length:LANE_COUNT},(_,lane)=>{
  const index=lane*stride;
  const byteAddress=index*ELEMENT_BYTES;
  return {lane,index,byteAddress,sector:Math.floor(byteAddress/SECTOR_BYTES),value:input[index]};
 });
 const sectors=[...new Set(lanes.map(x=>x.sector))].sort((a,b)=>a-b);
 return {stride,lanes,sectors,sectorCount:sectors.length,
  requestedBytes:LANE_COUNT*ELEMENT_BYTES,
  coveredBytes:sectors.length*SECTOR_BYTES,
  result:lanes.map(x=>x.value)};
}
export function sourceForStride(stride){
 if(!STRIDES.includes(stride))throw new RangeError("Invalid CUDA stride");
 return [
  "__global__ void gather(const float* src, float* dst, int stride) {",
  "  int lane = threadIdx.x;",
  "  if (lane < 32) {",
  "    int index = lane * stride;",
  "    dst[lane] = src[index];",
  "  }",
  "}",
  "",
  "gather<<<1, 32>>>(d_src, d_dst, "+stride+");"
 ].join("\n");
}
export function validateSnapshot(snapshot){
 if(!snapshot||!STRIDES.includes(snapshot.stride)||!STEPS.includes(snapshot.step)
  ||!Number.isInteger(snapshot.selectedLane)||snapshot.selectedLane<0||snapshot.selectedLane>=32)
  throw new RangeError("Bad workbench snapshot");
 return snapshot;
}
export function initialSnapshot(){return {stride:4,step:"source",selectedLane:0,interactions:0};}
export function transition(snapshot,change){
 validateSnapshot(snapshot);
 if(!change||typeof change!=="object")throw new RangeError("Missing action");
 let next;
 if(change.type==="STRIDE"){
  if(!STRIDES.includes(change.value))throw new RangeError("Invalid stride");
  next={...snapshot,stride:change.value,step:"source"};
 }else if(change.type==="STEP"){
  if(!STEPS.includes(change.value))throw new RangeError("Invalid pipeline step");
  next={...snapshot,step:change.value};
 }else if(change.type==="SELECT_LANE"){
  if(!Number.isInteger(change.value)||change.value<0||change.value>=32)throw new RangeError("Invalid lane");
  next={...snapshot,selectedLane:change.value};
 }else throw new RangeError("Unknown action");
 return {...next,interactions:snapshot.interactions+1};
}
export function replay(changes){
 let snapshot=initialSnapshot();
 if(!Array.isArray(changes)||changes.length>400)throw new RangeError("Invalid history");
 for(const change of changes)snapshot=transition(snapshot,change);
 return snapshot;
}
