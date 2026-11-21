import * as THREE from "three";
import {LANE_COUNT,INPUT_COUNT,STEPS,initialSnapshot,kernelGather,sourceForStride,transition} from "./physics.mjs";
import {buildDerivedEvidence,describeWorldObject,measurementState} from "./evidence.mjs";
import {parseReceiptView} from "./receipt-view.mjs";
import {traceGather,compareGatherStrides,TRACE_PHASES,phaseExplanation} from "./instruction-microscope.mjs";

// Industrial material visual language: ceramic substrate, milled copper, satin metal,
// glass passivation and address-bearing silicon cells. Not a literal GPU die floorplan.
const $=id=>document.getElementById(id),canvas=$("view");
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080e15);
scene.fog=new THREE.FogExp2(0x090f17,.021);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.58;
const camera=new THREE.PerspectiveCamera(44,1,.1,160);
const center=new THREE.Vector3(0,.65,0),focus=new THREE.Vector3(0,.65,0);
let radius=33,theta=.2,phi=1.08,held=false,lastPointer=null,elapsed=0;
const targetAngles={source:{theta:.12,phi:.98,radius:31,point:[4,.6,-1]},dispatch:{theta:-.26,phi:1.13,radius:23,point:[-7,.5,-.2]},memory:{theta:.48,phi:.95,radius:23,point:[7,.5,-.2]},result:{theta:0,phi:.92,radius:30,point:[0,.5,0]}};
function surfaceTexture(){
 const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");
 g.fillStyle="#263338";g.fillRect(0,0,256,256);
 // Repeatable non-random composite grain, tiny scoring and subtle circuit substrate.
 for(let y=0;y<256;y+=2)for(let x=0;x<256;x+=2){
  const n=(Math.sin(x*53.12+y*31.73)*36793.13)%1;
  g.fillStyle=n>.4?"#53606a18":"#080d101a";g.fillRect(x,y,2,2);
 }
 g.lineWidth=.4;
 for(let k=0;k<80;k++){
  const v=(k*49.31)%256;
  g.strokeStyle=k%2?"#b6c6c10a":"#07101418";
  g.beginPath();g.moveTo(v,0);g.lineTo((v+42)%256,256);g.stroke();
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(5,3);
 return tex;
}
const pcb=new THREE.MeshStandardMaterial({color:0x617076,map:surfaceTexture(),metalness:.28,roughness:.66});
const copper=new THREE.MeshStandardMaterial({color:0xac7752,metalness:.91,roughness:.24});
const brushed=new THREE.MeshStandardMaterial({color:0x667781,metalness:.85,roughness:.39});
const titanium=new THREE.MeshStandardMaterial({color:0x495a63,metalness:.76,roughness:.4});
const ceramic=new THREE.MeshStandardMaterial({color:0x6d7681,metalness:.27,roughness:.72});
const wafer=new THREE.MeshPhysicalMaterial({color:0x40616a,metalness:.46,roughness:.27,clearcoat:1,clearcoatRoughness:.12});
const glass=new THREE.MeshPhysicalMaterial({color:0x6995a1,metalness:.12,roughness:.16,transparent:true,opacity:.19,depthWrite:false});
const orangeGlow=new THREE.MeshBasicMaterial({color:0xffb677});
const cyanGlow=new THREE.MeshBasicMaterial({color:0x59d9d2});
const offGlow=new THREE.MeshStandardMaterial({color:0x43545a,metalness:.7,roughness:.29,emissive:0x0a1a1c,emissiveIntensity:.4});
const warmLit=new THREE.MeshStandardMaterial({color:0xd2b087,metalness:.56,roughness:.27,emissive:0xc0793b,emissiveIntensity:.8});
const coolLit=new THREE.MeshStandardMaterial({color:0x7dc8c7,metalness:.47,roughness:.25,emissive:0x2da8a6,emissiveIntensity:1.0});
const walls=new THREE.MeshStandardMaterial({color:0x121e2a,metalness:.18,roughness:.84});
function mesh(g,mat,x,y,z,root=scene){
 const object=new THREE.Mesh(g,mat);object.position.set(x,y,z);root.add(object);return object;
}
const box=(w,h,d,mat,x,y,z,root)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,root);
const tube=(pts,r,mat,root=scene)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(8,pts.length*6),r,7,false),mat,0,0,0,root);
function label(text,w=512,h=128,tint="#b5dcd8"){
 const c=document.createElement("canvas");c.width=w;c.height=h;
 const g=c.getContext("2d");g.fillStyle="#0c1822";g.fillRect(0,0,w,h);
 g.strokeStyle="#6c8d94";g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);
 g.fillStyle=tint;g.font="700 32px ui-monospace,Consolas,monospace";
 g.textAlign="center";g.textBaseline="middle";g.fillText(text,w/2,h/2,w-30);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:tex});
}
function sign(text,x,y,z,w=5,h=1.0){
 const s=mesh(new THREE.PlaneGeometry(w,h),label(text),x,y,z);s.rotation.x=-Math.PI/2;return s;
}
function bolt(x,z){
 const cylinder=mesh(new THREE.CylinderGeometry(.14,.14,.08,16),brushed,x,.47,z);
 const head=mesh(new THREE.BoxGeometry(.14,.015,.025),titanium,x,.52,z);
 return [cylinder,head];
}
// A closed studio and macro-photography lighting, not fantasy neon city.
box(31,.48,19,pcb,0,0,0);
box(31,.28,.16,copper,0,.20,-9.47);
box(31,.28,.16,copper,0,.20,9.47);
box(.18,.34,19,copper,-15.43,.20,0);
box(.18,.34,19,copper,15.43,.20,0);
for(const x of [-14,14])for(const z of [-8.1,8.1])bolt(x,z);
box(32,.12,19.6,titanium,0,-.40,0);
box(40,.06,31,walls,0,-.75,0);
const ledGeo=new THREE.CylinderGeometry(.08,.08,.06,8);
for(let i=0;i<22;i++){
 mesh(ledGeo,i%3===0?orangeGlow:offGlow,-14.5+i*1.35,.28,-8.88);
}
scene.add(new THREE.HemisphereLight(0xb8d4d4,0x30434d,2.1));
const key=new THREE.DirectionalLight(0xfff0d5,4.6);key.position.set(-12,20,16);scene.add(key);
const edge=new THREE.DirectionalLight(0x7ad4e9,2.55);edge.position.set(12,9,-13);scene.add(edge);
const spot=new THREE.SpotLight(0xffdfb7,170,43,.76,.64,1.3);spot.position.set(0,22,12);spot.target.position.set(0,0,0);scene.add(spot,spot.target);
const boardLight=new THREE.PointLight(0x6dbdb5,7,18,2);boardLight.position.set(6,4,0);scene.add(boardLight);

