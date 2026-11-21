import * as THREE from "three";
import {STAGES,initialTour,operateStation,stationZ,nearStation,validateTour} from "./tour.mjs";

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const FAST=params.get("speed")==="fast";
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x030b16);
scene.fog=new THREE.FogExp2(0x07192a,.0085);
const renderer=new THREE.WebGLRenderer({canvas:$("view"),antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
const camera=new THREE.PerspectiveCamera(67,1,.09,260);
camera.position.set(0,2.3,13);
const ambient=new THREE.HemisphereLight(0x7dc5fa,0x253146,1.8);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffcaa0,1.4);sun.position.set(-6,16,7);scene.add(sun);
const floorMat=new THREE.MeshStandardMaterial({color:0x182c3b,metalness:.37,roughness:.65});
const panelMat=new THREE.MeshStandardMaterial({color:0x344859,metalness:.67,roughness:.32});
const pipeMat=new THREE.MeshStandardMaterial({color:0x435668,metalness:.72,roughness:.28});
const darkMat=new THREE.MeshStandardMaterial({color:0x071728,metalness:.42,roughness:.59});
const clearMat=new THREE.MeshPhysicalMaterial({color:0x23647f,metalness:.18,roughness:.18,transparent:true,opacity:.32,depthWrite:false});
const white=new THREE.MeshBasicMaterial({color:0xd8eff6});
const gold=new THREE.MeshBasicMaterial({color:0xffd7a0});
const floorGeo=new THREE.BoxGeometry(1,1,1),ringGeo=new THREE.TorusGeometry(1,.065,10,44);
const stageObjects=[],energy=[],particles=[];
const mainGroup=new THREE.Group();scene.add(mainGroup);
const glowing=color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.6,metalness:.15,roughness:.32});
const colorMat=color=>new THREE.MeshStandardMaterial({color,metalness:.5,roughness:.37});
const cube=(group,w,h,d,x,y,z,mat)=>{
 const mesh=new THREE.Mesh(floorGeo,mat);
 mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);return mesh;
};
const torus=(group,r,x,y,z,mat,rx=0)=>{
 const mesh=new THREE.Mesh(ringGeo,mat);mesh.position.set(x,y,z);mesh.scale.setScalar(r);
 mesh.rotation.x=rx;group.add(mesh);return mesh;
};
const bulb=(group,r,x,y,z,mat)=>{
 const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat);
 mesh.position.set(x,y,z);group.add(mesh);return mesh;
};
const cyl=(group,r1,r2,h,x,y,z,mat,segments=10)=>{
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);
 mesh.position.set(x,y,z);group.add(mesh);return mesh;
};
function sign(text,color){
 const c=document.createElement("canvas");c.width=768;c.height=160;const g=c.getContext("2d");
 g.fillStyle="#071624";g.fillRect(0,0,768,160);
 g.strokeStyle="#529a9c";g.lineWidth=4;g.strokeRect(5,5,758,150);
 g.font='900 47px system-ui,"Microsoft YaHei",sans-serif';g.fillStyle="#d9fff2";g.textAlign="center";g.textBaseline="middle";
 g.fillText(text,384,82,712);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
function buildStation(i,stage){
 const g=new THREE.Group();g.position.z=stationZ(i);g.name="STATION_"+stage.id;mainGroup.add(g);
 const c=stage.color,bright=glowing(c),accent=colorMat(c),emissive=new THREE.MeshBasicMaterial({color:c});
 const plane=cube(g,16,.18,10,0,-.02,0,floorMat);
 cube(g,12,.09,.25,0,.08,4.85,panelMat);
 cube(g,12,.09,.25,0,.08,-4.85,panelMat);
 for(const side of [-1,1]){
  cube(g,.32,6,9.8,side*7.8,3.0,0,darkMat);
  cube(g,.1,5.6,8.9,side*7.61,3,0,clearMat);
  for(let z=-4;z<=4;z+=2)cube(g,.2,6,.15,side*7.55,3,z,accent);
  cube(g,.26,.15,10,side*6.6,5.2,0,accent);
  cube(g,.18,.12,10,side*5.8,.18,0,emissive);
 }
 // The open-top miniature die sections remain visible and feel walk-through.
 for(let j=-3;j<=3;j++){
  cube(g,.11,.02,1.1,j*1.7,.09,0,panelMat);
 }
 const board=cube(g,5.8,1.14,.12,0,5.05,-4.4,sign((i+1)+" · "+stage.name,c));
 const frame=torus(g,1.9,0,2.8,-1.8,bright,0);
 const work=new THREE.Group();work.name="EXHIBIT_"+stage.id;work.position.set(0,0,-1.8);g.add(work);
 // Each unit has a unique internal model, not the same recycled mystery crystal.
 if(stage.id==="host"){
  cube(work,4.6,.4,2.1,0,.95,0,pipeMat);
  for(let j=0;j<5;j++)cube(work,.58,.85,.48,-1.5+j*.74,1.55,-.15,j===2?bright:panelMat);
  bulb(work,.46,0,2.3,0,bright);
 }else if(stage.id==="runtime"){
  for(let j=0;j<3;j++){
   const p=cube(work,1.15,1.8,.36,(j-1)*1.55,1.55,0,j===1?bright:panelMat);p.rotation.y=(j-1)*-.15;
  }
  torus(work,.85,0,2.15,.5,bright);
 }else if(stage.id==="bus"){
  for(let j=-2;j<=2;j++)cube(work,.22,.18,4,j*.8,1.05,.3,j===0?bright:pipeMat);
  for(let j=0;j<8;j++)bulb(work,.115,-1.6+j*.46,1.18,-1+Math.sin(j)*.04,bright);
 }else if(stage.id==="vram"){
  for(let j=0;j<5;j++){
   cube(work,.82,2.6,1.6,(j-2)*1.06,1.55,0,panelMat);
   for(let k=0;k<5;k++)cube(work,.49,.13,.12,(j-2)*1.06,.55+k*.47,.87,k===2?bright:darkMat);
  }
 }else if(stage.id==="l2"){
  for(let a=0;a<3;a++)for(let b=0;b<5;b++){
   cube(work,.74,.44,.7,(b-2)*.91,.82+a*.51,0,(a+b)%3===0?bright:panelMat);
  }
 }else if(stage.id==="sm"){
  for(let j=0;j<4;j++)cube(work,.95,2.8,1.3,(j-1.5)*1.28,1.55,0,j===1?bright:pipeMat);
  cube(work,5.6,.14,2.3,0,3.02,0,accent);
 }else if(stage.id==="warp"){
  for(let lane=0;lane<32;lane++){
   const x=((lane%8)-3.5)*.57,z=(Math.floor(lane/8)-1.5)*.57;
   const item=bulb(work,.2,x,1.1,z,lane%4===0?bright:accent);item.userData.lane=lane;particles.push({mesh:item,lane,stage:i});
  }
 }else if(stage.id==="register"){
  for(let j=0;j<12;j++)cube(work,.39,.45,.47,(j%6-2.5)*.72,.76+Math.floor(j/6)*.51,0,j%3===0?bright:panelMat);
  bulb(work,.45,0,2.55,0,bright);
 }else if(stage.id==="shared"){
  cube(work,4.8,.5,2,0,.8,0,pipeMat);
  for(let j=0;j<8;j++)cube(work,.44,.85,.58,(j-3.5)*.53,1.48,0,j%2===0?bright:panelMat);
  for(const x of [-2,2])cube(work,.11,2.1,.1,x,2.2,0,accent);
 }else if(stage.id==="alu"){
  for(let j=0;j<6;j++)cyl(work,.3,.4,2.2,(j-2.5)*.8,1.45,0,j%2===0?bright:panelMat);
  cube(work,5.6,.3,1.8,0,2.6,0,pipeMat);
  torus(work,1.5,0,2.65,0,bright,Math.PI/2);
 }else {
  for(let j=0;j<3;j++)cube(work,1.25,1.55,.6,(j-1)*1.5,1.4,0,j===1?bright:panelMat);
  bulb(work,.75,0,3.1,0,bright);
 }
 const indicator=bulb(g,.17,0,.55,3.9,bright);
 const light=new THREE.PointLight(c,2.4,12,2);light.position.set(0,3.8,-1);g.add(light);
 const routeMat=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.78});
 for(let step=0;step<5;step++){
  const arrow=cube(g,.35,.035,.6,0,.19,4-step*1.3,routeMat);
  arrow.rotation.y=Math.PI/4;
 }
 stageObjects.push({group:g,work,frame,indicator,light,bright,stage,activated:false,z:stationZ(i)});
}
STAGES.forEach((stage,i)=>buildStation(i,stage));
// Narrow continuous illuminated spine keeps the path legible between distinct rooms.
const length=STAGES.length*11;
cube(mainGroup,2,.13,length,0,-.14,(stationZ(0)+stationZ(STAGES.length-1))/2,floorMat);
for(const x of [-.91,.91])cube(mainGroup,.07,.04,length,x,.01,(stationZ(0)+stationZ(STAGES.length-1))/2,new THREE.MeshBasicMaterial({color:0x72cbd8}));
const starsGeom=new THREE.BufferGeometry(),starPos=[];
for(let i=0;i<300;i++){
 const t=(i*73.137)%300,z=-130+(i*19.1)%159;
 starPos.push(Math.cos(t)*45,5+(i*17.3)%35,z);
}
starsGeom.setAttribute("position",new THREE.Float32BufferAttribute(starPos,3));
scene.add(new THREE.Points(starsGeom,new THREE.PointsMaterial({color:0x81bbcc,size:.18,transparent:true,opacity:.5,depthWrite:false})));

