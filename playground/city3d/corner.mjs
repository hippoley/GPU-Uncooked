/**
 * Silicon City / Corner Grammar v1.
 * Reproducible street-level set dressing; all textures and geometry generated in-browser.
 * This is an authored close-up district, not an uncontrolled random city.
 * No external images, models, sound or third-party game assets.
 */
export const CORNER_VERSION="1.0.0";
export const QUALITY_LEVELS=Object.freeze({low:{panels:4,props:10,glass:false},medium:{panels:8,props:22,glass:true},high:{panels:12,props:36,glass:true}});
export function cornerRecipe(seed=23,quality="medium"){
 if(!Number.isInteger(seed)||!Object.hasOwn(QUALITY_LEVELS,quality))throw new RangeError("Unknown corner recipe");
 const q=QUALITY_LEVELS[quality],props=[];
 const rand=(n)=>{let x=(Math.imul(seed+1,1664525)+Math.imul(n+17,1013904223))|0;x=Math.imul(x^(x>>>16),2246822519);return ((x^(x>>>13))>>>0)/4294967295};
 for(let i=0;i<q.props;i++){
  const side=i%2?-1:1;
  // Two street-facing corridors adjacent to the existing freight district.
  const x=side*(17.8+rand(i*3)*1.5);
  const z=-20+i/q.props*52+rand(i*7)*.65;
  props.push({x,z,angle:side<0?Math.PI:0,kind:i%5===0?"terminal":i%3===0?"bollard":"post"});
 }
 return {seed,quality,panelCount:q.panels,glass:q.glass,props};
}
function makeSignMaterial(THREE,text,color){
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
 const g=canvas.getContext("2d");g.fillStyle="#0b1423";g.fillRect(0,0,512,128);
 g.strokeStyle=color;g.lineWidth=6;g.strokeRect(5,5,502,118);
 g.shadowBlur=14;g.shadowColor=color;g.font="900 52px system-ui";g.textAlign="center";g.textBaseline="middle";
 g.fillStyle="#fff6dc";g.fillText(text,256,65,475);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
}
export function createStreetCorner(THREE,parent,{seed=23,quality="medium"}={}){
 const recipe=cornerRecipe(seed,quality);
 const group=new THREE.Group();group.name="SILICON_PORT_STREET_CORNER";parent.add(group);
 const material=(color,metalness=.3,roughness=.65,emissive=0x000000,intensity=0)=>
  new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity});
 const stone=material(0x455063,.06,.94),trim=material(0x485464,.66,.35),dark=material(0x131c2d,.45,.55);
 const hot=material(0xfbbf81,.1,.6,0xe69460,.65),cool=material(0x5cdbd9,.1,.58,0x2abdbb,.8);
 const glass=recipe.glass?new THREE.MeshPhysicalMaterial({color:0x72b9c3,metalness:.12,roughness:.18,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide}):material(0x203d58,.05,.45,0x134963,.12);
 const boxGeometry=new Map();
 function mesh(w,h,d,mat,x,y,z,root=group){
  const key=[w,h,d].join("|");
  if(!boxGeometry.has(key))boxGeometry.set(key,new THREE.BoxGeometry(w,h,d));
  const o=new THREE.Mesh(boxGeometry.get(key),mat);o.position.set(x,y,z);root.add(o);return o;
 }
 function batch(geometry,mat,items){
  if(!items.length)return 0;
  const o=new THREE.InstancedMesh(geometry,mat,items.length);
  const dummy=new THREE.Object3D();items.forEach((p,i)=>{
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle||0,0);
   dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);
  });o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();group.add(o);return 1;
 }
 let instances=0,signs=0;
 // Facades are aligned to the existing freight buildings and their real doors.
 for(const [side,sign,accent] of [[-1,"FREIGHT / 32",hot],[1,"SILICON MARKET",cool]]){
  const centerX=side*34,front=-27.83,frontSide=front+0.8;
  // Long shop-front under a continuous steel canopy.
  mesh(20,.16,2.7,trim,centerX,4.45,frontSide);
  mesh(20,.10,.3,accent,centerX,4.20,frontSide+1.33);
  mesh(21,.32,.25,dark,centerX,6.6,front+.04);
  const label=mesh(12,1.45,.1,makeSignMaterial(THREE,sign,side<0?"#ffa779":"#71f2e6"),centerX,5.66,front+1.5);
  signs++;
  // Recessed shopfront and lit interior volume create meaningful depth near camera.
  mesh(17,3.6,.10,glass,centerX,2.25,front+2.00);
  mesh(.18,3.6,2.0,trim,centerX-8.7,2.25,front+1.02);
  mesh(.18,3.6,2.0,trim,centerX+8.7,2.25,front+1.02);
  mesh(16,2.85,.10,dark,centerX,2.4,front-.55);
  const mullions=[];for(let k=-4;k<=4;k++)mullions.push({x:centerX+k*1.8,y:2.22,z:front+1.2,sy:3.6});
  instances+=batch(new THREE.BoxGeometry(.11,1,.15),trim,mullions);
  // Interior shelves remain visible through the storefront at street level.
  for(const depth of [.35,1.2]){
   const shelf=mesh(13,.13,.9,stone,centerX,1.35,front+depth);
   mesh(13,.13,.9,stone,centerX,2.5,front+depth);
   for(let j=0;j<5;j++){
    mesh(.72,1.1,.54,j%2?cool:hot,centerX-5+j*2.4,2.95,front+depth);
   }
  }
  // Architectural vertical rhythm: strong corner pilasters and hand-sized details.
  const columns=[];for(let j=0;j<recipe.panelCount;j++){
   const px=centerX-9+j*18/(recipe.panelCount-1);
   columns.push({x:px,y:8.1,z:front-.14,sy:6});
  }
  instances+=batch(new THREE.BoxGeometry(.18,1,.24),stone,columns);
  mesh(.65,7.6,.9,trim,centerX-9.7,9.1,front-.3);
  mesh(.65,7.6,.9,trim,centerX+9.7,9.1,front-.3);
 }
 const bollards=[],posts=[],terminal=[];
 for(const item of recipe.props){
  const point={x:item.x,y:item.kind==="post"?.8:.42,z:item.z};
  if(item.kind==="bollard")bollards.push(point);
  else if(item.kind==="terminal")terminal.push({...point,y:.84});
  else posts.push(point);
 }
 instances+=batch(new THREE.CylinderGeometry(.12,.15,1.6,8),trim,posts);
 instances+=batch(new THREE.CylinderGeometry(.24,.32,.82,10),stone,bollards);
 instances+=batch(new THREE.BoxGeometry(.55,1.75,.58),dark,terminal);
 // Warm lights and painted curb are deliberately restricted to this single cinematic block.
 for(const x of [-34,34]){
  const lamp=new THREE.PointLight(x<0?0xffa66b:0x72dfdf,quality==="low"?3:7,quality==="low"?8:14,2);
  lamp.position.set(x,5.1,-26.6);group.add(lamp);
  mesh(19,.11,.32,x<0?hot:cool,x,.26,-25.95);
 }
 group.userData={purpose:"close-up procedural street",seed,quality,panels:recipe.panelCount};
 return {group,recipe,metrics:{instancedDrawCalls:instances,generatedSigns:signs,authoredProps:recipe.props.length},
  dispose(){group.parent?.remove(group);group.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material?.map)o.material.map.dispose();o.material?.dispose()}})}};
}
