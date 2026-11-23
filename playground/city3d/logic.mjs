/** Deterministic world and mission rules for 3D Silicon City. All distances are metres. */
export const WORLD_SIZE=112;
export const DISTRICTS=Object.freeze([
 {id:"factory",name:"THREAD FACTORY",label:"线程工厂",x:-34,z:-26,kind:"lab",href:"../chapters/01-thread-mapping/index.html"},
 {id:"rush",name:"WARP RUSH",label:"Warp 冲刺",x:33,z:-26,kind:"lab",href:"../chapters/02-warp-divergence/index.html"},
 {id:"marina",name:"MEMORY ABYSS",label:"显存深渊",x:34,z:27,kind:"game",href:"../arcade/index.html"},
 {id:"castle",name:"CACHE CASTLE",label:"缓存城堡",x:-35,z:27,kind:"planned",href:null},
 {id:"forge",name:"TENSOR FORGE",label:"矩阵熔炉",x:-4,z:-37,kind:"planned",href:null},
 {id:"cluster",name:"CLUSTER COMMAND",label:"集群指挥部",x:4,z:43,kind:"planned",href:null}
]);
export const START=Object.freeze({x:0,z:6});
export const TRIGGER_RADIUS=7.5;
/** Footprints of the street-front stores, excluding the roadway. */
export const BLOCKS=Object.freeze([
 {x:-34,z:-38,w:28,d:20},{x:34,z:-38,w:28,d:20},
 {x:-34,z:38,w:28,d:20},{x:34,z:38,w:28,d:20},
 {x:-5,z:-48,w:19,d:13},{x:5,z:52,w:19,d:13}
]);
export function normalizeMove({forward=0,right=0}={}){
 const length=Math.hypot(forward,right)||1;
 return {forward:forward/length,right:right/length};
}
export function advance(pos,axes,dt,speed=11){
 if(!pos||![pos.x,pos.z,dt,speed].every(Number.isFinite)||dt<0||dt>1||speed<0)throw new RangeError("Invalid input");
 const v=normalizeMove(axes),target={x:pos.x+v.right*dt*speed,z:pos.z-v.forward*dt*speed};
 const clamped={x:Math.max(-54,Math.min(54,target.x)),z:Math.max(-54,Math.min(54,target.z))};
 const radius=.9;
 const blocked=(x,z)=>BLOCKS.some(b=>Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius);
 // Axis-separated resolution keeps the character sliding along walls.
 // Sweep from the previous position so low frame-rate motion cannot cross a facade.
 const sweep=(from,to,axis,fixed)=>{
  const distance=to-from,steps=Math.max(1,Math.ceil(Math.abs(distance)/.5));let value=from;
  for(let i=1;i<=steps;i++){const candidate=from+distance*i/steps;
   if(blocked(axis==="x"?candidate:fixed,axis==="z"?candidate:fixed))break;
   value=candidate;
  }
  return value;
 };
 const x=sweep(pos.x,clamped.x,"x",pos.z);
 const z=sweep(pos.z,clamped.z,"z",x);
 return {x,z};
}
export function nearestMission(pos,range=TRIGGER_RADIUS){
 if(!pos||![pos.x,pos.z,range].every(Number.isFinite)||range<0)throw new RangeError("Invalid mission query");
 let nearest=null,best=range;
 for(const d of DISTRICTS){const dist=Math.hypot(pos.x-d.x,pos.z-d.z);if(dist<=best){nearest=d;best=dist}}
 return nearest;
}
export function missionLink(d){return d&&d.kind!=="planned"?d.href:null;}
