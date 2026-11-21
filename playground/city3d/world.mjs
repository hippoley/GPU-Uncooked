import * as THREE from "three";
import {DISTRICTS} from "./logic.mjs";
import {createRoadMaterial,createFacadeMaterial,makeWeather,makePuddleGlints} from "./procedural.mjs";
import {createUrbanDetails} from "./streets.mjs";
import {createStreetCorner} from "./corner.mjs";
import {createCoherentFacades} from "./coherence.mjs";
const rand=(i)=>{const n=Math.sin(i*93.17+19.6)*52793.23;return n-Math.floor(n)};
const mat=(color,emissive=0x000000,intensity=0)=>new THREE.MeshStandardMaterial({color,metalness:.3,roughness:.58,emissive,emissiveIntensity:intensity});
const asphalt=createRoadMaterial(THREE),concrete=mat(0x303048),cream=mat(0xe2b08e),glass=mat(0x133c64,0x2d91b5,.38);
const pink=mat(0xf265a4,0xe54789,.65),cyan=mat(0x4de2d8,0x2ce8e4,.8),yellow=mat(0xffcc85,0xffba6c,.55);
const boxGeometries=new Map();
const boxGeometry=(w,h,d)=>{
 const key=[w,h,d].join("|");
 if(!boxGeometries.has(key))boxGeometries.set(key,new THREE.BoxGeometry(w,h,d));
 return boxGeometries.get(key);
};
const box=(root,w,h,d,x,y,z,m)=>{const a=new THREE.Mesh(boxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=false;a.receiveShadow=false;root.add(a);return a};
const sphere=(root,r,x,y,z,m)=>{const a=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),m);a.position.set(x,y,z);a.castShadow=true;root.add(a);return a};
const cylinder=(root,top,bottom,height,x,y,z,m)=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,8),m);a.position.set(x,y,z);a.castShadow=true;root.add(a);return a};
function neonLabel(word,accent='#ffcb9b'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
 g.clearRect(0,0,512,128);g.fillStyle='#08132c';g.fillRect(0,0,512,128);
 g.strokeStyle=accent;g.lineWidth=5;g.strokeRect(4,4,504,120);
 g.fillStyle=accent;g.textAlign='center';g.textBaseline='middle';g.font='900 53px system-ui';g.fillText(word,256,69,478);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:texture,transparent:false,side:THREE.DoubleSide});
}
const signThemes=[
 {key:"THREAD FACTORY",fill:0x59435a,lit:"#f7bc88",accent:pink},
 {key:"WARP RUSH",fill:0x3b315e,lit:"#fe83ca",accent:pink},
 {key:"MEMORY ABYSS",fill:0x16425c,lit:"#65eee2",accent:cyan},
 {key:"CACHE CASTLE",fill:0x344f4c,lit:"#beecaa",accent:yellow},
 {key:"TENSOR FORGE",fill:0x614047,lit:"#ffd79b",accent:yellow},
 {key:"CLUSTER CMD",fill:0x304469,lit:"#a6beff",accent:cyan}
];
function building(root,seed,x,z,w,d,height,theme){
 const facade=createFacadeMaterial(THREE,theme.fill,seed+27),trim=theme.accent;
 box(root,w,height,d,x,height/2,z,facade);
 box(root,w+1,.6,d+1,x,height+.2,z,trim);
 box(root,w+2,.4,d+2,x,height+1,z,concrete);
 // Front door faces the road, with depth and properly lit metal frame.
 const toward=z<0?1:-1,doorZ=z+toward*(d/2+.09);
 box(root,3.1,3.7,.22,x,1.85,doorZ,glass);
 box(root,3.5,.22,.45,x,3.9,doorZ,trim);
 // Repeated facade panes are two instanced draw calls, not 60-100 separate meshes.
 const litMatrices=[],darkMatrices=[],transform=new THREE.Matrix4();
 for(let floor=0;floor<Math.floor((height-4)/3.3);floor++){
  for(let lane=0;lane<Math.floor((w-3)/2.7);lane++){
   const wx=x-w/2+2+lane*2.7,wy=5+floor*3.3;
   const list=rand(seed+floor*57+lane*37)>.25?litMatrices:darkMatrices;
   list.push(new THREE.Matrix4().makeTranslation(wx,wy,z+toward*(d/2+.14)));
  }
 }
 for(const [list,material] of [[litMatrices,yellow],[darkMatrices,glass]]){
  if(!list.length)continue;
  const instanced=new THREE.InstancedMesh(boxGeometry(1.45,1.8,.13),material,list.length);
  list.forEach((matrix,i)=>instanced.setMatrixAt(i,matrix));instanced.instanceMatrix.needsUpdate=true;
  instanced.castShadow=false;instanced.receiveShadow=false;instanced.computeBoundingSphere();root.add(instanced);
 }
 const sign=neonLabel(theme.key,theme.lit);
 const signMesh=box(root,w*.66,2.5,.16,x,5.9,z+toward*(d/2+.23),sign);
 if(toward<0)signMesh.rotation.y=Math.PI;
 // rooftop silhouettes and antennas
 box(root,2.5,2.2,2.2,x+w*.26,height+1.7,z,mat(0x263449));
 cylinder(root,.09,.14,4,x-w*.2,height+2.8,z,concrete);
 sphere(root,.32,x-w*.2,height+4.9,z,trim);
}
let frondGeometry=null;
const frondMaterial=new THREE.MeshStandardMaterial({color:0x2b6261,roughness:.93,metalness:0,side:THREE.DoubleSide});
function palmFrond(){
 if(frondGeometry)return frondGeometry;
 const rings=[[0,0,.05],[.6,.23,.36],[1.5,.16,.66],[2.7,-.25,.44],[3.9,-.88,.08]];
 const positions=[],indices=[];
 for(const [z,y,width] of rings)positions.push(-width,y,z,width,y,z);
 for(let i=0;i<rings.length-1;i++){
  const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 frondGeometry=geometry;return geometry;
}
function palm(root,x,z,size=1){
 const wood=mat(0x5d3e43);
 cylinder(root,.21,.43,7*size,x,3.5*size,z,wood);
 for(let i=0;i<9;i++){
  const frond=new THREE.Mesh(palmFrond(),frondMaterial);
  frond.position.set(x,7.0*size,z);
  frond.rotation.y=i*(Math.PI*2/9);
  frond.scale.setScalar(size*(.88+rand(i*7+x)*.2));
  root.add(frond);
 }
}
function car(root,color,x,z,rotation=0){
 const parent=new THREE.Group();parent.position.set(x,0,z);parent.rotation.y=rotation;root.add(parent);
 const body=mat(color);
 box(parent,4.6,1,2.05,0,1,0,body);box(parent,2.7,.8,1.8,-.25,1.84,0,glass);
 for(const i of [-1.3,1.3])for(const k of [-.95,.95]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.24,12),mat(0x0b1017));wheel.rotation.x=Math.PI/2;wheel.position.set(i,.48,k);parent.add(wheel);
 }
 for(const k of [-.7,.7])box(parent,.08,.25,.38,-2.36,1.1,k,yellow);
 return parent;
}
function actor(root,shirt=0xeea170){
 const p=new THREE.Group();root.add(p);
 const jacket=mat(shirt),skin=mat(0xe8b192),pants=mat(0x17233f),hair=mat(0x1a1b2c);
 box(p,.95,1.3,.56,0,1.9,0,jacket);
 sphere(p,.48,0,3.02,0,skin);box(p,1.0,.24,.65,0,3.38,-.1,hair);
 const arms=[],legs=[];
 for(const s of [-1,1]){
  const arm=box(p,.27,1,.31,s*.69,1.92,0,jacket);arms.push(arm);
  const leg=box(p,.32,1.15,.37,s*.24,.62,0,pants);legs.push(leg);
 }
 box(p,.75,.8,.32,0,1.8,.45,mat(0x233e4d)); // backpack
 return {root:p,arms,legs};
}
export function createWorld({quality="medium"}={}){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x21172f);scene.fog=new THREE.FogExp2(0x27243a,.018);
 const hemi=new THREE.HemisphereLight(0xa8bbff,0x372338,2.05);scene.add(hemi);
 const moon=new THREE.DirectionalLight(0xffad9e,2.4);moon.position.set(-30,85,-35);moon.castShadow=false;moon.shadow.mapSize.set(512,512);moon.shadow.camera.left=-80;moon.shadow.camera.right=80;moon.shadow.camera.top=80;moon.shadow.camera.bottom=-80;scene.add(moon);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),asphalt);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const root=new THREE.Group();scene.add(root);
 const weather=makeWeather(THREE,83,"medium");root.add(weather.rain);
 makePuddleGlints(THREE,root,57);
 const urbanDressing=createUrbanDetails(THREE,root);
 const closeup=createStreetCorner(THREE,root,{seed:2309,quality});
 const coherentArchitecture=createCoherentFacades(THREE,root,{seed:4627,quality});
 // two streets cross at the player spawn, continuous driveable world
 for(let z of [-14,14])box(root,120,.13,1.1,0,.08,z,mat(0xb7a4b0));
 for(let x of [-15,15])box(root,1.1,.13,120,x,.08,0,mat(0xb7a4b0));
 for(let i=-5;i<=5;i++){
  box(root,4,.12,.24,i*10,.12,0,cream);
  box(root,.24,.12,4,0,.12,i*10,cream);
 }
 // sidewalk zones / curb edges
 for(const x of [-39,39])box(root,27,.25,113,x,.14,0,concrete);
 for(const z of [-40,40])box(root,113,.25,22,0,.14,z,concrete);
 const positions=[[-34,-38,26,20,25], [34,-38,26,20,28],[34,38,26,20,20],[-34,38,26,20,24],[-6,-48,18,13,36],[6,52,18,13,29]];
 positions.forEach((p,i)=>building(root,i*100,...p,signThemes[i]));
 for(let i=0;i<14;i++){
  const x=i%2?-20:20,z=-52+Math.floor(i/2)*16;
  palm(root,x,z,.85+rand(i)*.32);
 }
 // street lights and localized emissive neon
 for(let i=-2;i<=2;i++){
  for(const side of [-1,1]){
   const z=i*21;
   cylinder(root,.11,.15,7,side*13,3.5,z,concrete);
   box(root,2,.24,.45,side*12,7.2,z,yellow);
   if(Math.abs(z)<=24){const l=new THREE.PointLight(side>0?0xff75bf:0x6cdfff,18,17,2);l.position.set(side*12,6.9,z);root.add(l)}
  }
 }
 // Mission markers - in 3D world-space, accessible from sidewalks.
 const markers=[];
 for(const d of DISTRICTS){
  const group=new THREE.Group();group.position.set(d.x,0,d.z);root.add(group);
  const active=d.kind!=="planned",m=active?cyan:pink;
  const pole=cylinder(group,.5,.5,.08,0,.12,0,m);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.9,.12,6,32),new THREE.MeshBasicMaterial({color:active?0x65f9e1:0xff99dd}));ring.rotation.x=-Math.PI/2;ring.position.y=.25;group.add(ring);
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.9),m);gem.position.y=4.1;group.add(gem);
  markers.push({d,group,gem,ring});
 }
 const cars=[
  {mesh:car(root,0xe66c88,-16,4,Math.PI/2),axis:"x",speed:7},
  {mesh:car(root,0x43bdc5,13,-18,Math.PI/2),axis:"z",speed:5.2},
  {mesh:car(root,0xe9aa65,-30,-4,Math.PI/2),axis:"x",speed:6.5}
 ];
 const walkers=[];
 for(let i=0;i<10;i++){const a=actor(root,[0x85c6b6,0x9376aa,0xe18eb0,0xedb477][i%4]);a.root.position.set(i%2?18:-18,0,-47+i*9.1);walkers.push({a,i})}
 const player=actor(root,0xec9a6b);player.root.position.set(0,0,6);
 return {THREE,scene,root,player,cars,walkers,markers,closeup,coherentArchitecture,update(t,dt){
  weather.update(dt);
  for(const item of markers){item.gem.rotation.y+=dt;item.gem.position.y=4.1+Math.sin(t*2+item.d.x)*.35;item.ring.rotation.z=t*.18}
  for(const entry of cars){if(entry.axis==="x"){entry.mesh.position.x+=dt*entry.speed;if(entry.mesh.position.x>52)entry.mesh.position.x=-52}else{entry.mesh.position.z+=dt*entry.speed;if(entry.mesh.position.z>51)entry.mesh.position.z=-50}}
  for(const w of walkers){w.a.root.position.z+=dt*(w.i%2?1:-1)*1.2;if(w.a.root.position.z>49)w.a.root.position.z=-48;if(w.a.root.position.z< -49)w.a.root.position.z=48;
   for(const [j,leg] of w.a.legs.entries())leg.rotation.x=Math.sin(t*5+w.i+j*Math.PI)*.3}
 },walk(t,velocity){
  for(let i=0;i<2;i++){player.legs[i].rotation.x=Math.sin(t*11+i*Math.PI)*Math.min(.5,velocity*.07);player.arms[i].rotation.x=-player.legs[i].rotation.x*.7}
 }};
}
