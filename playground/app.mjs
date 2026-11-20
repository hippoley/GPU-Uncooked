import { simulate } from "./model.mjs";
import { advanceScene, initialScene } from "./scene.mjs";
const ids = ["cooks", "cook-time", "ingredients", "orders"];
const byId = id => document.getElementById(id);
const defaults = { cooks: 8, "cook-time": 8, ingredients: 4, orders: 1000 };
let scene = initialScene(), running = true, lastFrame = null;
const current = () => ({ cooks:+byId("cooks").value, cookSeconds:+byId("cook-time").value,
  ingredientRate:+byId("ingredients").value, orders:+byId("orders").value });
function resetScene() { scene=initialScene(); lastFrame=null; running=true; byId("pause").textContent="Pause animation"; }
function render() {
  for (const id of ids) byId(id + "-value").value = byId(id).value;
  const p=current(), s=simulate(p);
  byId("throughput").textContent=s.throughput.toFixed(2);
  byId("duration").textContent=s.estimatedSeconds.toFixed(1)+"s";
  byId("compute-label").textContent=s.computeCapacity.toFixed(2)+" meals/s";
  byId("supply-label").textContent=s.ingredientRate.toFixed(2)+" meals/s";
  const denominator=Math.max(s.computeCapacity,s.ingredientRate);
  byId("compute-bar").style.width=(100*s.computeCapacity/denominator)+"%";
  byId("supply-bar").style.width=(100*s.ingredientRate/denominator)+"%";
  const stories={
    supply:["PANTRY BOTTLENECK","Hiring more cooks will not increase throughput. Improve ingredient supply or reduce movement."],
    compute:["COOK BOTTLENECK","The pantry has capacity to spare. More cooks or less work per meal can help."],
    balanced:["BALANCED CAPACITY","Cooking and supply ceilings meet. Increasing only one may simply expose the other."]
  };
  const [heading,insight]=stories[s.bottleneck];
  byId("diagnosis").textContent=heading;
  byId("lesson").textContent=insight;
  byId("scene-status").textContent=s.bottleneck==="supply"?"The pantry can't keep up. Watch the waiting cooks.":s.bottleneck==="compute"?"Cooks are at capacity. The pantry has room.":"Two capacities are exactly matched.";
  drawScene();
}
function drawScene(){
  const p=current();
  const f=advanceScene(scene,p,0);
  byId("remaining").textContent=f.remaining.toLocaleString();
  byId("served").textContent=Math.floor(f.completed).toLocaleString();
  byId("active-cooks").textContent=f.activeCooks.toLocaleString();
  byId("waiting-cooks").textContent=f.waitingCooks.toLocaleString();
  byId("order-fill").style.width=(f.progress*100).toFixed(1)+"%";
  byId("order-fill").setAttribute("aria-valuenow",String(Math.round(f.progress*100)));
  // A representative 24-station display: the underlying model can contain up to 128 cooks.
  const visible=Math.min(p.cooks,24);
  const busy=Math.min(visible,Math.round(f.activeCooks/p.cooks*visible));
  const stations=byId("stations");
  const key=visible+":"+busy;
  if(stations.dataset.frame!==key){
    stations.replaceChildren();
    for(let i=0;i<visible;i++){
      const cell=document.createElement("div");
      cell.className="station "+(i<busy?"working":"waiting");
      cell.textContent=i<busy?"🍳":"💤";
      cell.title=i<busy?"Cooking (representative station)":"Waiting for ingredients (representative station)";
      stations.append(cell);
    }
    stations.dataset.frame=key;
  }
  const flow=byId("supply-flow");
  const ratio=Math.min(1,p.ingredientRate/Math.max(p.ingredientRate,p.cooks/p.cookSeconds));
  flow.style.setProperty("--flow-speed",(2.5/Math.max(.2,ratio)).toFixed(2)+"s");
  byId("scene-time").textContent=f.elapsed.toFixed(1)+" simulated seconds";
}
function tick(timestamp){
  if(lastFrame===null)lastFrame=timestamp;
  const dt=Math.min(.1,Math.max(0,(timestamp-lastFrame)/1000));
  lastFrame=timestamp;
  if(running){
    // 12 simulated seconds per real second. This is an illustrative playback scale.
    scene=advanceScene(scene,current(),dt*12);
    if(scene.finished){running=false;byId("pause").textContent="Restart animation";}
  }
  drawScene();
  requestAnimationFrame(tick);
}
for(const id of ids)byId(id).addEventListener("input",()=>{resetScene();render();});
byId("reset").addEventListener("click",()=>{for(const [id,value] of Object.entries(defaults))byId(id).value=value;resetScene();render();});
byId("challenge").addEventListener("click",()=>{
 byId("cooks").value=96;byId("cook-time").value=8;byId("ingredients").value=2;byId("orders").value=1000;resetScene();render();
});
byId("pause").addEventListener("click",()=>{
 if(scene.completed>=current().orders)resetScene();
 else running=!running;
 byId("pause").textContent=running?"Pause animation":"Resume animation";
});
render();
if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
 running=false;byId("pause").textContent="Play animation";
}else requestAnimationFrame(tick);
