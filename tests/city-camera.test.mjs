import test from "node:test";
import assert from "node:assert/strict";
import {cameraFor} from "../playground/city/render.mjs";
test("camera follows smoothly and stays inside world edges",()=>{
 let cam={x:480,y:270};
 cam=cameraFor({x:750,y:360},cam,.2,1.12);
 assert.ok(cam.x>480&&cam.x<750);
 for(let i=0;i<150;i++)cam=cameraFor({x:999,y:999},cam,.016,1.12);
 assert.ok(cam.x<=960-480/1.12+1);
 assert.ok(cam.y<=540-270/1.12+1);
});
test("reject malformed camera input",()=>{
 assert.throws(()=>cameraFor({x:NaN,y:3}),RangeError);
 assert.throws(()=>cameraFor({x:1,y:3},undefined,-.1),RangeError);
});