// Left: register/warp launch panel. 32 independent lane sockets in one visible group.
const laneObjects=[],lanePositions=[];
box(11,.34,13,titanium,-7.8,.48,0);
box(10.3,.14,12.3,copper,-7.8,.72,0);
box(9.7,.19,11.8,wafer,-7.8,.83,0);
sign("32 THREAD LANES / WARP", -7.8,1.01,-5.15,7.6,.71);
for(let lane=0;lane<LANE_COUNT;lane++){
 const col=lane%8,row=Math.floor(lane/8),x=-11.65+col*1.1,z=-2.75+row*1.75;
 const well=mesh(new THREE.CylinderGeometry(.45,.45,.16,20),brushed,x,.99,z);
 const chip=box(.57,.18,.58,offGlow,x,1.14,z);
 const trace=box(.10,.05,.79,copper,x,1.02,z+.76);
 const pad=mesh(new THREE.CylinderGeometry(.11,.11,.07,14),warmLit,x,1.09,z+.97);
 chip.userData.lane=lane;laneObjects.push(chip);lanePositions.push(new THREE.Vector3(x,1.25,z));
 if(col<7)box(.08,.036,1.55,copper,x+.53,.92,z-.05);
}
// Center: a routed conductive fabric visually connects 32 request sources to a
// memory tile grid. It is an explanatory topology, NOT literal silicon wiring.
for(let i=0;i<13;i++){
 const z=-5.2+i*.86;
 tube([new THREE.Vector3(-1.92,.55,z),new THREE.Vector3(0,.51,z),
  new THREE.Vector3(1.8,.55,z)],.037,copper);
}
box(2.75,.18,12.7,titanium,0,.4,0);
box(2.55,.04,11.9,brushed,0,.52,0);
sign("ADDRESS FABRIC",0,.59,-4.65,2.22,.62);

