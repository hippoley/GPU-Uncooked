import {START,DISTRICTS,advance,nearestMission,missionLink} from "./logic.mjs";
const $=id=>document.getElementById(id),canvas=$("viewport"),wrap=$("game");
let running=false,overlay="intro",orbit=0,pressed=new Set(),last=0,elapsed=0,discovered=new Set();
let pos={...START},third=null,world=null,renderer=null,camera=null;
const directions={forward:["w","arrowup","up"],backward:["s","arrowdown","down"],left:["a","arrowleft","left"],right:["d","arrowright","right"]};
const active=(dir)=>directions[dir].some(k=>pressed.has(k));
function error(message){$("loading").hidden=false;$("error").textContent=message;$("loading").style.background="#191326"}
function setObjective(title,desc){$("mission").textContent=title;$("hint").textContent=desc}
function closeMission(){$("dialog").hidden=true;overlay="roam";pressed.clear()}
function showMission(d){
 overlay="mission";pressed.clear();
 $("dialog-kicker").textContent=d.kind==="game"?"PLAYABLE 3D CITY MISSION":d.kind==="lab"?"CUDA INTERACTIVE LAB":"COMING SOON · CONCEPT DISTRICT";
 $("dialog-title").textContent=d.name;
 $("dialog-description").textContent=d.kind==="planned"?"这个区域正在建设。它将是原创、独立玩法的 CUDA 游戏，而不是重复的选关面板。":
 d.kind==="game"?"进入已存在的 Memory Abyss 深海冒险。这是城市与独立 CUDA 游戏的真实跳转，深海关卡本身仍是 2D 游戏。":
 "打开现有 CUDA 实验室。独立游戏版本还在开发中，这里只标注已可操作的学习内容。";
 const actions=$("dialog-actions");actions.replaceChildren();
 if(missionLink(d)){const a=document.createElement("a");a.className="link";a.href=missionLink(d);a.textContent=d.kind==="game"?"开始游戏 →":"进入实验室 →";actions.append(a)}
 const b=document.createElement("button");b.className="alt";b.textContent="返回城市";b.onclick=closeMission;actions.append(b);
 $("dialog").hidden=false;
 discovered.add(d.id);$("discovered").textContent="DISCOVERED "+discovered.size+" / 6";
}
function interact(){if(overlay!=="roam")return;const d=nearestMission(pos);if(d)showMission(d)}
$("interact").addEventListener("click",interact);
$("start").addEventListener("click",()=>{overlay="roam";$("intro").hidden=true;canvas.focus()});
document.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();if(k.startsWith("arrow")||k===" ")e.preventDefault();
 if(k==="escape"&&overlay==="mission")closeMission();
 if(k==="e"&&!e.repeat)interact();
 pressed.add(k);
});document.addEventListener("keyup",e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>pressed.clear());
for(const button of document.querySelectorAll("[data-key]")){
 const key=button.dataset.key;
 button.addEventListener("pointerdown",e=>{e.preventDefault();pressed.add(key);button.setPointerCapture?.(e.pointerId)});
 for(const ev of ["pointerup","pointercancel","pointerleave","lostpointercapture"])button.addEventListener(ev,()=>pressed.delete(key));
}
$("camera").addEventListener("click",()=>orbit+=Math.PI/3);
let drag=null;canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){drag=e.clientX;canvas.setPointerCapture?.(e.pointerId)}});
canvas.addEventListener("pointermove",e=>{if(drag!==null){orbit-=(e.clientX-drag)*.006;drag=e.clientX}});
for(const ev of ["pointerup","pointercancel","pointerleave"])canvas.addEventListener(ev,()=>{drag=null});
const fallbackTimeout=setTimeout(()=>{if(!running)error("三维引擎加载未成功。请检查是否能访问 jsDelivr、浏览器 WebGL 是否开启。现有 2D 游戏和 CUDA 实验仍可从章节首页访问。")},14000);
function resize(){if(!renderer||!camera)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
try{
 // Load Three.js as an ESM package pinned in the HTML import map.
 const {THREE,scene,root,player,...rest}=await import("./world.mjs").then(m=>{const w=m.createWorld();return {...w,THREE:w.THREE}});
 world={scene,root,player,...rest,THREE};
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.setSize(wrap.clientWidth,wrap.clientHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 camera=new THREE.PerspectiveCamera(61,wrap.clientWidth/wrap.clientHeight,.1,260);
 const target=new THREE.Vector3(pos.x,3,pos.z),camPoint=new THREE.Vector3(pos.x+17,12,pos.z+23);
 camera.position.copy(camPoint);camera.lookAt(target);
 window.addEventListener("resize",resize);resize();
 renderer.render(scene,camera);
 running=true;clearTimeout(fallbackTimeout);$("loading").hidden=true;document.documentElement.dataset.city3dReady="true";
 let frames=0,lastPerf=0;
 function frame(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;elapsed+=dt;
  if(overlay==="roam"){
   const dx=Number(active("right"))-Number(active("left"));
   const forward=Number(active("forward"))-Number(active("backward"));
   const old=pos;pos=advance(pos,{forward,right:dx},dt,11);
   const mx=pos.x-old.x,mz=pos.z-old.z,v=Math.hypot(mx,mz)/Math.max(dt,.0001);
   if(v>.01)world.player.root.rotation.y=Math.atan2(mx,-mz);
   world.walk(elapsed,v);
   world.player.root.position.set(pos.x,0,pos.z);
   const d=nearestMission(pos);
   setObjective(d?d.label:"夜游 Silicon City",d?(d.kind==="planned"?"尚未开放 · 按 E 查看计划":d.kind==="game"?"按 E 进入深海冒险":"按 E 进入 CUDA 实验"):"靠近发光的立体任务光柱，按 E 互动");
   $("prompt").textContent=d?"E · "+d.name:"EXPLORE THE CITY";
  }
  world.update(elapsed,dt);
  const look=new THREE.Vector3(pos.x,2.6,pos.z);
  const desired=new THREE.Vector3(pos.x+Math.sin(orbit+.6)*23,12.5,pos.z+Math.cos(orbit+.6)*23);
  const alpha=1-Math.exp(-dt*4.7);
  camera.position.lerp(desired,alpha);
  camera.lookAt(look);
  renderer.render(scene,camera);frames++;
  if(now-lastPerf>1500){$("perf").textContent="SILICON CITY · 3D WEBGL · "+Math.round(frames*1000/(now-lastPerf||1))+" FPS (browser)";frames=0;lastPerf=now}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(e){clearTimeout(fallbackTimeout);error("3D 初始化失败： "+(e?.message||"浏览器不支持或资源加载失败")+"。请检查 WebGL 与 jsDelivr 网络访问。");document.documentElement.dataset.city3dReady="false";}
