/**
 * Spatially coherent facade grammar.
 * 3D geometry remains valid across camera viewpoints: no billboard-only windows,
 * no invented rear surfaces, no image-to-world hallucination.
 * Inspired by World Labs' view-consistency research goal; does not implement Atlas.
 */
export const SCENE_SEED=4627;
export const FACADE_UNITS=Object.freeze([
 {id:"factory",x:-34,z:-38,w:26,d:20,h:25,accent:0xf4ad7c},
 {id:"rush",x:34,z:-38,w:26,d:20,h:28,accent:0xeb7fb6},
 {id:"marina",x:34,z:38,w:26,d:20,h:20,accent:0x76deed},
 {id:"castle",x:-34,z:38,w:26,d:20,h:24,accent:0xacdeb5},
 {id:"forge",x:-6,z:-48,w:18,d:13,h:36,accent:0xffc283},
 {id:"cluster",x:6,z:52,w:18,d:13,h:29,accent:0xbab9ff}
]);
export function facadePlan(seed=SCENE_SEED,quality="medium"){
 if(!Number.isInteger(seed)||!["low","medium","high"].includes(quality))throw new RangeError("Invalid city view recipe");
 const sample=(a,b)=>{let n=(Math.imul(a+seed,2654435761)^Math.imul(b+391,1597334677))|0;n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967295};
 const rows=quality==="low"?2:quality==="high"?5:3;
 const plans=FACADE_UNITS.map((b,i)=>{
  const windows=[],front=b.z<0?b.z+b.d/2:b.z-b.d/2;
  const outward=b.z<0?1:-1;
  for(let floor=0;floor<rows;floor++){
   const elevation=8+floor*3.35;
   if(elevation>b.h-2)break;
   const count=Math.max(2,Math.floor((b.w-5)/3.1));
   for(let col=0;col<count;col++){
    const x=b.x-b.w/2+3.4+col*(b.w-6.5)/Math.max(1,count-1);
    // Windows are real frames with a recess and side reveal, not pasted quads.
    windows.push({x,y:elevation,z:front,lit:sample(i*13+floor,col)>.27,balcony:floor===0&&col%3===1});
   }
  }
  return {...b,front,outward,windows,roofLevel:b.h};
 });
 return {seed,quality,buildings:plans,
  windowCount:plans.reduce((sum,p)=>sum+p.windows.length,0)};
}
export function createCoherentFacades(THREE,root,{seed=SCENE_SEED,quality="medium"}={}){
 const plan=facadePlan(seed,quality),group=new THREE.Group();group.name="VIEW_CONSISTENT_ARCHITECTURE";root.add(group);
 const material=(color,metal=.15,rough=.75,glow=0)=>new THREE.MeshStandardMaterial({
  color,metalness:metal,roughness:rough,emissive:color,emissiveIntensity:glow
 });
 const limestone=material(0x7c7a83,.07,.88),shadow=material(0x151c30,.1,.92);
 const agedSteel=material(0x596574,.65,.52),glass=material(0x345274,.08,.31);
 const litGlass=material(0xf1c196,.05,.4,.3),paint=material(0x304253,.4,.63);
 const tiledRoof=material(0x414b61,.15,.89);
 const cache=new Map();let drawCalls=0,geometryPieces=0;
 function cube(w,h,d,m,x,y,z,parent=group){
  const key=[w,h,d].join("/");
  if(!cache.has(key))cache.set(key,new THREE.BoxGeometry(w,h,d));
  const o=new THREE.Mesh(cache.get(key),m);o.position.set(x,y,z);parent.add(o);geometryPieces++;return o;
 }
 function instance(w,h,d,m,placements){
  if(!placements.length)return;
  const key=[w,h,d].join("/");
  if(!cache.has(key))cache.set(key,new THREE.BoxGeometry(w,h,d));
  const mesh=new THREE.InstancedMesh(cache.get(key),m,placements.length),obj=new THREE.Object3D();
  placements.forEach((p,i)=>{obj.position.set(p.x,p.y,p.z);obj.scale.set(p.sx||1,p.sy||1,p.sz||1);obj.rotation.set(0,p.ry||0,0);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix)});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=false;group.add(mesh);drawCalls++;
 }
 for(const b of plan.buildings){
  const yRoof=b.roofLevel,far=b.front-b.outward*.65;
  // Multi-depth facade surfaces and corner bays establish actual parallax.
  cube(b.w+.15,.35,b.d+.15,limestone,b.x,yRoof+.12,b.z);
  cube(b.w-.8,.22,b.d-.8,tiledRoof,b.x,yRoof+.48,b.z);
  cube(.5,Math.max(4,b.h-5),.8,limestone,b.x-b.w/2+.35,(b.h+5)/2,b.front-b.outward*.32);
  cube(.5,Math.max(4,b.h-5),.8,limestone,b.x+b.w/2-.35,(b.h+5)/2,b.front-b.outward*.32);
  // Rain drainage, roof parapets and physical utility elements.
  cube(.15,b.h-2,.18,agedSteel,b.x+b.w/2-.7,(b.h+1)/2,b.front+b.outward*.35);
  cube(b.w,.55,.55,paint,b.x,b.h+1,b.front-b.outward*.45);
  for(let k=0;k<3;k++)cube(1.35,.8,1.5,agedSteel,b.x-b.w*.23+k*b.w*.23,b.h+1.05,b.z+.4);
  const frames=[],jambs=[],lintels=[],glassLit=[],glassDark=[],balconies=[],balusters=[];
  for(const [idx,w] of b.windows.entries()){
   const outer=b.front+b.outward*.25;
   const inner=b.front-b.outward*.27;
   // Occluded glass recess; from a side view the jamb is visible.
   frames.push({x:w.x,y:w.y,z:inner});
   jambs.push({x:w.x-.93,y:w.y,z:outer},{x:w.x+.93,y:w.y,z:outer});
   lintels.push({x:w.x,y:w.y+1.16,z:outer},{x:w.x,y:w.y-1.16,z:outer});
   (w.lit?glassLit:glassDark).push({x:w.x,y:w.y,z:inner+b.outward*.035});
   if(w.balcony){
    const z=outer+b.outward*.84;
    balconies.push({x:w.x,y:w.y-1.28,z});
    balusters.push({x:w.x-.95,y:w.y-.77,z:z+b.outward*.55},{x:w.x+.95,y:w.y-.77,z:z+b.outward*.55});
   }
  }
  instance(1.72,2.08,.12,shadow,frames);
  instance(.13,2.3,.5,limestone,jambs);
  instance(2,.14,.48,limestone,lintels);
  instance(1.58,1.96,.09,litGlass,glassLit);
  instance(1.58,1.96,.09,glass,glassDark);
  instance(2.4,.17,1.75,agedSteel,balconies);
  instance(.13,1.06,.15,agedSteel,balusters);
  // Fire escape only where exterior space permits; every stair step has physical depth.
  if(b.id==="rush"||b.id==="castle"){
   const stairX=b.x+b.w*.35,stairZ=b.front+b.outward*1.5;
   for(let j=0;j<8;j++){
    cube(1.75,.12,.48,agedSteel,stairX,(j+1)*.41+.25,stairZ+b.outward*j*.19);
   }
  }
 }
 group.userData={spatialCoherence:"real geometry",seed,quality,viewConsistency:"camera-independent meshes"};
 return {group,metrics:{windowCount:plan.windowCount,instancedBatches:drawCalls,geometryPieces},
  dispose(){group.parent?.remove(group);group.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose()})}};
}
