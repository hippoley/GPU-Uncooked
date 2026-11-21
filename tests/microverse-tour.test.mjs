import test from "node:test";
import assert from "node:assert/strict";
import {STAGES,TOUR_VERSION,initialTour,activeStage,operateStation,nearStation,stationZ,validateTour} from "../playground/microverse/tour.mjs";

test("novice tour spans both CUDA software and physical execution layers",()=>{
 assert.equal(STAGES.length,11);
 assert.equal(STAGES[0].id,"host");
 assert.equal(STAGES[1].id,"runtime");
 assert.equal(STAGES.at(-1).id,"result");
 const ids=STAGES.map(s=>s.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(STAGES.some(s=>s.id==="sm"));
 assert.ok(STAGES.some(s=>s.id==="warp"));
 assert.ok(STAGES.some(s=>s.id==="register"));
 assert.ok(STAGES.some(s=>s.id==="shared"));
 assert.ok(STAGES.every(s=>s.story&&s.question&&s.truth&&s.action));
});

test("all eleven physical exhibits require one deliberate act, preserve ordered evidence",()=>{
 let state=initialTour();
 assert.equal(state.version,TOUR_VERSION);
 assert.equal(state.index,0);
 for(let index=0;index<STAGES.length;index++){
  assert.equal(activeStage(state).id,STAGES[index].id);
  const before=state;
  state=operateStation(state);
  assert.notEqual(before,state);
  assert.equal(state.seen.length,index+1);
  assert.deepEqual(state.seen,STAGES.slice(0,index+1).map(s=>s.id));
 }
 assert.equal(state.complete,true);
 assert.equal(state.index,STAGES.length-1);
 assert.equal(operateStation(state),state);
 assert.deepEqual(validateTour(JSON.parse(JSON.stringify(state))),state);
});

test("malformed or invented progress cannot pass validation",()=>{
 assert.throws(()=>validateTour({version:1,index:10,seen:[],complete:true}),RangeError);
 assert.throws(()=>validateTour({version:1,index:0,seen:["not-a-stop"],complete:false}),RangeError);
 assert.throws(()=>validateTour({version:1,index:15,seen:[],complete:false}),RangeError);
});

test("each room is reachable through one contiguous guided route",()=>{
 for(let i=0;i<STAGES.length;i++){
  assert.equal(nearStation(stationZ(i)+3.2,i),true);
  assert.equal(nearStation(stationZ(i)+8,i),false);
  if(i>0)assert.equal(stationZ(i-1)-stationZ(i),11);
 }
 assert.equal(nearStation(Infinity,0),false);
 assert.equal(nearStation(0,-1),false);
});
