/**
 * GPU World State v1 / Silicon City. A deterministic and replayable learning model.
 * Freight physics is shared with the standalone Memory Heist rather than copied.
 * No claim that synthetic sector counts are actual hardware measurements.
 */
import {stripedManifest,manifestFootprint,consolidateSector,validateManifest,STARTING_BUDGET} from "../freight/physics.mjs";
export const WORLD_STATE_VERSION=1;
export const CITY_FREIGHT_LOCATION=Object.freeze({x:-34,z:-26});
export const CITY_FREIGHT_RADIUS=9;
export const INITIAL_WORLD=()=>({
 version:WORLD_STATE_VERSION,
 manifest:stripedManifest(),
 actions:[],
 completed:false,
 equipment:"overloaded"
});
function assertState(s){
 if(!s||s.version!==WORLD_STATE_VERSION||!Array.isArray(s.actions)||s.actions.length>128)throw new RangeError("Invalid world state");
 validateManifest(s.manifest);return s;
}
export function worldEvidence(s){
 assertState(s);
 const fp=manifestFootprint(s.manifest);
 return {sectors:fp.sectors,budget:STARTING_BUDGET,requiredBytes:fp.requestedBytes,
  coveredBytes:fp.sectorBytes,efficiency:fp.efficiency,withinBudget:fp.sectors<=STARTING_BUDGET,
  waveSectors:fp.waves.map(w=>w.transactions),moves:s.actions.length};
}
export function applyWorldAction(state,action){
 assertState(state);
 if(action?.type!=="CONSOLIDATE_SECTOR"&&action?.type!=="RESET_FREIGHT")
  throw new RangeError("Unrecognized world action");
 if(action.type==="RESET_FREIGHT")return INITIAL_WORLD();
 if(state.completed)throw new RangeError("Freight job completed");
 if(!Number.isInteger(action.slot)||action.slot<0||action.slot>=128)
  throw new RangeError("Invalid cargo slot");
 const before=worldEvidence(state),next=consolidateSector(state.manifest,action.slot);
 const after=manifestFootprint(next.manifest);
 const event={
  seq:state.actions.length+1,type:action.type,slot:action.slot,sector:next.sector,
  convoy:next.wave,swaps:next.moves,beforeSectors:before.sectors,afterSectors:after.sectors
 };
 return {
  ...state,manifest:next.manifest,actions:[...state.actions,event],
  completed:after.sectors<=STARTING_BUDGET,
  equipment:after.sectors<=STARTING_BUDGET?"operational":"overloaded"
 };
}
export function nextActionSlot(state){
 assertState(state);
 // Pick a still-scattered sector in the first convoy. Player's explicit action
 // is required; no automatic completion and no click-handler auto progression.
 const fp=manifestFootprint(state.manifest);
 if(fp.sectors<=STARTING_BUDGET)return null;
 const wave=state.manifest.slice(0,32);
 for(const sector of [0,4,8,12]){
  const slot=wave.findIndex(a=>Math.floor(a/8)===sector);
  if(slot>=0)return slot;
 }
 return 0;
}
export function replayWorld(events){
 let state=INITIAL_WORLD();
 for(const action of events){
  if(!action||!["CONSOLIDATE_SECTOR","RESET_FREIGHT"].includes(action.type))
   throw new RangeError("Invalid event history");
  state=applyWorldAction(state,{type:action.type,slot:action.slot});
 }
 return state;
}
export function canOperateFreight(pos){
 return !!pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z)&&
  Math.hypot(pos.x-CITY_FREIGHT_LOCATION.x,pos.z-CITY_FREIGHT_LOCATION.z)<=CITY_FREIGHT_RADIUS;
}
export function stateReceipt(state){
 const e=worldEvidence(state);
 return {version:WORLD_STATE_VERSION,completed:state.completed,actions:state.actions.slice(),
  sectors:e.sectors,sectorBudget:e.budget,model:"32-byte-sector/4x32-lane",
  origin:"Silicon City interactive world; deterministic teaching model, not Nsight profiler"};
}
