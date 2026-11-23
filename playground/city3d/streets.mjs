/** Authored procedural set-dressing for the 3D city. No external models.
 * A small kit of distinct structures repeats through a coherent street grammar.
 */
export function createUrbanDetails(THREE,root){
 const mat=(hex,glow=0)=>new THREE.MeshStandardMaterial({color:hex,roughness:.67,metalness:.4,emissive:hex,emissiveIntensity:glow});
 const dark=mat(0x1b2837),steel=mat(0x687383),wall=mat(0x334756),amber=mat(0xffb879,.38),aqua=mat(0x53bfca,.44);
 const instances=[];
 const addBatch=(geometry,material,poses)=>{
  if(!poses.length)return;
  const mesh=new THREE.InstancedMesh(geometry,material,poses.length),obj=new THREE.Object3D();
  poses.forEach((p,i)=>{obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,p.angle||0,0);obj.scale.set(p.sx||1,p.sy||1,p.sz||1);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix)});
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);instances.push(mesh);
 };
 // Urban safety rails. They follow sidewalks and keep intersections clear.
 const posts=[],rails=[];
 for(const x of [-19,19])for(let i=-5;i<=5;i++){
  const z=i*8;if(Math.abs(z)<11)continue;
  posts.push({x,y:.7,z,sy:1.4});rails.push({x,y:1.34,z:z+3.5,sz:7.2});
 }
 addBatch(new THREE.BoxGeometry(.14,1,.14),steel,posts);
 addBatch(new THREE.BoxGeometry(.12,.10,1),steel,rails);
 // Awnings and colorful wall details, each district has a deliberate visual vocabulary.
 const signs=[],awnings=[],frames=[];
 const stores=[
  {x:-34,z:-27.75,w:14,color:aqua},{x:34,z:-27.75,w:15,color:amber},
  {x:34,z:27.75,w:15,color:aqua},{x:-34,z:27.75,w:14,color:amber},
  {x:-6,z:-41.3,w:12,color:amber},{x:6,z:45.3,w:12,color:aqua}
 ];
 for(const st of stores){
  // storefront canopy
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(st.w,.35,2.7),st.color);
  mesh.position.set(st.x,4.9,st.z);root.add(mesh);
  const light=new THREE.Mesh(new THREE.BoxGeometry(st.w*.9,.1,1.9),amber);
  light.position.set(st.x,4.7,st.z);root.add(light);
  for(let k=0;k<5;k++)frames.push({x:st.x-5+k*2.5,y:3.6,z:st.z,sy:4});
 }
 addBatch(new THREE.BoxGeometry(.18,1,.18),steel,frames);
 // Traffic cones / small utility boxes: industrial mass and human-sized scale references.
 const barriers=[];
 for(let i=0;i<18;i++){
  const x=(i%2?13:-13)+(i%3)*.7,z=-48+i*5.5;
  barriers.push({x,y:.45,z,sx:1,sy:1,sz:1});
 }
 addBatch(new THREE.BoxGeometry(.8,.85,.8),dark,barriers);
 // Rooftop infrastructure visually explains larger structures, uses InstancedMesh batches.
 const vents=[];
 for(const [x,z,roof] of [[-34,-38,25],[34,-38,28],[34,38,20],[-34,38,24],[-6,-48,36],[6,52,29]]){
  for(let i=0;i<4;i++)vents.push({x:x-7+i*4.7,y:roof+1.1,z:z+2,sy:1.7});
 }
 addBatch(new THREE.BoxGeometry(1.7,1,1.8),wall,vents);
 // Overhead pedestrian span gives the player a sense of urban scale & layering.
 const bridge=new THREE.Group();root.add(bridge);
 const deck=new THREE.Mesh(new THREE.BoxGeometry(16,.65,3.7),dark);deck.position.set(0,12.6,-20);bridge.add(deck);
 for(const x of [-7.5,7.5]){
  const tower=new THREE.Mesh(new THREE.BoxGeometry(.65,12,1),steel);tower.position.set(x,6.5,-20);bridge.add(tower);
 }
 for(let i=0;i<8;i++){
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.12,2,.12),aqua);beam.position.set(-6.7+i*1.9,13.8,-18.2);bridge.add(beam);
 }
 return {count:instances.length+stores.length*2+bridge.children.length,
   objects:instances,dispose(){for(const batch of instances)batch.geometry.dispose();}};
}
