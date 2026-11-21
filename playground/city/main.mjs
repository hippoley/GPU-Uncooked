import {DISTRICTS,stepPlayer,closestDistrict,currentInteraction,districtLink} from "./model.mjs";
import {drawCity,cameraFor} from "./render.mjs";
const $=id=>document.getElementById(id),canvas=$("city"),ctx=canvas.getContext("2d"),g=ctx;
let player={x:469,y:394,vx:0,vy:0},camera={x:480,y:270,zoom:1.12},mode="intro",t=0,last=null,visited=new Set();
const cars=[{x:-70,y:309,dir:1,speed:75,color:"#e65f86"},{x:1070,y:410,dir:-1,speed:94,color:"#42c6c7"},{x:210,y:322,dir:1,speed:60,color:"#f6b16c"}];
const npcs=Array.from({length:14},(_,i)=>({x:45+i*67,y:i%2?346+(i%3)*11:453+(i%3)*12,vx:i%2?.22:-.19,phase:i*1.7,color:["#67d4be","#b59ade","#eea3bd","#f7bf83"][i%4]}));
const rain=Array.from({length:90},(_,i)=>({x:(i*79)%960,y:(i*139)%540}));
const held=new Set(),sparks=Array.from({length:42},(_,i)=>({x:(i*179)%960,y:(i*127)%540,v:4+i%8}));
const keys={up:["arrowup","w","up"],down:["arrowdown","s","down"],left:["arrowleft","a","left"],right:["arrowright","d","right"]};
const move=()=>Object.fromEntries(Object.entries(keys).map(([k,arr])=>[k,arr.some(x=>held.has(x))]));
function showDialog(d){
 mode="dialog";$("modal").hidden=false;held.clear();
 $("modal-kicker").textContent=d.kind==="planned"?"COMING SOON · CONCEPT DISTRICT":d.kind==="game"?"AVAILABLE · PLAYABLE MISSION":"AVAILABLE · INTERACTIVE CUDA LAB";
 $("modal-title").textContent=d.ch;
 $("modal-message").textContent=d.kind==="planned"?"这个街区未来将开发为独立游戏： "+d.name+"。它不会成为其他章节的换皮版本。现在尚不能进入，避免把规划冒充可玩内容。":
 d.kind==="game"?"今晚的任务：潜入被淹没的海港，回收数据晶体，闪避 Cache Miss 生物，在氧气耗尽前回到平台。通过游戏结算进入 Memory Coalescing 互动实验。":
 "进入 "+d.name+" 的 CUDA 互动实验。真正的独立动作／解谜游戏还在制作中，这里不会把实验室假装成完整游戏。";
 const root=$("modal-actions");root.replaceChildren();
 const href=districtLink(d);if(href){const a=document.createElement("a");a.className="button";a.href=href;a.textContent=d.action+" →";root.append(a)}
 const close=document.createElement("button");close.className="secondary";close.textContent="继续逛街";close.onclick=closeDialog;root.append(close);
}
function closeDialog(){mode="roam";$("modal").hidden=true;held.clear()}
function interact(){if(mode!=="roam")return;const near=currentInteraction(player);if(near){visited.add(near.id);$("explored").innerHTML="DISCOVERED <strong>"+visited.size+" / 6</strong>";showDialog(near)}}
$("start").addEventListener("click",closeDialog);$("interact").addEventListener("click",interact);
const fullscreen=$("fullscreen");
if(fullscreen)fullscreen.addEventListener("click",async()=>{
 const stage=canvas.closest(".stage");
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(stage?.requestFullscreen)await stage.requestFullscreen();
 }catch(error){fullscreen.title="浏览器未授予全屏权限";}
});
document.addEventListener("fullscreenchange",()=>{if(fullscreen)fullscreen.textContent=document.fullscreenElement?"⤡ 退出全屏":"⛶ 全屏"});
document.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
 if(k==="escape"&&mode==="dialog")closeDialog();
 if(k==="e"&&!e.repeat)interact();
 held.add(k);
});
document.addEventListener("keyup",e=>held.delete(e.key.toLowerCase()));window.addEventListener("blur",()=>held.clear());
for(const btn of document.querySelectorAll("[data-key]")){
 const key=btn.dataset.key;
 btn.addEventListener("pointerdown",e=>{e.preventDefault();held.add(key);btn.setPointerCapture?.(e.pointerId)});
 for(const ev of ["pointerup","pointercancel","lostpointercapture","pointerleave"])btn.addEventListener(ev,()=>held.delete(key));
}
function update(dt){
 t+=dt;for(const s of sparks){s.y-=s.v*dt;s.x+=Math.sin(t+s.y)*dt*2;if(s.y<0)s.y=540}
 if(mode==="roam"){
  const old=player,next=stepPlayer(player,move(),dt);
  player={...next,vx:(next.x-old.x)/Math.max(dt,.0001),vy:(next.y-old.y)/Math.max(dt,.0001)};
  const nearest=closestDistrict(player),near=currentInteraction(player);
  byIdSafe("mission-name",near?near.ch:"寻找下一个街区");
  byIdSafe("mission-info",near?(near.kind==="planned"?"这里正在建设。按 E 了解未来游戏。":near.action+" · 按 E 进入"):"穿过城市，靠近发光的任务地点。");
  byIdSafe("prompt",near?"E · 进入 "+near.name:"WASD / 方向键移动");
 }
 camera=cameraFor(player,camera,dt,camera.zoom);
 for(const car of cars){car.x+=car.speed*car.dir*dt;if(car.dir>0&&car.x>1100)car.x=-130;if(car.dir<0&&car.x< -140)car.x=1090}
 for(const npc of npcs){npc.x+=npc.vx*dt*60;if(npc.x>930)npc.x=30;if(npc.x<20)npc.x=935}
 for(const p of rain){p.y+=dt*180;p.x-=dt*42;if(p.y>550){p.y=-10;p.x=(p.x+223)%960}if(p.x<0)p.x=960}
}
function byIdSafe(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value}
function draw(){
 g.fillStyle="#0b1022";g.fillRect(0,0,960,540);
 g.save();g.translate(480,270);g.scale(camera.zoom,camera.zoom);g.translate(-camera.x,-camera.y);
 drawCity(g,{time:t,player,camera,districts:DISTRICTS,visited,cars,npcs,rain});
 g.restore();
 // Real minimap reflects world coordinates and mission markers.
 const x=827,y=58,w=106,h=61;
 g.fillStyle="#061224ce";g.fillRect(x,y,w,h);g.lineWidth=1;g.strokeStyle="#a6dddf94";g.strokeRect(x,y,w,h);
 for(const d of DISTRICTS){g.beginPath();g.arc(x+5+d.x/960*(w-10),y+5+d.y/540*(h-10),d.kind==="game"?3:2,0,2*Math.PI);g.fillStyle=d.kind==="planned"?"#c69bd3":"#89ead9";g.fill()}
 g.beginPath();g.arc(x+5+player.x/960*(w-10),y+5+player.y/540*(h-10),3.7,0,2*Math.PI);g.fillStyle="#ffe0a3";g.fill();
}
function loop(ms){const dt=Math.min(.045,Math.max(0,(ms-(last??ms))/1000));last=ms;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
