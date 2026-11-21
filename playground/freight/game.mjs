import {stripedManifest,seededManifest,contiguousManifest,manifestFootprint,swapRequests,consolidateSector,regroupManifest,evaluateDispatch,STARTING_BUDGET,sectorOf} from "./physics.mjs";
const $=id=>document.getElementById(id);
let level=0,selection=null,manifest=stripedManifest(),sortActions=0,totalCredits=0,busy=false,completed=false;
const initial=i=>i===0?stripedManifest():seededManifest(i===1?241:892);
function render(){
 const footprint=manifestFootprint(manifest);
 $("job").textContent=String(level+1).padStart(2,"0")+" / 03";
 $("sectors").textContent=String(footprint.sectors);
 $("budget").textContent=String(STARTING_BUDGET);
 $("credits").textContent=String(totalCredits).padStart(3,"0");
 $("budget-fill").style.width=Math.min(100,footprint.sectors/STARTING_BUDGET*100)+"%";
 $("budget-fill").style.background=footprint.sectors<=STARTING_BUDGET?"linear-gradient(90deg,#70e5ba,#f7c58a)":"linear-gradient(90deg,#df7d8e,#ed4e73)";
 $("prediction").textContent=footprint.sectors<=STARTING_BUDGET?
 "预计占用 "+footprint.sectors+" 个扇区，可以发车。四支车队全部完成时获得佣金。":
 "预计占用 "+footprint.sectors+" 个扇区，超出 "+STARTING_BUDGET+" 扇区的运输预算。尝试重新组织货箱。";
 $("selection").textContent=selection===null?"点击两个货箱进行交换":"已选中 "+Math.floor(selection/32+1)+" 号车队 · 第 "+(selection%32+1)+" 位";
 $("dispatch").disabled=busy||completed;$("regroup").disabled=busy||completed;$("reset").disabled=busy||completed;$("consolidate").disabled=busy||completed||selection===null;
 const root=$("fleets");root.replaceChildren();
 for(let i=0;i<4;i++){
  const fleet=document.createElement("div");fleet.className="fleet";
  const header=document.createElement("header");
  const title=document.createElement("span");title.textContent="CONVOY 0"+(i+1);
  const metric=document.createElement("b");metric.textContent=footprint.waves[i].transactions+" SECTORS";
  header.append(title,metric);fleet.append(header);
  const pallets=document.createElement("div");pallets.className="pallets";
  for(let j=0;j<32;j++){
   const slot=i*32+j,address=manifest[slot],sector=sectorOf(address);
   const btn=document.createElement("button");btn.type="button";btn.className="pallet"+(selection===slot?" selected":"");
   btn.style.setProperty("--hue",String(Math.floor(sector*47)%360));
   btn.textContent=String(address).padStart(3,"0");btn.title="工作位 "+(j+1)+"：地址索引 "+address+"，扇区 "+sector;
   btn.setAttribute("aria-label","车队"+(i+1)+"的第"+(j+1)+"个货箱 地址"+address+" 扇区"+sector);
   btn.disabled=busy||completed;
   btn.addEventListener("click",()=>select(slot));
   pallets.append(btn);
  }
  fleet.append(pallets);root.append(fleet);
 }
}
function select(slot){
 if(busy||completed)return;
 if(selection===null){selection=slot;render();return;}
 if(selection!==slot)manifest=swapRequests(manifest,selection,slot);
 selection=null;$("result").hidden=true;render();
}
$("consolidate").addEventListener("click",()=>{
 if(busy||completed||selection===null)return;
 const action=consolidateSector(manifest,selection);
 manifest=action.manifest;selection=null;
 const current=manifestFootprint(manifest);
 const box=$("result");box.hidden=false;
 box.textContent="你把扇区 "+action.sector+" 的货物集中到 "+(action.wave+1)+" 号车队，实际交换 "+action.moves+" 箱；现在总计 "+current.sectors+" 个扇区。再试其他颜色，直到满足预算。";
 render();
});
$("regroup").addEventListener("click",()=>{
 if(busy||completed)return;
 manifest=regroupManifest(manifest);sortActions++;selection=null;$("result").hidden=true;render();
});
$("reset").addEventListener("click",()=>{
 if(busy||completed)return;
 manifest=initial(level);sortActions=0;selection=null;$("result").hidden=true;render();
});
function nextMission(){
 if(level<2){level++;manifest=initial(level);sortActions=0;selection=null;completed=false;$("result").hidden=true;render();return;}
 completed=true;$("dispatch").disabled=true;$("regroup").disabled=true;$("reset").disabled=true;
 try{localStorage.setItem("gpu-uncooked.freight.v1",JSON.stringify({completed:true,credits:totalCredits,chapter:"freight",version:1}))}catch{ /* private mode still supports play */ }
 const a=document.createElement("a");a.href="../chapters/03-memory-coalescing/index.html";a.textContent="进入 CUDA Lab：验证你的装载直觉 →";a.style.cssText="display:inline-block;margin-top:9px;color:#aefff1;font-weight:900";
 $("result").append(document.createElement("br"),a);
 const b=document.createElement("button");b.className="action secondary";b.textContent="重新挑战三份委托";b.style.marginTop="12px";b.onclick=()=>{level=0;manifest=initial(level);sortActions=0;totalCredits=0;completed=false;selection=null;$("result").hidden=true;render()};
 $("result").append(document.createElement("br"),b);
}
$("dispatch").addEventListener("click",()=>{
 if(busy||completed)return;
 const ev=evaluateDispatch(manifest,{budget:STARTING_BUDGET,sortActions});
 selection=null;busy=true;const box=$("result");box.hidden=false;
 box.textContent="港口发车中：四支车队请求 "+ev.sectors+" 个对齐扇区，128 个货箱共请求 512B。";
 $("port").classList.remove("depart");void $("port").offsetWidth;$("port").classList.add("depart");
 render();
 // The animation is presentation only; sector evaluation already completed deterministically.
 window.setTimeout(()=>{
  busy=false;$("port").classList.remove("depart");
  if(ev.withinBudget){
   totalCredits+=ev.credits;
   box.textContent=ev.rank+" · 完成第 "+(level+1)+" 份委托！"+ev.sectors+" 个扇区，传输了 "+ev.sectorBytes+"B 对齐扇区覆盖量，货物实际 512B。整备 "+sortActions+" 次；本次获得 "+ev.credits+" credits。";
   const b=document.createElement("button");b.className="action";b.style.marginTop="10px";
   b.textContent=level<2?"接收下一份委托 →":"完成港口战役 · 查看 CUDA 实验 →";
   b.onclick=()=>{b.remove();nextMission()};box.append(document.createElement("br"),b);
   completed=true;
  }else{
   box.textContent="运输预算告急！实际 "+ev.sectors+" 个扇区，预算只有 "+ev.budget+"。任务失败但不扣除已赚奖励。交换货箱或重组仓库后重试。";
  }
  render();
 },600);
});
render();
