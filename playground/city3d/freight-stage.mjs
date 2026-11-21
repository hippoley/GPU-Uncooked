/** Visual feedback from GPU World State. The readout changes only when physics
 * changes and never fabricates benchmark counters. One original low-cost 3D prop. */
import {CITY_FREIGHT_LOCATION,worldEvidence} from "./gpu-world-state.mjs";
export function createFreightStage(THREE,parent){
 const root=new THREE.Group();
 root.position.set(CITY_FREIGHT_LOCATION.x,0,CITY_FREIGHT_LOCATION.z);
 root.name="GPU_STATE_FREIGHT_TERMINAL";parent.add(root);
 const metal=new THREE.MeshStandardMaterial({color:0x344455,metalness:.63,roughness:.43});
 const idle=new THREE.MeshStandardMaterial({color:0xdf6b74,emissive:0xaf3344,emissiveIntensity:.85});
 const good=new THREE.MeshStandardMaterial({color:0x61e3c1,emissive:0x26bda1,emissiveIntensity:.9});
 const cargo=new THREE.MeshStandardMaterial({color:0xb78161,roughness:.81});
 const add=(w,h,d,x,y,z,m)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  mesh.position.set(x,y,z);root.add(mesh);return mesh;
 };
 add(5.8,.24,2.4,0,.22,2.1,metal);
 const posts=[],carts=[];
 for(let i=0;i<4;i++){
  const x=(i-1.5)*1.3;
  posts.push(add(.95,1.3,.92,x,.98,1.95,cargo));
  carts.push(add(.94,.13,1.05,x,1.73,1.95,idle));
 }
 const beacon=add(.24,2.3,.24,0,1.65,3.2,idle);
 const bars=[];
 for(let i=0;i<4;i++){
  const mesh=add(.22,1,.26,(i-1.5)*.48,1.45,3.23,idle);
  bars.push(mesh);
 }
 function update(state){
  const ev=worldEvidence(state),ok=ev.withinBudget;
  const tint=ok?good:idle;
  carts.forEach(c=>c.material=tint);
  beacon.material=tint;
  bars.forEach((b,i)=>{
   b.material=tint;
   const h=Math.max(.12,ev.waveSectors[i]/16);
   b.scale.y=h;b.position.y=.8+h*.5;
  });
  // Physical stacks lower as the request footprint drops.
  posts.forEach((p,i)=>{p.scale.y=Math.max(.5,ev.waveSectors[i]/16);p.position.y=.45+.65*p.scale.y});
  root.userData.sectors=ev.sectors;root.userData.waveSectors=ev.waveSectors.slice();
  root.userData.state=ok?"operational":"overloaded";
 }
 return {root,update,metrics:{visualChannels:4,physicalStacks:posts.length}};
}