// Right: 256 actual input float32 slots, grouped in contiguous eight-float,
// 32-byte sector blocks. Here cells have an address, index and underlying value.
const cellObjects=[],cellPositions=[];
box(11.5,.30,13,titanium,8,.45,0);
box(10.9,.12,12.4,copper,8,.68,0);
box(10.4,.14,11.9,wafer,8,.8,0);
sign("DEVICE DATA / FLOAT32[256]",8,.96,-5.48,9.1,.68);
for(let index=0;index<INPUT_COUNT;index++){
 const col=index%16,row=Math.floor(index/16);
 const x=3.45+col*.61,z=-4.6+row*.56;
 // Microscopic address-bearing array slots; 8 consecutive slots = one sector.
 const cell=box(.49,.10,.42,offGlow,x,.99,z);
 const pin=box(.19,.03,.34,copper,x,1.051,z);
 cell.userData.index=index;cellObjects.push(cell);
 cellPositions.push(new THREE.Vector3(x,1.12,z));
}
for(let sector=0;sector<32;sector++){
 const row=Math.floor(sector/2),side=sector%2;
 const x=side===0?5.52:10.4,z=-4.60+row*.56;
 box(.07,.025,.44,copper,x,.9,z);
}
const acrylic=box(10.9,.09,12.0,glass,8,1.47,0);
const dramLeft=box(10.4,.26,.23,brushed,8,.98,-6.03);
const dramRight=box(10.4,.26,.23,brushed,8,.98,6.03);
// Contact pads are physically distinguishable from logical float32 data cells.
for(let i=0;i<24;i++){
 box(.31,.06,.48,copper,3.5+i*.39,.52,6.25);
}
const rays=[];
const rayMat=new THREE.LineBasicMaterial({color:0xf2bc83,transparent:true,opacity:.62});
const packetGeo=new THREE.SphereGeometry(.14,12,10);
const packetMaterials=[orangeGlow,cyanGlow];
let selectedPath=null,selectedPacket=null;
const detailCanvas=document.createElement("canvas");detailCanvas.width=768;detailCanvas.height=180;
const detailContext=detailCanvas.getContext("2d");
const detailTexture=new THREE.CanvasTexture(detailCanvas);detailTexture.colorSpace=THREE.SRGBColorSpace;
const physicalReadout=mesh(new THREE.PlaneGeometry(4.15,.98),
 new THREE.MeshBasicMaterial({map:detailTexture,transparent:true,depthWrite:false}),8,2.5,0);
