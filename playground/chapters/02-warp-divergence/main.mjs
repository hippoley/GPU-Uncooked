import { evaluate, preset, toggle, checkAnswer } from "./model.mjs";
const $=id=>document.getElementById(id);
let mask=preset("half"), challenge=0, attempted=false, correct=0, attempts=0;
const puzzles=["half","uniform-a","one"];
const cuda=`__global__ void branch_example(float* out) {
  int lane = threadIdx.x & 31;
  // Real CUDA demonstration: uniform vs divergent branch.
  // The compiler may predicate or optimize this conditional.
  if (lane < 16) out[threadIdx.x] = 1.0f;
  else           out[threadIdx.x] = 2.0f;
}`;
function bits(target,chosen){
 const root=$(target);root.replaceChildren();
 for(let i=0;i<32;i++){
  const bit=document.createElement("span");
  bit.className="bit "+(chosen(i)?(target==="mask-a"?"on-a":"on-b"):"");
  bit.title=`lane ${i}: ${chosen(i)?"active":"masked"}`;
  root.append(bit);
 }
}
function render(){
 const s=evaluate(mask), root=$("lanes");root.replaceChildren();
 mask.forEach((value,i)=>{
  const b=document.createElement("button");b.type="button";b.className="lane"+(value?"":" b");
  b.textContent=`${i} · ${value?"A":"B"}`;
  b.setAttribute("aria-label",`Lane ${i}, path ${value?"A":"B"}; click to switch`);
  b.setAttribute("aria-pressed",String(value===1));
  b.addEventListener("click",()=>{mask=toggle(mask,i);render();});
  root.append(b);
 });
 bits("mask-a",i=>s.maskA[i]);bits("mask-b",i=>s.maskB[i]);
 $("count-a").textContent=`${s.a} lanes`;$("count-b").textContent=`${s.b} lanes`;
 $("paths").textContent=s.activePaths;
 $("divergence").textContent=s.divergent?"DIVERGENT":"UNIFORM";
 $("util").textContent=`${Math.round(100*s.illustrativeLaneUtilization)}%`;
 $("cuda").textContent=cuda;
}
function startChallenge(){
 mask=preset(puzzles[challenge]);attempted=false;
 $("challenge-label").textContent=`Challenge ${challenge+1} of ${puzzles.length}`;
 $("feedback").textContent="Predict the number of nonempty paths.";
 render();
}
document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{
 mask=preset(b.dataset.preset);
 $("feedback").textContent="Lab preset changed. Explore the masks.";
 render();
}));
document.querySelectorAll("[data-guess]").forEach(b=>b.addEventListener("click",()=>{
 if(attempted){$("feedback").textContent="Already scored. Select Next challenge.";return;}
 const guess=Number(b.dataset.guess),answer=checkAnswer(mask,guess);
 attempts++;if(answer.correct)correct++;attempted=true;
 $("score").textContent=`${correct} / ${attempts}`;
 $("feedback").textContent=answer.correct?`Correct: ${answer.paths} active path(s). Now inspect the masks.`:`The correct answer is ${answer.paths}. Count only paths with at least one lane.`;
}));
$("next").addEventListener("click",()=>{challenge=(challenge+1)%puzzles.length;startChallenge();});
$("reset").addEventListener("click",()=>{mask=preset("half");render();});
startChallenge();
