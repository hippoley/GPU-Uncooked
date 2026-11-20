import {analyze,grade} from "./model.mjs";
const $=id=>document.getElementById(id);
let attempts=0,correct=0,attempted=false,challenge=0;
const challenges=[[1,0],[1,1],[2,0],[8,0],[4,3]];
const backgrounds=["#256b60","#605195","#345d8c","#8a603a","#566c37","#7b445f"];
function config(){return {stride:+$("stride").value,offset:+$("offset").value};}
function draw(){
 const {stride,offset}=config(),s=analyze({stride,offset});
 $("stride-value").value=stride;$("offset-value").value=offset;
 $("requested").textContent=s.requestedBytes+" B";
 $("sectors").textContent=s.uniqueSectors;
 $("fraction").textContent=(s.usefulFraction*100).toFixed(1)+"%";
 $("code").textContent=`// One lane, one float: addresses determined by stride and offset
int i = blockIdx.x * blockDim.x + threadIdx.x;
int source_index = ${offset} + i * ${stride};
output[i] = input[source_index];
// For warp 0: 32 lanes request 128 useful bytes`;
 const root=$("lanes");root.replaceChildren();
 for(let i=0;i<32;i++){
  const lane=document.createElement("button");lane.type="button";lane.className="lane";
  lane.textContent=i;lane.style.background=backgrounds[s.sectors.indexOf(s.ids[i])%backgrounds.length];
  lane.setAttribute("aria-label",`Lane ${i}, byte address ${s.addresses[i]}, sector ${s.ids[i]}`);
  lane.addEventListener("click",()=>{
   root.querySelectorAll(".selected").forEach(x=>x.classList.remove("selected"));lane.classList.add("selected");
   $("lane-info").textContent=`Lane ${i} → input[${offset+i*stride}] → byte address ${s.addresses[i]} → sector ${s.ids[i]} (bytes ${s.ids[i]*32}–${s.ids[i]*32+31}).`;
  });
  root.append(lane);
 }
 const sectors=$("sector-list");sectors.replaceChildren();
 for(const id of s.sectors){const span=document.createElement("span");span.className="sector";span.textContent=`#${id}: ${id*32}–${id*32+31}`;sectors.append(span);}
 $("lane-info").textContent="Select a lane to inspect its load address and touched sector.";
}
function update(){attempted=false;$("feedback").textContent="Predict unique sectors, then check your answer.";draw();}
for(const id of ["stride","offset"])$(id).addEventListener("input",update);
document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{
 const patterns={aligned:[1,0],misaligned:[1,1],stride2:[2,0],stride8:[8,0]};
 [$("stride").value,$("offset").value]=patterns[b.dataset.preset];update();
}));
$("check").addEventListener("click",()=>{
 if(attempted){$("feedback").textContent="Already scored. Choose another challenge.";return;}
 const value=$("guess").value.trim();if(!value){$("feedback").textContent="Enter your prediction first.";return;}
 const answer=grade(Number(value),config());attempted=true;attempts++;if(answer.correct)correct++;
 $("score").textContent=`${correct} / ${attempts}`;
 $("feedback").textContent=answer.correct?`Correct! Exactly ${answer.answer} distinct aligned 32-byte sectors are touched.`:`The address model touches ${answer.answer} sectors. Change stride and select lanes to see why.`;
});
$("next").addEventListener("click",()=>{
 challenge=(challenge+1)%challenges.length;
 [$("stride").value,$("offset").value]=challenges[challenge];$("guess").value="";update();
});
draw();
