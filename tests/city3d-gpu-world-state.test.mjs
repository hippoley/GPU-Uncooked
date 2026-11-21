import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_WORLD,worldEvidence,applyWorldAction,nextActionSlot,replayWorld,canOperateFreight,stateReceipt} from "../playground/city3d/gpu-world-state.mjs";
test("city uses same deterministic sector source as freight, no invented counters",()=>{
 const first=INITIAL_WORLD();
 assert.equal(worldEvidence(first).sectors,64);
 assert.deepEqual(worldEvidence(first).waveSectors,[16,16,16,16]);
 assert.equal(worldEvidence(first).requiredBytes,512);
 assert.equal(worldEvidence(first).coveredBytes,2048);
 assert.equal(first.equipment,"overloaded");
});
test("explicit player actions lower demand and eventually restore equipment",()=>{
 let state=INITIAL_WORLD(),count=0,history=[];
 while(!state.completed&&count<16){
  const slot=nextActionSlot(state);
  assert.notEqual(slot,null,"Model must offer a genuinely effective manual action");
  const previous=worldEvidence(state).sectors;
  history.push({type:"CONSOLIDATE_SECTOR",slot});
  state=applyWorldAction(state,history[history.length-1]);
  assert.ok(worldEvidence(state).sectors<previous,"Each action must change real model cost");
  count++;
 }
 assert.equal(state.completed,true,"An actionable route must restore the simulated freight network");
 assert.equal(state.equipment,"operational");
 assert.equal(worldEvidence(state).withinBudget,true);
 assert.deepEqual(replayWorld(history),state);
 assert.equal(stateReceipt(state).completed,true);
 assert.equal(stateReceipt(state).origin.includes("not Nsight"),true);
 assert.throws(()=>applyWorldAction(state,{type:"CONSOLIDATE_SECTOR",slot:0}),RangeError);
});
test("world events immutable, invalid inputs fail closed and reset is replayable",()=>{
 let state=INITIAL_WORLD();
 const first=state;
 const slot=nextActionSlot(state);
 state=applyWorldAction(state,{type:"CONSOLIDATE_SECTOR",slot});
 assert.equal(worldEvidence(first).sectors,64);
 assert.notEqual(first,state);
 assert.equal(applyWorldAction(state,{type:"RESET_FREIGHT"}).actions.length,0);
 assert.throws(()=>applyWorldAction(state,{type:"EDIT_FPS",slot:0}),RangeError);
 assert.throws(()=>applyWorldAction(state,{type:"CONSOLIDATE_SECTOR",slot:-1}),RangeError);
 assert.deepEqual(replayWorld([{type:"CONSOLIDATE_SECTOR",slot},{type:"RESET_FREIGHT"}]),INITIAL_WORLD());
});
test("3D interaction only occurs near physical freight terminal",()=>{
 assert.equal(canOperateFreight({x:-34,z:-26}),true);
 assert.equal(canOperateFreight({x:0,z:6}),false);
 assert.equal(canOperateFreight({x:1,z:999}),false);
});
