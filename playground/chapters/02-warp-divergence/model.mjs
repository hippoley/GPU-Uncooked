/** 32-lane control-flow teaching model; no GPU cycles are simulated. */
export const WARP_SIZE = 32;
export function evaluate(mask) {
  if (!Array.isArray(mask) || mask.length !== WARP_SIZE || mask.some(x => x !== 0 && x !== 1))
    throw new RangeError("A warp must contain exactly 32 binary decisions");
  const a = mask.reduce((sum,x) => sum+x,0), b=WARP_SIZE-a;
  return {
    a,b,divergent:a>0&&b>0,
    activePaths:Number(a>0)+Number(b>0),
    maskA:mask.map(x=>x===1),
    maskB:mask.map(x=>x===0),
    // For equal-length instructions per path, this is a conceptual lane utilization proxy, NOT a timing ratio.
    illustrativeLaneUtilization:WARP_SIZE/(WARP_SIZE*(Number(a>0)+Number(b>0)))
  };
}
export function preset(name) {
  if(name==="uniform-a")return Array(WARP_SIZE).fill(1);
  if(name==="uniform-b")return Array(WARP_SIZE).fill(0);
  if(name==="half")return Array.from({length:WARP_SIZE},(_,i)=>Number(i<16));
  if(name==="alternating")return Array.from({length:WARP_SIZE},(_,i)=>Number(i%2===0));
  if(name==="one")return Array.from({length:WARP_SIZE},(_,i)=>Number(i===0));
  throw new RangeError("Unknown preset");
}
export function toggle(mask,index) {
  if(!Number.isInteger(index)||index<0||index>=WARP_SIZE)throw new RangeError("Lane out of bounds");
  evaluate(mask);
  return mask.map((x,i)=>i===index?1-x:x);
}
export function checkAnswer(mask,answer) {
  return {correct:Number.isInteger(answer)&&answer===evaluate(mask).activePaths,paths:evaluate(mask).activePaths};
}
