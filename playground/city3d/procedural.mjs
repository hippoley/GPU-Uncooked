/** Procedural urban materials. Original implementation inspired by general noise/instancing techniques,
 * not copied from any Saltline source. The same assets regenerate deterministically from a seed.
 * Textures are made in memory; no external images, no extra planar reflection render pass.
 */
export function hash2(x,y,seed=0){
 let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed|0,1442695041))|0;
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
export function noise(x,y,seed=0){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const smooth=t=>t*t*(3-2*t),sx=smooth(fx),sy=smooth(fy);
 const a=hash2(ix,iy,seed),b=hash2(ix+1,iy,seed),c=hash2(ix,iy+1,seed),d=hash2(ix+1,iy+1,seed);
 return (a*(1-sx)+b*sx)*(1-sy)+(c*(1-sx)+d*sx)*sy;
}
export function fbm(x,y,seed=0){
 let v=0,amp=.5,scale=1,weight=0;
 for(let i=0;i<5;i++){v+=amp*noise(x*scale,y*scale,seed+i*17);weight+=amp;amp*=.5;scale*=2;}
 return v/weight;
}
function texture(THREE,canvas,repeat=1){
 const out=new THREE.CanvasTexture(canvas);out.colorSpace=THREE.SRGBColorSpace;
 out.wrapS=THREE.RepeatWrapping;out.wrapT=THREE.RepeatWrapping;out.repeat.set(repeat,repeat);out.anisotropy=2;return out;
}
export function createRoadMaterial(THREE,seed=71){
 const n=256,base=document.createElement("canvas"),rough=document.createElement("canvas"),height=document.createElement("canvas");
 for(const c of [base,rough,height]){c.width=n;c.height=n}
 const bc=base.getContext("2d"),rc=rough.getContext("2d"),hc=height.getContext("2d");
 const b=bc.createImageData(n,n),r=rc.createImageData(n,n),h=hc.createImageData(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4;
  const grime=fbm(x/27,y/28,seed),fine=noise(x*.6,y*.6,seed+53);
  // Fragmented pools break the surface without faking a full scene reflection.
  const pool=fbm(x/68,y/40,seed+111),wet=pool>.47?Math.min(1,(pool-.47)*7):0;
  const c=Math.max(11,Math.min(74,25+grime*36+fine*9));
  b.data[i]=c*.82+wet*6;b.data[i+1]=c*.93+wet*7;b.data[i+2]=c*1.19+wet*12;b.data[i+3]=255;
  const roughness=Math.max(25,Math.min(240,181-grime*30-wet*147));
  for(let k=0;k<3;k++){r.data[i+k]=roughness;h.data[i+k]=c*3}
  r.data[i+3]=h.data[i+3]=255;
 }
 bc.putImageData(b,0,0);rc.putImageData(r,0,0);hc.putImageData(h,0,0);
 const color=texture(THREE,base,11),roughMap=texture(THREE,rough,11),bumpMap=texture(THREE,height,11);
 roughMap.colorSpace=THREE.NoColorSpace;bumpMap.colorSpace=THREE.NoColorSpace;
 return new THREE.MeshStandardMaterial({map:color,roughnessMap:roughMap,bumpMap,bumpScale:.10,roughness:.85,metalness:.4,color:0xffffff});
}
/** Reusable real-scale paving stones, curb seams and fine aggregate.
 * One small canvas texture repeated across sidewalks, no network image assets.
 */
export function createPavementMaterial(THREE,seed=121){
 const n=256,canvas=document.createElement("canvas");canvas.width=canvas.height=n;
 const ctx=canvas.getContext("2d"),im=ctx.createImageData(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const idx=(y*n+x)*4;
  const row=Math.floor(y/32),offset=row%2?16:0;
  const jointX=(x+offset)%32,jointY=y%32;
  const seam=jointX<2||jointY<2;
  const chip=hash2(x,y,seed+13),patch=noise(x/34,y/34,seed);
  const grain=(chip-.5)*15,shade=62+patch*30+grain-(seam?32:0);
  im.data[idx]=Math.max(0,shade*.88);
  im.data[idx+1]=Math.max(0,shade*.97);
  im.data[idx+2]=Math.max(0,shade*1.03);
  im.data[idx+3]=255;
 }
 ctx.putImageData(im,0,0);
 return new THREE.MeshStandardMaterial({map:texture(THREE,canvas,12),color:0xffffff,metalness:.07,roughness:.92});
}
export function createFacadeMaterial(THREE,color,seed=27){
 const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;const ctx=canvas.getContext("2d");
 const im=ctx.createImageData(128,128),shade=new THREE.Color(color),rr=shade.r*255,gg=shade.g*255,bb=shade.b*255;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,w=fbm(x/15,y/21,seed),stain=fbm(x/50,y/70,seed+85);
  const weather=.52+w*.32-stain*.20-(hash2(x,y,seed+44)>.993?.24:0);
  im.data[i]=Math.max(0,rr*weather);im.data[i+1]=Math.max(0,gg*weather);im.data[i+2]=Math.max(0,bb*weather);im.data[i+3]=255;
 }
 ctx.putImageData(im,0,0);
 const map=texture(THREE,canvas,2);
 return new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.84,metalness:.09});
}
export function makeWeather(THREE,seed=17,quality="medium"){
 // One GPU draw call for vertical streaks; cheap enough for constrained browsers.
 const amount=quality==="low"?160:quality==="high"?850:420;
 const positions=new Float32Array(amount*3),velocities=new Float32Array(amount);
 for(let i=0;i<amount;i++){
  const j=i*3;positions[j]=(hash2(i,0,seed)-.5)*110;
  positions[j+1]=hash2(i,1,seed)*32+1;
  positions[j+2]=(hash2(i,2,seed)-.5)*110;
  velocities[i]=17+hash2(i,3,seed)*11;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
 const material=new THREE.PointsMaterial({color:0xa8bacc,size:.085,transparent:true,opacity:.44,depthWrite:false,sizeAttenuation:true});
 const rain=new THREE.Points(geo,material);rain.frustumCulled=false;
 return {rain,update(dt){
  const p=geo.attributes.position;
  for(let i=0;i<amount;i++){let y=p.getY(i)-velocities[i]*dt;if(y<.25)y+=31;p.setY(i,y);}
  p.needsUpdate=true;
 }};
}
export function makePuddleGlints(THREE,parent,seed=66){
 // Long directional glints convey wet asphalt without an SSR or planar-reflection pass.
 const material=new THREE.MeshBasicMaterial({color:0xf4a0bb,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending});
 const material2=material.clone();material2.color.setHex(0x67e8e3);
 const geo=new THREE.PlaneGeometry(1,1),matrix=new THREE.Matrix4(),quat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
 const slots=[[],[]];
 for(let i=0;i<100;i++){
  const x=(hash2(i,5,seed)-.5)*97,z=(hash2(i,7,seed)-.5)*96;
  // Keep the glints in the main roads instead of on rooftops.
  if(Math.abs(x)>10&&Math.abs(z)>9)continue;
  const sx=.24+hash2(i,8,seed)*1.45,sz=1+hash2(i,9,seed)*3.9;
  slots[i%2].push({x,z,sx,sz});
 }
 for(const [index,items] of slots.entries()){
  const mesh=new THREE.InstancedMesh(geo,index?material:material2,items.length);
  items.forEach((a,i)=>{matrix.compose(new THREE.Vector3(a.x,.15,a.z),quat,new THREE.Vector3(a.sx,a.sz,1));mesh.setMatrixAt(i,matrix)});
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;parent.add(mesh);
 }
}
