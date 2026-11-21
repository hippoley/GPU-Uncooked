/**
 * Filmic street layer: camera-independent city atmosphere and architectural cues.
 * Original procedural meshes, reusable geometry, deterministic seed, no assets.
 * Avoids expensive SSR, shadow maps and bloom passes on software-rendered CI.
 */
export function filmicRecipe(seed=79,quality="medium"){
 if(!Number.isInteger(seed)||!["low","medium","high"].includes(quality))throw new RangeError("Invalid filmic recipe");
 const rng=n=>{let t=Math.imul((n+seed)|0,0x9e3779b1);t=Math.imul(t^(t>>>15),0x85ebca6b);return ((t^(t>>>13))>>>0)/4294967295};
 const depth=quality==="low"?1:quality==="high"?3:2,skyline=[];
 for(let layer=0;layer<depth;layer++)for(let i=0;i<26;i++){
  const x=-120+i*9.4+(rng(i+layer*97)-.5)*3;
  const h=13+Math.round(rng(i*11+layer*131)*38);
  skyline.push({x,z:-110-layer*17,h,w:5.2+rng(i*23+1)*4.9,layer});
 }
 return {seed,quality,skyline,lightCount:quality==="low"?3:quality==="high"?8:5,depth};
}
export function createFilmicCity(THREE,parent,scene,{seed=79,quality="medium"}={}){
 const recipe=filmicRecipe(seed,quality),group=new THREE.Group();
 group.name="NIGHT_RAIN_FILMIC_LAYER";parent.add(group);
 const mat=(color,metalness=.2,roughness=.7,emissive=0x000000,emissiveIntensity=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
 // One compact procedural dusk dome gives the street an atmospheric horizon
 // without downloading a sky texture or enabling a costly post-processing chain.
 const skyMaterial=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vSkyDirection;
   void main(){vSkyDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 vSkyDirection;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    float elevation=clamp(vSkyDirection.y*.5+.5,0.,1.);
    vec3 night=vec3(.023,.038,.087),mid=vec3(.12,.087,.17),horizon=vec3(.34,.14,.19);
    vec3 color=mix(horizon,mid,smoothstep(.31,.57,elevation));
    color=mix(color,night,smoothstep(.53,.94,elevation));
    float cloud=sin(vSkyDirection.x*22.+vSkyDirection.z*9.)*sin(vSkyDirection.z*17.-vSkyDirection.x*5.);
    color+=vec3(.035,.021,.035)*cloud*(1.-smoothstep(.38,.85,elevation));
    float star=step(.9989,hash(floor(vSkyDirection.xz*260.)));
    color+=vec3(.35,.43,.56)*star*smoothstep(.58,.87,elevation);
    gl_FragColor=vec4(color,1.);
   }`
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(218,28,16),skyMaterial);sky.name="PROCEDURAL_DUSK";group.add(sky);
 const skylineMat=[new THREE.MeshBasicMaterial({color:0x171c31}),new THREE.MeshBasicMaterial({color:0x24263d}),new THREE.MeshBasicMaterial({color:0x2c3048})];
 const metal=mat(0x424e5c,.69,.42),shadow=mat(0x111827,.48,.68);
 const lamp=mat(0xffcd91,.1,.36,0xffb66d,2.1),aqua=mat(0x6fdae4,.2,.36,0x31cfe4,1.7);
 const geometry=new Map();let batches=0;
 const cube=(w,h,d,m,x,y,z,root=group)=>{
  const key=[w,h,d].join(":"),geo=geometry.get(key)||new THREE.BoxGeometry(w,h,d);geometry.set(key,geo);
  const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=false;root.add(o);return o;
 };
 const instanced=(geo,material,locations)=>{
  if(!locations.length)return;
  const mesh=new THREE.InstancedMesh(geo,material,locations.length),o=new THREE.Object3D();
  locations.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.sx||1,p.sy||1,p.sz||1);o.rotation.y=p.r||0;o.updateMatrix();mesh.setMatrixAt(i,o.matrix)});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);batches++;
 };
 // 3 distinct silhouette depths form a horizon, not a flat painted backdrop.
 for(let layer=0;layer<recipe.depth;layer++){
  const buildings=recipe.skyline.filter(b=>b.layer===layer);
  instanced(new THREE.BoxGeometry(1,1,1),skylineMat[layer],buildings.map(b=>({x:b.x,y:b.h*.5,z:b.z,sx:b.w,sy:b.h,sz:7})));
 }
 // Physical pedestrian fixtures: light boxes, emergency stripes, cable supports.
 const poles=[],stripes=[],reflectors=[];
 for(let i=-4;i<=4;i++){
  if(i===0)continue;
  const z=i*10.5;
  for(const side of [-1,1]){
   const x=side*12.4;
   poles.push({x,y:2.1,z,sy:4.2});
   reflectors.push({x,y:4.28,z,sz:2.1});
  }
  if(Math.abs(i)>1){
   stripes.push({x:-9.8,y:.2,z,sz:2.2},{x:9.8,y:.2,z,sz:2.2});
  }
 }
 instanced(new THREE.CylinderGeometry(.05,.09,1,6),metal,poles);
 instanced(new THREE.BoxGeometry(.15,.13,1),lamp,reflectors);
 instanced(new THREE.BoxGeometry(.15,.02,1),aqua,stripes);
 // Road crossing: all modules are positioned on the actual world road plane.
 const crossing=[];
 for(const z of [-12,12])for(let i=0;i<7;i++){
  crossing.push({x:-8.4+i*2.7,y:.185,z,sx:1.25,sz:1.4});
 }
 const crossingMat=new THREE.MeshBasicMaterial({color:0xe5d5c0,transparent:true,opacity:.65,depthWrite:false});
 const crossingGeo=new THREE.PlaneGeometry(1,1);crossingGeo.rotateX(-Math.PI/2);
 instanced(crossingGeo,crossingMat,crossing);
 // A deliberately authored port gantry is the major silhouette and sightline destination.
 const gantry=new THREE.Group();gantry.name="PORT_ENTRY_GANTRY";group.add(gantry);
 for(const x of [-10.5,10.5]){
  cube(.5,10.5,.6,metal,x,5.25,-25.1,gantry);
  cube(.22,2.6,.22,metal,x+(x<0?1:-1),6.8,-25.1,gantry).rotation.z=x<0?.55:-.55;
 }
 cube(21.6,.65,.85,metal,0,10.4,-25.1,gantry);
 cube(19.5,.35,.25,aqua,0,10.2,-24.53,gantry);
 const signTexture=(()=>{
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=180;const g=canvas.getContext("2d");
  g.fillStyle="#111a26";g.fillRect(0,0,1024,180);g.fillStyle="#ffce8f";g.font="900 83px system-ui";g.textAlign="center";g.textBaseline="middle";
  g.fillText("SILICON  /  FREIGHT PORT",512,93,945);
  g.fillStyle="#77eadf";g.fillRect(20,155,984,5);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
 })();
 cube(15.5,2.15,.2,new THREE.MeshBasicMaterial({map:signTexture}),0,8.85,-24.52,gantry);
 // Warm vapor volumes: limited point sprites in one draw call, no fullscreen bloom.
 const count=quality==="low"?28:quality==="high"?140:72;
 const p=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  let v=(Math.sin(i*169.3+seed)*51317.1)%1;v=v<0?v+1:v;
  p[3*i]=((i*19.7)%28)-14;p[3*i+1]=.8+((i*11.13)%14);p[3*i+2]=-31-(v*18);
 }
 const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute("position",new THREE.BufferAttribute(p,3));
 const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xe9a6a2,size:.13,transparent:true,opacity:.22,depthWrite:false}));group.add(dust);
 // Light only a few authored focal points. Other warm highlights are emissive geometry.
 const lights=[[-8,5,-24,0xff9e75],[8,5,-24,0x65d8dc],[-33,5,-26,0xffb274],[33,5,-26,0x74d4e9],[0,9,-24,0xffc69a],[7,5,25,0xa0cfff],[-7,5,25,0xe38ebe],[0,6,5,0xffb778]];
 for(let i=0;i<recipe.lightCount;i++){
  const [x,y,z,c]=lights[i],l=new THREE.PointLight(c,i<2?15:7,16,2);
  l.position.set(x,y,z);group.add(l);
 }
 group.userData={quality,seed,batches,environment:"author-controlled night rain"};
 return {group,metrics:{distantBuildings:recipe.skyline.length,instancedBatches:batches,localizedLights:recipe.lightCount,particles:count},
  update(t){dust.rotation.y=Math.sin(t*.13)*.015}};
}
