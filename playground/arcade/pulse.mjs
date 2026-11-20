/** Original arcade mechanic. Spatial selection does not assert physical GPU warp transactions. */
export function pulseTargets(items,x,y,radius=110,maxTargets=8){
 if(!Array.isArray(items)||![x,y,radius,maxTargets].every(Number.isFinite)||radius<=0||maxTargets<1||!Number.isInteger(maxTargets))throw new RangeError("Invalid pulse");
 return items.filter(p=>!p.got&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isInteger(p.index)&&p.index>=0)
  .filter(p=>Math.hypot(p.x-x,p.y-y)<=radius)
  .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||a.index-b.index)
  .slice(0,maxTargets).map(p=>p.index);
}
export function pulseReady(now,lastPulse,cooldown=6){
 if(![now,lastPulse,cooldown].every(Number.isFinite)||cooldown<0)throw new RangeError("Invalid timing");
 return now-lastPulse>=cooldown;
}
