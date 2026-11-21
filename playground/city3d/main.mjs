import {START,DISTRICTS,advance,nearestMission,missionLink} from "./logic.mjs";
const $=id=>document.getElementById(id),canvas=$("viewport"),wrap=$("game");
const requestedQuality=new URLSearchParams(location.search).get("quality");
const sceneQuality=["low","medium","high"].includes(requestedQuality)?requestedQuality:"medium";
document.documentElement.dataset.sceneQuality=sceneQuality;
let running=false,overlay="intro",orbit=0,viewMode="third",pressed=new Set(),last=0,elapsed=0,discovered=new Set();
let pos={...START},third=null,world=null,renderer=null,camera=null;
const fixedCornerShot=new URLSearchParams(location.search).get("shot")==="corner";
if(fixedCornerShot){pos={x:-23,z:-17};orbit=.38;}
document.documentElement.dataset.cornerShot=String(fixedCornerShot);
if(new URLSearchParams(location.search).get("photo")==="1")document.body.classList.add("photo-mode");
document.addEventListener("keydown",e=>{
 if(e.key.toLowerCase()==="p"&&!e.repeat&&!e.ctrlKey&&!e.metaKey){
  document.body.classList.toggle("photo-mode");
 }
});
const directions={forward:["w","arrowup","up"],backward:["s","arrowdown","down"],left:["a","arrowleft","left"],right:["d","arrowright","right"]};
const active=(dir)=>directions[dir].some(k=>pressed.has(k));
function error(message){$("loading").hidden=false;$("error").textContent=message;$("loading").style.background="#191326"}
function setObjective(title,desc){$("mission").textContent=title;$("hint").textContent=desc}
function closeMission(){$("dialog").hidden=true;overlay="roam";pressed.clear()}
function showMission(d){
 overlay="mission";pressed.clear();
 $("dialog-kicker").textContent=d.kind==="game"?"PLAYABLE 3D CITY MISSION":d.kind==="lab"?"CUDA INTERACTIVE LAB":"COMING SOON · CONCEPT DISTRICT";
 $("dialog-title").textContent=d.name;
 let freight=null;
 try{freight=JSON.parse(localStorage.getItem("gpu-uncooked.freight.v1")||"null")}catch{}
 $("dialog-description").textContent=d.id==="factory"?
  (freight?.completed?"你已经完成港口 3 份物流委托，获得 "+freight.credits+" credits。整座城市保留了你完成过的行动证据。可再次挑战，或进入 CUDA 实验室。":
  "真正可玩的港口物流任务现已开放：亲自交换 128 个货箱的装载位置，影响 32 线程访问的内存扇区数量，完成三份委托后回到 CUDA Lab 验证。"):
 d.kind==="planned"?"这个区域正在建设。它将是原创、独立玩法的 CUDA 游戏，而不是重复的选关面板。":
 d.kind==="game"?"进入已存在的 Memory Abyss 深海冒险。这是城市与独立 CUDA 游戏的真实跳转，深海关卡本身仍是 2D 游戏。":
 "打开现有 CUDA 实验室。独立游戏版本还在开发中，这里只标注已可操作的学习内容。";
 const actions=$("dialog-actions");actions.replaceChildren();
 if(d.id==="factory"){
  const play=document.createElement("a");play.className="link";play.href="../freight/index.html";
  play.textContent="▶ 开始港口物流任务";actions.append(play);
 }
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
function toggleView(){
 viewMode=viewMode==="third"?"first":"third";
 $("viewmode").textContent=viewMode==="first"?"V · 第一人称":"V · 第三人称";
 if(world)world.player.root.visible=viewMode==="third";
}
$("viewmode").addEventListener("click",toggleView);
document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="v"&&!e.repeat)toggleView()});
let drag=null;canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){drag=e.clientX;canvas.setPointerCapture?.(e.pointerId)}});
canvas.addEventListener("pointermove",e=>{if(drag!==null){orbit-=(e.clientX-drag)*.006;drag=e.clientX}});
for(const ev of ["pointerup","pointercancel","pointerleave"])canvas.addEventListener(ev,()=>{drag=null});
const fallbackTimeout=setTimeout(()=>{if(!running)error("三维引擎加载未成功。请检查是否能访问 jsDelivr、浏览器 WebGL 是否开启。现有 2D 游戏和 CUDA 实验仍可从章节首页访问。")},14000);
function resize(){if(!renderer||!camera)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=h>w?84:68;camera.updateProjectionMatrix()}
try{
 // Load Three.js as an ESM package pinned in the HTML import map.
 const {THREE,scene,root,player,...rest}=await import("./world.mjs").then(m=>{const w=m.createWorld({quality:sceneQuality});return {...w,THREE:w.THREE}});
 world={scene,root,player,...rest,THREE};
 // Successful calculation changes the district's physical marker when the player returns.
 try{
  const receipt=JSON.parse(localStorage.getItem("gpu-uncooked.freight.v1")||"null");
  if(receipt?.completed===true&&Number.isFinite(receipt.credits)){
   const factory=world.markers?.find(m=>m.d.id==="factory");
   if(factory){
    factory.gem.material=new THREE.MeshStandardMaterial({color:0xffdc92,emissive:0xff9d4d,emissiveIntensity:1.8});
    factory.ring.material=new THREE.MeshBasicMaterial({color:0xffd783});
    factory.group.scale.setScalar(1.26);
   }
   $("discovered").textContent="FREIGHT CLEARED · "+receipt.credits+" CREDITS";
   document.documentElement.dataset.freightCleared="true";
  }
 }catch{ /* leave city usable if local storage unavailable */ }
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.15));
 renderer.setSize(wrap.clientWidth,wrap.clientHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 camera=new THREE.PerspectiveCamera(61,wrap.clientWidth/wrap.clientHeight,.1,260);
 const target=new THREE.Vector3(pos.x,1.55,pos.z),camPoint=new THREE.Vector3(pos.x+6,4.6,pos.z+7);
 camera.position.copy(camPoint);camera.lookAt(target);
 window.addEventListener("resize",resize);resize();
 renderer.render(scene,camera);
 window.__CITY3D_DIAGNOSTICS={
  webgl:true,
  drawCalls:renderer.info.render.calls,
  triangles:renderer.info.render.triangles,
  geometries:renderer.info.memory.geometries,
  textures:renderer.info.memory.textures,
  proceduralMaterials:true,
  quality:sceneQuality,
  cornerProps:world.closeup?.metrics.authoredProps??0,
  cornerBatchCalls:world.closeup?.metrics.instancedDrawCalls??0,
  facadeWindows:world.coherentArchitecture?.metrics.windowCount??0,
  facadeInstancedBatches:world.coherentArchitecture?.metrics.instancedBatches??0,
  facadeGeometryPieces:world.coherentArchitecture?.metrics.geometryPieces??0,
  filmicDistantBuildings:world.filmic?.metrics.distantBuildings??0,
  filmicInstanceBatches:world.filmic?.metrics.instancedBatches??0,
  filmicLocalizedLights:world.filmic?.metrics.localizedLights??0,
  filmicParticleCount:world.filmic?.metrics.particles??0,
  disclaimer:"WebGL calls and software-renderer FPS are not proof of GTA VI-level fidelity or real GPU performance."
 };
 running=true;clearTimeout(fallbackTimeout);$("loading").hidden=true;document.documentElement.dataset.city3dReady="true";
 let frames=0,lastPerf=0;
 function frame(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;elapsed+=dt;
  if(overlay==="roam"){
   const dx=Number(active("right"))-Number(active("left"));
   const forward=Number(active("forward"))-Number(active("backward"));
   const old=pos;
   const heading=orbit+.6;
   const axes=viewMode==="first"?
    {forward:forward*Math.cos(heading)+dx*Math.sin(heading),
     right:dx*Math.cos(heading)-forward*Math.sin(heading)}:
    {forward,right:dx};
   pos=advance(pos,axes,dt,11);
   const mx=pos.x-old.x,mz=pos.z-old.z,v=Math.hypot(mx,mz)/Math.max(dt,.0001);
   if(v>.01)world.player.root.rotation.y=Math.atan2(mx,-mz);
   world.walk(elapsed,v);
   world.player.root.position.set(pos.x,0,pos.z);
   const d=nearestMission(pos);
   setObjective(d?d.label:"夜游 Silicon City",d?(d.kind==="planned"?"尚未开放 · 按 E 查看计划":d.kind==="game"?"按 E 进入深海冒险":"按 E 进入 CUDA 实验"):"靠近发光的立体任务光柱，按 E 互动");
   $("prompt").textContent=d?"E · "+d.name:"EXPLORE THE CITY";
  }
  world.update(elapsed,dt);
  const look=new THREE.Vector3(pos.x,1.55,pos.z);
  const portrait=wrap.clientHeight>wrap.clientWidth;
  const radius=portrait?12:8.5,altitude=portrait?6.7:4.6;
  const alpha=1-Math.exp(-dt*4.7);
  if(viewMode==="first"){
   const desired=new THREE.Vector3(pos.x,1.72,pos.z);
   camera.position.lerp(desired,alpha);
   camera.lookAt(new THREE.Vector3(pos.x-Math.sin(orbit+.6)*17,1.72,pos.z-Math.cos(orbit+.6)*17));
  }else{
   const desired=new THREE.Vector3(pos.x+Math.sin(orbit+.6)*radius,altitude,pos.z+Math.cos(orbit+.6)*radius);
   camera.position.lerp(desired,alpha);
   camera.lookAt(look);
  }
  renderer.render(scene,camera);frames++;
  if(now-lastPerf>1500){$("perf").textContent="SILICON CITY · 3D WEBGL · "+Math.round(frames*1000/(now-lastPerf||1))+" FPS (browser)";frames=0;lastPerf=now}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(e){clearTimeout(fallbackTimeout);error("3D 初始化失败： "+(e?.message||"浏览器不支持或资源加载失败")+"。请检查 WebGL 与 jsDelivr 网络访问。");document.documentElement.dataset.city3dReady="false";}
