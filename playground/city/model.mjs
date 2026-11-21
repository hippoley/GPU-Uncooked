export const DISTRICTS=Object.freeze([
  {id:"factory",name:"THREAD FACTORY",ch:"线程工厂",x:185,y:353,kind:"lab",href:"../chapters/01-thread-mapping/index.html",action:"打开线程映射实验",category:"GRID · BLOCK · THREAD"},
  {id:"rush",name:"WARP RUSH",ch:"线程束冲刺",x:735,y:353,kind:"lab",href:"../chapters/02-warp-divergence/index.html",action:"打开 Warp 分支实验",category:"SIMT · DIVERGENCE"},
  {id:"marina",name:"MEMORY ABYSS",ch:"显存深渊",x:766,y:165,kind:"game",href:"../arcade/index.html",action:"开始深海冒险",category:"MEMORY · COALESCING"},
  {id:"castle",name:"CACHE CASTLE",ch:"缓存城堡",x:205,y:173,kind:"planned",href:null,action:"尚未开放",category:"SHARED MEMORY · CACHE"},
  {id:"forge",name:"TENSOR FORGE",ch:"矩阵熔炉",x:485,y:165,kind:"planned",href:null,action:"尚未开放",category:"GEMM · TENSOR CORES"},
  {id:"cluster",name:"CLUSTER COMMAND",ch:"集群指挥部",x:485,y:440,kind:"planned",href:null,action:"尚未开放",category:"MULTI-GPU · COMMUNICATION"}
]);
export const BOUNDS=Object.freeze({minX:44,maxX:916,minY:120,maxY:488});
export const INTERACTION_DISTANCE=78;
export function clampPlayer({x,y},bounds=BOUNDS){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new RangeError("Invalid position");
 return {x:Math.max(bounds.minX,Math.min(bounds.maxX,x)),y:Math.max(bounds.minY,Math.min(bounds.maxY,y))};
}
export function stepPlayer(position,direction,dt,speed=190){
 if(!Number.isFinite(dt)||dt<0||dt>1||!Number.isFinite(speed)||speed<0)throw new RangeError("Invalid movement");
 let dx=Number(Boolean(direction.right))-Number(Boolean(direction.left));
 let dy=Number(Boolean(direction.down))-Number(Boolean(direction.up));
 const size=Math.hypot(dx,dy)||1;dx/=size;dy/=size;
 return clampPlayer({x:position.x+dx*dt*speed,y:position.y+dy*dt*speed});
}
export function closestDistrict(position,list=DISTRICTS){
 const sorted=list.map(d=>({...d,distance:Math.hypot(position.x-d.x,position.y-d.y)})).sort((a,b)=>a.distance-b.distance);
 return sorted[0]??null;
}
export function currentInteraction(position,list=DISTRICTS,range=INTERACTION_DISTANCE){
 const candidate=closestDistrict(position,list);
 return candidate&&candidate.distance<=range?candidate:null;
}
export function districtLink(d){
 if(!d||d.kind==="planned")return null;
 return d.href;
}
