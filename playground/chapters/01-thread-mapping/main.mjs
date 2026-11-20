import {layout, threadAt, checkPrediction} from "./model.mjs";
const $=id=>document.getElementById(id);
const code=(n,blockSize,blocks)=>`__global__ void add(const float* a, const float* b, float* c, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) c[i] = a[i] + b[i];
}
// blockDim.x = ${blockSize}; gridDim.x = ${blocks}
add<<<${blocks}, ${blockSize}>>>(a, b, c, ${n});`;
function render() {
 const n=+$("elements").value,b=+$("block-size").value,l=layout(n,b);
 $("n-value").value=n;$("block-value").value=b;
 $("blocks").textContent=l.blocks;$("launched").textContent=l.launched;$("guarded").textContent=l.guarded;
 $("code").textContent=code(n,b,l.blocks);
 const grid=$("grid");grid.replaceChildren();
 for(let k=0;k<l.blocks;k++){
  const section=document.createElement("div");section.className="block";
  const heading=document.createElement("strong");heading.textContent=`Block ${k}`;section.append(heading);
  const cells=document.createElement("div");cells.className="threads";
  for(let t=0;t<b;t++){
    const data=threadAt(k,t,b,n);
    const button=document.createElement("button");button.type="button";button.className="thread"+(data.valid?"":" ghost");
    button.textContent=data.i;button.title=`Block ${k}, thread ${t}, index ${data.i}`;
    button.addEventListener("click",()=>{$("thread-info").textContent=`blockIdx.x=${k}, blockDim.x=${b}, threadIdx.x=${t} → i=${data.i}; ${data.valid?"executes addition":"skipped by i < n"}.`;grid.querySelectorAll(".selected").forEach(el=>el.classList.remove("selected"));button.classList.add("selected");});
    cells.append(button);
  }section.append(cells);grid.append(section);
 }
 $("thread-info").textContent="Select a thread to inspect its logical CUDA index.";
}
["elements","block-size"].forEach(id=>$(id).addEventListener("input",()=>{render();$("feedback").textContent="Predict the new block count."; }));
$("check").addEventListener("click",()=>{
 const answer=Number($("prediction").value);const n=+$("elements").value,b=+$("block-size").value;
 const result=checkPrediction(answer,n,b);
 $("feedback").textContent=result.correct?`Correct! ceil(${n}/${b}) = ${result.actual}. Now click the last block.`:`Not quite. To cover ${n} items with ${b} threads per block, you need ceil(${n}/${b}) = ${result.actual} blocks.`;
});
const challenges=[[33,8],[50,16],[65,32],[73,24],[95,16]];let challengeIndex=0;
$("new-puzzle").addEventListener("click",()=>{
 challengeIndex=(challengeIndex+1)%challenges.length;
 const [n,b]=challenges[challengeIndex];$("elements").value=n;$("block-size").value=b;$("prediction").value="";
 render();$("feedback").textContent="New challenge: how many blocks?";
});
render();