physicalReadout.rotation.x=-.36;
function updatePhysicalReadout(lane){
 detailContext.clearRect(0,0,768,180);
 detailContext.fillStyle="#0e2430e6";detailContext.fillRect(0,0,768,180);
 detailContext.strokeStyle="#b78b61";detailContext.lineWidth=5;
 detailContext.strokeRect(4,4,760,172);
 detailContext.fillStyle="#e9dbbd";detailContext.font="bold 49px ui-monospace,monospace";
 detailContext.textAlign="center";detailContext.fillText("src["+lane.index+"] = "+lane.value.toFixed(2),384,79);
 detailContext.fillStyle="#8cbbbd";detailContext.font="30px ui-monospace,monospace";
 detailContext.fillText("BYTE "+lane.byteAddress+"   SECTOR "+lane.sector,384,131);
 detailTexture.needsUpdate=true;
 const pos=cellPositions[lane.index];
 physicalReadout.position.set(pos.x,2.35,pos.z+.75);
}
let state=initialSnapshot(),model=kernelGather({stride:state.stride});
let cameraPos=new THREE.Vector3(0,17,21),angleX=0,angleY=0,drag=null,zoom=1,frames=0,nowClock=0;
const cameraFocus=new THREE.Vector3(0,0,0);
const views={
 source:{offset:[0,17,21],focus:[0,0,0]},
 dispatch:{offset:[-1.3,8.2,11],focus:[-7.8,.8,0]},
 memory:{offset:[1.2,8.2,10.7],focus:[8,1,0]},
 result:{offset:[0,15,19],focus:[0,.4,0]}
};
function setView(step,snap=false){
 const pose=views[step];
 if(!pose)throw new RangeError("Unknown camera view");
 cameraPos.set(...pose.offset);
 cameraFocus.set(...pose.focus);
 if(snap){
  camera.position.copy(cameraPos).add(cameraFocus);
  camera.lookAt(cameraFocus);
 }
}
function lineForLane(lane){
 const address=model.lanes[lane];
 const start=lanePositions[lane],end=cellPositions[address.index];
 const p1=start.clone().add(new THREE.Vector3(1.0,.6,0));
 const p2=end.clone().add(new THREE.Vector3(-1.0,.6,0));
 return [start,p1,p2,end];
}
function updateLinks(){
 if(selectedPath){scene.remove(selectedPath);selectedPath.geometry.dispose();}
 if(selectedPacket){scene.remove(selectedPacket);}
 const positions=lineForLane(state.selectedLane);
 const geometry=new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(positions).getPoints(40));
 selectedPath=new THREE.Line(geometry,rayMat);scene.add(selectedPath);
 selectedPacket=mesh(packetGeo,orangeGlow,positions[0].x,positions[0].y,positions[0].z);
}
function updateGeometry(){
 model=kernelGather({stride:state.stride});
 const selected=model.lanes[state.selectedLane],active=new Set(model.lanes.map(x=>x.index));
 updatePhysicalReadout(selected);
 laneObjects.forEach((item,i)=>{item.material=i===state.selectedLane?warmLit:offGlow;item.scale.y=i===state.selectedLane?1.35:1;});
 cellObjects.forEach((item,i)=>{item.material=i===selected.index?warmLit:active.has(i)?coolLit:offGlow;});
 updateLinks();
}
let microPhase="address",microRegion=null;
function renderMicroscope(){
 const t=traceGather(state.stride,state.selectedLane),e=phaseExplanation(microPhase,t);
 const controls=$("micro-phases");
 if(controls.childElementCount!==TRACE_PHASES.length){
  for(const p of TRACE_PHASES){
   const b=document.createElement("button");
   b.type="button";b.dataset.microPhase=p.id;b.textContent=p.name.split(" / ")[0];
   b.title=p.question;b.addEventListener("click",()=>{
    microPhase=p.id;renderMicroscope();
   });controls.append(b);
  }
 }
 controls.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.microPhase===microPhase)));
 $("micro-value").textContent=e.label;
 $("micro-detail").textContent=e.detail;
 $("micro-code").textContent=TRACE_PHASES.find(p=>p.id===microPhase).code+
  "\n\nLANE "+t.lane+"  /  stride "+t.stride+
  "\nsrcIndex="+t.operands.index+
  "  srcRelativeOffset="+t.operands.srcOffset+"B"+
  "\ndstIndex="+t.lane+"  dstRelativeOffset="+t.operands.dstOffset+"B";
 const board=$("micro-regions");
 if(board.childElementCount!==32){
  for(let i=0;i<32;i++){
   const b=document.createElement("button");b.type="button";b.dataset.region=String(i);
   b.textContent=String(i).padStart(2,"0");
   b.title="32B region "+i;b.addEventListener("click",()=>{
    microRegion=i;microPhase="load";
    const group=traceGather(state.stride,state.selectedLane).loads.groups.find(g=>g.region===i);
    if(group?.lanes.length)apply({type:"SELECT_LANE",value:group.lanes[0]});
    else renderMicroscope();
   });board.append(b);
  }
 }
 if(microRegion===null)microRegion=t.operands.srcRegion;
 const active=new Set(t.loads.regionNumbers);
 board.querySelectorAll("button").forEach(b=>{
  const n=Number(b.dataset.region);
  b.classList.toggle("active",active.has(n));
  b.classList.toggle("selected",n===microRegion);
  b.setAttribute("aria-label","Region "+n+(active.has(n)?" active":" inactive"));
 });
 const group=t.loads.groups.find(g=>g.region===microRegion);
 $("micro-region-detail").textContent=group?
  "区域 "+group.region+"（相对 "+group.startByte+"–"+group.endByte+"B）"+
  " / Lanes ["+group.lanes.join(", ")+"]"+
  " / Input indices ["+group.indices.join(", ")+"]"+
  " / 有效读入 "+group.bytesRequested+"B / 32B":
  "区域 "+microRegion+" 当前没有被任何 Lane 读取。";
 const body=$("micro-matrix").querySelector("tbody");body.replaceChildren();
 for(const x of compareGatherStrides()){
  const tr=document.createElement("tr");tr.classList.toggle("active",x.stride===state.stride);
  for(const value of [x.stride,x.sourceRegions,x.sourceCoveredBytes+"B",
   Math.round(x.sourceRegionUtilization*100)+"%",x.destinationRegions]){
   const td=document.createElement("td");td.textContent=String(value);tr.append(td);
  }
  tr.title="Switch to stride "+x.stride;
  tr.addEventListener("click",()=>apply({type:"STRIDE",value:x.stride}));
  body.append(tr);
 }
 $("micro-proof").textContent="DERIVED | 32B 对齐假设 | 有效载荷 128B | "+
  "编译指令是否变化：UNKNOWN（等待真实 SASS）；缓存命中 / DRAM 请求：UNKNOWN（等待 NCU）。"+
  "源端覆盖 "+t.loads.uniqueRegions+" 区域；目的端覆盖 "+t.stores.uniqueRegions+" 区域。"+
  "所有数据只用相对偏移计算，绝不是实际 GPU 物理地址。";
}
function updatePanel(){
 document.querySelectorAll("[data-stride]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.stride)===state.stride)));
 document.querySelectorAll("[data-step]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.step===state.step)));
 const syntax=sourceForStride(state.stride).split("\n");
 const highlighted={source:[8],dispatch:[1,2],memory:[3,4],result:[4,5]}[state.step];
 const parent=$("code");parent.replaceChildren();
 syntax.forEach((line,i)=>{
  const span=document.createElement("span");span.className="line"+(highlighted.includes(i)?" active":"");
  span.textContent=String(i+1).padStart(2,"0")+"  "+line;parent.append(span);
 });
 const list=$("lane-list");
 if(list.childElementCount!==32){
  list.replaceChildren();
  for(let i=0;i<32;i++){
   const b=document.createElement("button");b.textContent=String(i).padStart(2,"0");
   b.dataset.lane=String(i);
   b.addEventListener("click",()=>apply({type:"SELECT_LANE",value:i}));
   list.append(b);
  }
 }
 list.querySelectorAll("button").forEach(b=>b.classList.toggle("selected",Number(b.dataset.lane)===state.selectedLane));
 const lane=model.lanes[state.selectedLane];
 $("address-detail").textContent="LANE "+String(lane.lane).padStart(2,"0")+
 "  →  src["+lane.index+"]\nbyte offset "+lane.byteAddress+
 "  →  sector "+lane.sector+"\nfloat32 value = "+lane.value.toFixed(2);
 $("sectors").textContent=String(model.sectorCount);
 $("bytes").textContent=model.coveredBytes+"B";
 const stages={
  source:["CODE / CUDA KERNEL","一段真实、可以编译的 CUDA gather Kernel","实际执行的表达式是 src[lane * stride]；改参数，地址会改变。"],
  dispatch:["THREADS / 32 LANES","一个 Warp 的 32 条线程请求","左侧 32 个金属插座分别对应 lane 0–31。点击任意 Lane，观察它需要哪个数组索引。"],
  memory:["MEMORY / DEVICE FLOAT32","256 个数值位置、32B 对齐扇区","右侧 256 格是 src[0..255]。青色格是本次访问的 32 个数，金色格是当前线程的目标。"],
  result:["RETURN / VERIFICATION","32 个结果从对应地址被取出","dst[lane] = src[lane * stride]。结果应逐个检查，不能只看吞吐或扇区数。"]
 };
 const [caption,title,description]=stages[state.step];
 $("visual-step").textContent=caption;$("visual-title").textContent=title;$("visual-description").textContent=description;
 $("interpretation").textContent="32 条线程共请求 "+model.requestedBytes+"B，触及 "+model.sectorCount+" 个不同的 32B 对齐扇区（覆盖 "+model.coveredBytes+"B）。"+
 (state.stride===1?" 连续访存只触及 4 个扇区。":state.stride===4?" 步长 4 导致覆盖 16 个扇区。":" 步长 8 使每条线程触及不同扇区。")+
 " 这不是实际运行时间，也不是 DRAM 必然传输的字节数。";
 const evidence=buildDerivedEvidence(state.stride,state.selectedLane);
 const linkEvidence=describeWorldObject("address-edge",evidence);
 $("status").textContent="DERIVED ADDRESSES / ILLUSTRATIVE PHYSICAL LAYOUT / "+measurementState().status+" / "+state.interactions+" ACTIONS";
 document.documentElement.dataset.materialEvidenceKind=evidence.kind;
 document.documentElement.dataset.materialPathClaim=linkEvidence.kind;
 document.documentElement.dataset.materialGpuMeasured="false";
 renderMicroscope();
 document.documentElement.dataset.materialStep=state.step;
 document.documentElement.dataset.materialSectors=String(model.sectorCount);
 document.documentElement.dataset.materialSelectedAddress=String(lane.index);
}
function apply(action){
 state=transition(state,action);if(action.type==="STRIDE")microRegion=null;updateGeometry();updatePanel();
 setView(state.step,true);
}
// Read-only receipt transcript viewer. Import cannot grant MEASURED identity.
let importedReceipt=null,receiptTab="sass";
function showReceipt(){
 const target=$("receipt-text"),info=$("receipt-info");
 if(!importedReceipt){
  target.textContent="无实际编译产物可显示。";
  info.textContent="NOT IMPORTED · NO GPU EXECUTION RECEIPT";
  return;
 }
 const r=importedReceipt;
 info.textContent="IMPORTED / UNATTESTED (NOT MEASURED)\n"+r.deviceName+" / "+r.deviceUuid+
  "\nCOMMIT "+r.commit+"\nSOURCE SHA256 "+r.sourceSha256+
  "\nFILE HASH "+r.hashes[receiptTab]+
  "\nCaution: integrity is NOT independent GPU attestation";
 target.textContent=r.text[receiptTab].slice(0,6000)||
   "该收据中对应产物为空。";
 document.documentElement.dataset.materialGpuMeasured="false";
}
$("receipt-file").addEventListener("change",async ()=>{
 const file=$("receipt-file").files?.[0];
 if(!file)return;
 importedReceipt=null;
 $("receipt-info").textContent="VERIFYING / NOT MEASURED";
 $("receipt-text").textContent="正在核对导入结构，不代表硬件已认证。";
 try{
  if(file.size>600000)throw new Error("Receipt view too large");
  const parsed=JSON.parse(await file.text());
  importedReceipt=parseReceiptView(parsed);
  showReceipt();
 }catch(err){
  $("receipt-info").textContent="REJECTED / "+String(err.message).slice(0,180);
  $("receipt-text").textContent="未接受该收据；硬件执行仍未验证。";
 }
});
document.querySelectorAll("[data-receipt-tab]").forEach(btn=>btn.addEventListener("click",()=>{
 receiptTab=btn.dataset.receiptTab;
 showReceipt();
}));
showReceipt();

document.querySelectorAll("[data-stride]").forEach(b=>b.addEventListener("click",()=>apply({type:"STRIDE",value:Number(b.dataset.stride)})));
document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>apply({type:"STEP",value:b.dataset.step})));
for(const [id,point] of [["focus-threads","dispatch"],["focus-memory","memory"],["focus-overview","source"]]){
 $(id).addEventListener("click",()=>apply({type:"STEP",value:point}));
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{
 if(!drag)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 angleX=Math.max(-.65,Math.min(.65,angleX-dx*.006));
 angleY=Math.max(-.35,Math.min(.35,angleY+dy*.006));
 drag={x:e.clientX,y:e.clientY};
});
canvas.addEventListener("pointerup",e=>{
 const rect=canvas.getBoundingClientRect();
 pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
 pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects([...laneObjects,...cellObjects],false);
 if(hits.length){
  const hit=hits[0].object;
  if(Number.isInteger(hit.userData.lane))apply({type:"SELECT_LANE",value:hit.userData.lane});
  else if(Number.isInteger(hit.userData.index)){
   const lane=model.lanes.find(l=>l.index===hit.userData.index);
   if(lane)apply({type:"SELECT_LANE",value:lane.lane});
  }
 }
 drag=null;
});
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.min(1.5,Math.max(.65,zoom+Math.sign(e.deltaY)*.075))},{passive:false});
function resize(){const rect=$("viewport").getBoundingClientRect();
 renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
 camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);
