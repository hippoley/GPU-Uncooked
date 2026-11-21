/** Freight District playable physics: grouping 4-byte cargo requests into 32-lane dispatch waves.
 * A dispatch wave models one hypothetical warp's 32 independent address requests.
 * This is an address-sector teaching model, NOT real GPU timing or DRAM transactions.
 */
export const LANES=32;
export const WAVES=4;
export const SECTOR_BYTES=32;
export const ITEM_BYTES=4;
export const TOTAL=LANES*WAVES;
export const STARTING_BUDGET=40;
export function validateManifest(manifest){
 if(!Array.isArray(manifest)||manifest.length!==TOTAL)throw new RangeError("Exactly 128 requests required");
 if(manifest.some(n=>!Number.isInteger(n)||n<0||n>=TOTAL))throw new RangeError("Addresses must be valid 0..127");
 if(new Set(manifest).size!==TOTAL)throw new RangeError("Manifest cannot lose or duplicate deliveries");
 return manifest;
}
export function stripedManifest(){
 return Array.from({length:TOTAL},(_,i)=>(i%LANES)*WAVES+Math.floor(i/LANES));
}
export function contiguousManifest(){
 return Array.from({length:TOTAL},(_,i)=>i);
}
export function seededManifest(seed=71){
 if(!Number.isInteger(seed))throw new RangeError("Invalid seed");
 const data=contiguousManifest();
 let state=seed>>>0;
 for(let i=data.length-1;i>0;i--){
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  const j=state%(i+1);[data[i],data[j]]=[data[j],data[i]];
 }
 return data;
}
export function sectorOf(address){if(!Number.isInteger(address)||address<0)throw new RangeError("Invalid address");return Math.floor(address*ITEM_BYTES/SECTOR_BYTES)}
export function manifestFootprint(manifest){
 validateManifest(manifest);
 const waves=[];
 for(let wave=0;wave<WAVES;wave++){
  const requests=manifest.slice(wave*LANES,(wave+1)*LANES);
  const sectors=[...new Set(requests.map(sectorOf))].sort((a,b)=>a-b);
  waves.push({wave,requests,sectors,transactions:sectors.length,bytesRequested:LANES*ITEM_BYTES,sectorBytes:sectors.length*SECTOR_BYTES});
 }
 const sectors=waves.reduce((n,w)=>n+w.transactions,0);
 return {waves,sectors,requestedBytes:TOTAL*ITEM_BYTES,sectorBytes:sectors*SECTOR_BYTES,efficiency:TOTAL*ITEM_BYTES/(sectors*SECTOR_BYTES)};
}
export function swapRequests(manifest,a,b){
 validateManifest(manifest);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=TOTAL||b>=TOTAL)throw new RangeError("Invalid cargo slots");
 const copy=manifest.slice();[copy[a],copy[b]]=[copy[b],copy[a]];
 return copy;
}
export function regroupManifest(manifest){
 validateManifest(manifest);
 return manifest.slice().sort((a,b)=>a-b);
}
export function evaluateDispatch(manifest,{budget=STARTING_BUDGET,sortActions=0}={}){
 if(!Number.isInteger(budget)||budget<0||!Number.isInteger(sortActions)||sortActions<0)throw new RangeError("Invalid dispatch state");
 const evidence=manifestFootprint(manifest);
 const withinBudget=evidence.sectors<=budget;
 const credits=withinBudget?Math.max(0,220-evidence.sectors*2-sortActions*8):0;
 return {...evidence,budget,withinBudget,credits,
  rank:!withinBudget?"ROUTE FAILED":evidence.sectors<=16?"SILICON ACE":evidence.sectors<=32?"LOCALITY PRO":"RECOVERY RUN"};
}
