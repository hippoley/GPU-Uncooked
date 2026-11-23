/**
 * Educational 32-byte sector-touch model for a warp of 32 scalar 4-byte loads.
 * Unique sectors are counted, NOT observed physical DRAM/cache transactions.
 */
export const LANES=32;
export function analyze({stride=1,offset=0,elementBytes=4,sectorBytes=32}={}){
  for(const x of [stride,offset,elementBytes,sectorBytes])if(!Number.isInteger(x))throw new RangeError("Integer parameters required");
  if(stride<1||stride>64||offset<0||offset>63||elementBytes!==4||sectorBytes!==32)throw new RangeError("Out-of-range configuration");
  const addresses=Array.from({length:LANES},(_,lane)=>(offset+lane*stride)*elementBytes);
  const ids=addresses.map(byte=>Math.floor(byte/sectorBytes));
  const sectors=[...new Set(ids)].sort((a,b)=>a-b);
  const requestedBytes=LANES*elementBytes, touchedBytes=sectors.length*sectorBytes;
  return {addresses,ids,sectors,requestedBytes,touchedBytes,uniqueSectors:sectors.length,
    usefulFraction:requestedBytes/touchedBytes,
    footprintBytes:(addresses.at(-1)-addresses[0])+elementBytes,
    minAddress:addresses[0],maxAddress:addresses.at(-1)};
}
export function grade(guess,config){
 const correct=analyze(config).uniqueSectors;
 return {correct:Number.isInteger(guess)&&guess===correct,answer:correct};
}