updateGeometry();updatePanel();resize();
setView("source",true);
renderer.render(scene,camera);
$("loading").hidden=true;document.documentElement.dataset.materialReady="true";
window.__MATERIAL_LAB={getSnapshot:()=>({...state}),getEvidence:()=>buildDerivedEvidence(state.stride,state.selectedLane),getMeasurement:()=>measurementState(),getObjectEvidence:id=>describeWorldObject(id,buildDerivedEvidence(state.stride,state.selectedLane)),getModel:()=>({stride:model.stride,sectors:model.sectorCount,addresses:model.lanes.map(l=>l.byteAddress),output:model.result.slice()}),
  getRenderer:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),getCamera:()=>({focusX:cameraFocus.x,focusY:cameraFocus.y,focusZ:cameraFocus.z})};
function frame(t){
 const dt=Math.min(.07,(t-(frame.last||t))/1000);frame.last=t;nowClock+=dt;frames++;
 const orbit=new THREE.Vector3(cameraPos.x*Math.cos(angleX)+Math.sin(angleX)*cameraPos.z,
  cameraPos.y*Math.cos(angleY),cameraPos.z*Math.cos(angleX)-Math.sin(angleX)*cameraPos.x);
 camera.position.lerp(orbit.multiplyScalar(zoom).add(cameraFocus),1-Math.exp(-dt*3.2));
 camera.lookAt(cameraFocus);
 if(selectedPacket){
  const p=lineForLane(state.selectedLane);
  const curve=new THREE.CatmullRomCurve3(p);
  const u=(nowClock*.33)%1;
  selectedPacket.position.copy(curve.getPoint(u));
 }
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