let state=initialTour(),started=false,guide=true,yaw=0,clock=0,locked=false,truthVisible=false,drag=null;
const keys=new Set(),touch=new Set();
try{
 const saved=JSON.parse(localStorage.getItem("gpu-uncooked.microverse.v1")||"null");
 if(saved){validateTour(saved);state=saved;}
}catch{state=initialTour()}
const stops=$("stops");
STAGES.forEach((s,i)=>{
 const li=document.createElement("li");li.textContent=String(i+1).padStart(2,"0")+" · "+s.short;li.id="stop-"+i;stops.append(li);
});
function save(){
 try{localStorage.setItem("gpu-uncooked.microverse.v1",JSON.stringify(state));}catch{}
}
function targetZ(){return stationZ(state.index)+3.2}
function canAct(){return started&&!state.complete&&nearStation(camera.position.z,state.index,5.7);}
function redraw(){
 const st=STAGES[state.index];
 $("progress").textContent=state.seen.length+" / "+STAGES.length;
 $("step").textContent="第 "+(state.index+1)+" 站 · "+(st.kind==="software"?"软件":st.kind==="interface"?"连接通道":"GPU 内部");
 $("place").textContent=st.name;$("question").textContent=st.question;
 $("story").textContent=st.story;$("truth").textContent="真实原理： "+st.truth;
 $("truth").hidden=!truthVisible;
 $("operate").textContent=st.action+" · E";
 $("operate").disabled=!canAct();
 $("walk").textContent=guide?"正在带你走 · 点击自由行走":"带我走到设备";
 $("prompt").textContent=canAct()?"你已经走到设备旁。按 E，让它工作。":"跟着发光路线走，或点击「带我走到设备」。";
 STAGES.forEach((s,i)=>{
  const li=$("stop-"+i);li.className=i<state.seen.length?"done":i===state.index?"current":"";
  stageObjects[i].activated=i<state.seen.length;
  stageObjects[i].indicator.scale.setScalar(i===state.index?2.0:1);
  stageObjects[i].light.intensity=i===state.index?4.8:i<state.seen.length?2.6:1.1;
 });
 document.documentElement.dataset.microverseIndex=String(state.index);
 document.documentElement.dataset.microverseProgress=String(state.seen.length);
 document.documentElement.dataset.microverseComplete=String(state.complete);
 window.__MICROVERSE_DIAGNOSTICS={renderedStations:stageObjects.length,progress:state.seen.length,current:st.id,
  cameraZ:camera.position.z,stageIsNear:nearStation(camera.position.z,state.index,5.7),
  independentHardware:false,model:"Educational software/hardware spatial analogy, not literal floorplan"};
 if(state.complete){$("done").hidden=false;guide=false}
}
function spawnFlow(stage){
 const start=stage.z+.5;
 for(let i=0;i<16;i++){
  const mesh=bulb(scene,.095,Math.sin(i*2.399)*.65,1.15+(i%4)*.32,start,stage.bright);
  energy.push({mesh,start:start+(i/16)*2,phase:(i/16),z:stage.z-2.3,age:0});
 }
}
function operate(){
 if(!canAct())return false;
 const old=state.index;
 const next=operateStation(state);
 if(next===state)return false;
 spawnFlow(stageObjects[old]);
 stageObjects[old].work.rotation.y=.1;
 state=next;truthVisible=false;save();
 if(!state.complete)guide=true;
 redraw();return true;
}
$("operate").addEventListener("click",operate);
$("walk").addEventListener("click",()=>{guide=!guide;redraw()});
$("show-truth").addEventListener("click",()=>{truthVisible=!truthVisible;redraw()});
$("begin").addEventListener("click",()=>{
 started=true;$("start").hidden=true;
 if(state.complete){$("done").hidden=false;return}
 guide=true;redraw();$("view").focus();
});
$("again").addEventListener("click",()=>{
 state=initialTour();camera.position.set(0,2.3,13);guide=true;truthVisible=false;
 $("done").hidden=true;$("start").hidden=true;started=true;
 save();redraw();
});
document.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(["arrowup","arrowdown"," ","w","s","a","d","e"].includes(k))e.preventDefault();
 if(k==="e"&&!e.repeat)operate();
 if(k==="g"&&!e.repeat){guide=!guide;redraw()}
 keys.add(k);
});
document.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>{keys.clear();touch.clear()});
for(const [id,key] of [["forward","w"],["back","s"]]){
 const b=$(id);
 b.addEventListener("pointerdown",e=>{e.preventDefault();touch.add(key);b.setPointerCapture(e.pointerId)});
 for(const event of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(event,()=>touch.delete(key));
}
const canvas=$("view");
canvas.addEventListener("pointerdown",e=>{
 drag=e.clientX;canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(drag===null)return;
 yaw=Math.max(-.95,Math.min(.95,yaw-(e.clientX-drag)*.003));
 drag=e.clientX;
});
for(const event of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(event,()=>drag=null);
function resize(){
 const width=innerWidth,height=innerHeight;
 renderer.setSize(width,height,false);camera.aspect=width/height;
 camera.fov=width<height?79:65;camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);resize();
renderer.render(scene,camera);
document.documentElement.dataset.microverseReady="true";
$("loading").hidden=true;
redraw();
let prev=0,frames=0;
function frame(now){
 const dt=Math.min(.08,(now-prev)/1000||0);prev=now;clock+=dt;
 if(started&&!state.complete){
  const moveForward=keys.has("w")||keys.has("arrowup")||touch.has("w");
  const moveBackward=keys.has("s")||keys.has("arrowdown")||touch.has("s");
  if(moveForward||moveBackward){
   guide=false;
   const direction=Number(moveForward)-Number(moveBackward);
   camera.position.z-=direction*dt*(FAST?45:7);
   camera.position.x=Math.max(-2,Math.min(2,camera.position.x));
  }else if(guide){
   const destination=targetZ(),dist=destination-camera.position.z;
   const step=Math.sign(dist)*Math.min(Math.abs(dist),dt*(FAST?115:12));
   camera.position.z+=step;
  }
  camera.position.z=Math.max(stationZ(STAGES.length-1)-2,Math.min(15,camera.position.z));
  if(frames%8===0)redraw();
 }
 // Hallway is a schematic, not a physical floorplan. Every exhibit can run locally.
 for(const [i,s] of stageObjects.entries()){
  s.frame.rotation.z=clock*.19+i*.15;
  s.work.rotation.y=Math.sin(clock*.5+i)*.075;
  s.indicator.position.y=.55+Math.sin(clock*2.8+i)*.08;
 }
 for(const p of particles){
  if(p.stage===6)p.mesh.position.y=1.1+Math.sin(clock*3.6+p.lane*.6)*.12;
 }
 for(let i=energy.length-1;i>=0;i--){
  const p=energy[i];p.age+=dt;
  p.mesh.position.z=p.start-p.age*10;
  p.mesh.position.y=1.5+Math.sin(clock*5+p.phase*7)*.3;
  p.mesh.material.emissiveIntensity=1.5+Math.sin(clock*4+p.phase)*.6;
  if(p.age>1.4){scene.remove(p.mesh);p.mesh.geometry.dispose();energy.splice(i,1)}
 }
 camera.lookAt(camera.position.x+Math.sin(yaw)*9,2.05,camera.position.z-Math.cos(yaw)*9);
 renderer.render(scene,camera);frames++;
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
