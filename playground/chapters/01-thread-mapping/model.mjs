/** Chapter 01: CUDA logical grid mapping. No GPU is executed here. */
export function layout(n, blockSize) {
  if(!Number.isInteger(n)||n<1||n>4096||!Number.isInteger(blockSize)||blockSize<1||blockSize>1024) throw new RangeError("Invalid CUDA launch");
  const blocks=Math.ceil(n/blockSize), launched=blocks*blockSize;
  return {n,blockSize,blocks,launched,active:n,guarded:launched-n,
    threads:Array.from({length:launched},(_,i)=>({global:i,block:Math.floor(i/blockSize),thread:i%blockSize,valid:i<n}))};
}
export function threadAt(block,thread,blockSize,n) {
  if(!Number.isInteger(block)||block<0||!Number.isInteger(thread)||thread<0||thread>=blockSize)throw new RangeError("Invalid thread");
  const i=block*blockSize+thread;
  return {i,valid:i<n};
}
export function checkPrediction(prediction,n,blockSize) {
  const actual=layout(n,blockSize).blocks;
  return {correct:Number.isInteger(prediction)&&prediction===actual,actual};
}
