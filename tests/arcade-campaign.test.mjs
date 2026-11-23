import test from "node:test";
import assert from "node:assert/strict";
import {chapterBeat,dangerSpeed,finalGrade,OBJECTIVE} from "../playground/arcade/campaign.mjs";
test("story moves through discovery, pursuit, pulse and extraction",()=>{
 assert.equal(chapterBeat({}).id,"entry");
 assert.equal(chapterBeat({collected:1}).id,"discover");
 assert.equal(chapterBeat({collected:3}).id,"ambush");
 assert.equal(chapterBeat({collected:5}).id,"pulse");
 assert.equal(chapterBeat({collected:OBJECTIVE}).id,"extract");
});
test("emergency oxygen overrides objective",()=>assert.equal(chapterBeat({collected:8,oxygen:12}).id,"low-oxygen"));
test("rare discovery overlays pulse hint",()=>assert.equal(chapterBeat({collected:6,rareFound:true}).id,"rare"));
test("enemy intensity rises after first confrontation",()=>{
 assert.equal(dangerSpeed({collected:2,elapsed:30}),1);
 assert.equal(dangerSpeed({collected:3,elapsed:31}),1.5);
 assert.equal(dangerSpeed({collected:1,elapsed:45}),1.5);
});
test("successful rare artifact is a real in-game reward not GPU speedup",()=>{
 assert.deepEqual(finalGrade({collected:8,oxygen:60,rareFound:true,success:true}),{bonus:120,stars:3,title:"DEEP SEA ACE"});
 assert.equal(finalGrade({collected:8,oxygen:12,success:false}).bonus,0);
});
test("invalid states fail explicitly",()=>{
 assert.throws(()=>chapterBeat({collected:-1}),RangeError);
 assert.throws(()=>dangerSpeed({elapsed:-10}),RangeError);
 assert.throws(()=>finalGrade({collected:8,oxygen:NaN}),RangeError);
});
