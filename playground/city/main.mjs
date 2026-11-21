import {DISTRICTS,stepPlayer,closestDistrict,currentInteraction,districtLink} from "./model.mjs";
const $=id=>document.getElementById(id),canvas=$("city"),ctx=canvas.getContext("2d"),g=ctx;
let player={x:469,y:394},mode="intro",t=0,last=null,visited=new Set(),selected=null;
const held=new Set(),sparks=Array.from({length:42},(_,i)=>({x:(i*179)%960,y:(i*127)%540,v:4+i%8}));
const keys={up:["arrowup","w","up"],down:["arrowdown","s","down"],left:["arrowleft","a","left"],right:["arrowright","d","right"]};
const move=()=>Object.fromEntries(Object.entries(keys).map(([k,arr])=>[k,arr.some(x=>held.has(x))]));
function showDialog(d){
 mode="dialog";$("modal").hidden=false;held.clear();
 $("modal-kicker").textContent=d.kind==="planned"?"COMING SOON · CONCEPT DISTRICT":d.kind==="game"?"AVAILABLE · PLAYABLE MISSION":"AVAILABLE · INTERACTIVE CUDA LAB";
 $("modal-title").textContent=d.ch;
 $("modal-message").textContent=d.kind==="planned"?"这个街区未来将开发为独立游戏： "+d.name+"。它不会成为其他章节的换皮版本。现在尚不能进入，避免把规划冒充可玩内容。":
 d.kind==="game"?"今晚的任务：潜入被淹没的海港，回收数据晶体，闪避 Cache Miss 生物，在氧气耗尽前回到平台。通过游戏结算进入 Memory Coalescing 互动实验。":
 "进入 "+d.name+" 的 CUDA 互动实验。真正的独立动作／解谜游戏还在制作中，这里不会把实验室假装成完整游戏。";
 const root=$("modal-actions");root.replaceChildren();
 const href=districtLink(d);if(href){const a=document.createElement("a");a.className="button";a.href=href;a.textContent=d.action+" →";root.append(a)}
 const close=document.createElement("button");close.className="secondary";close.textContent="继续逛街";close.onclick=closeDialog;root.append(close);
}
function closeDialog(){mode="roam";$("modal").hidden=true;held.clear()}
function interact(){if(mode!=="roam")return;const near=currentInteraction(player);if(near){visited.add(near.id);$("explored").innerHTML="DISCOVERED <strong>"+visited.size+" / 6</strong>";showDialog(near)}}
$("start").addEventListener("click",closeDialog);$("interact").addEventListener("click",interact);
document.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
 if(k==="escape"&&mode==="dialog")closeDialog();
 if(k==="e"&&!e.repeat)interact();
 held.add(k);
});
document.addEventListener("keyup",e=>held.delete(e.key.toLowerCase()));window.addEventListener("blur",()=>held.clear());
for(const btn of document.querySelectorAll("[data-key]")){
 const key=btn.dataset.key;
 btn.addEventListener("pointerdown",e=>{e.preventDefault();held.add(key);btn.setPointerCapture?.(e.pointerId)});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])btn.addEventListener(ev,()=>held.delete(key));
}
const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
const text=(s,x,y,size=16,color="#fff2d9")=>{g.font="800 "+size+"px system-ui, sans-serif";g.lineWidth=3;g.strokeStyle="#11122b";g.strokeText(s,x,y);g.fillStyle=color;g.fillText(s,x,y)};
function polygon(points,color){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill()}
function glow(x,y,r,color){const a=g.createRadialGradient(x,y,1,x,y,r);a.addColorStop(0,color);a.addColorStop(1,"transparent");rect(x-r,y-r,r*2,r*2,a)}
function drawBuilding(x,y,w,h,kind,theme){
 const palette={factory:["#68415f","#fa9e78"],rush:["#542e84","#fe7dce"],marina:["#1a5b79","#76e8f1"],castle:["#335e61","#a5e5ad"],forge:["#6c354e","#ffbb74"],cluster:["#334e84","#b8baf5"]};
 const [wall,lit]=palette[theme]||palette.factory; 
 rect(x+7,y+10,w,h,"#090c25");rect(x,y,w,h,wall);
 // roof ledge
 rect(x-7,y-8,w+14,13,lit);rect(x-4,y-5,w+8,4,"#fff1d1");
 for(let row=0;row<Math.floor((h-25)/30);row++)for(let col=0;col<Math.floor((w-16)/25);col++){
   const on=(row*7+col*13+Math.floor(x))%5!==0;
   rect(x+12+col*25,y+22+row*30,12,14,on?lit+"a9":"#101b3d");
   if(on)rect(x+14+col*25,y+25+row*30,7,4,"#fff3cc77");
 }
 rect(x+5,y+h-24,w-10,26,"#19142f");rect(x+8,y+h-23,w-16,3,lit);
 if(kind==="billboard"){rect(x+10,y+5,w-20,25,"#18132f");text("SILICON",x+18,y+25,15,"#ffe7ca")}
}
function cityscape(){
 let sky=g.createLinearGradient(0,0,0,540);sky.addColorStop(0,"#25214e");sky.addColorStop(.35,"#98537a");sky.addColorStop(.63,"#f4a07e");sky.addColorStop(1,"#241d4a");rect(0,0,960,540,sky);
 glow(720,160,240,"#ffe1ac9a");g.beginPath();g.arc(724,161,77,0,Math.PI*2);g.fillStyle="#ffdca7";g.fill();
 // Layered distant downtown
 for(let i=0;i<29;i++){const x=i*39-30,h=38+(i*41)%112;rect(x,187-h,33,h+125,i%3===0?"#623b66":"#58385b");for(let y=198-h;y<189;y+=18)rect(x+10,y,4,7,"#f7bb9380")}
 // ground: overhead perspective and street grid
 polygon([[0,150],[960,150],[960,540],[0,540]],"#34223d");
 rect(0,291,960,157,"#211b32");rect(0,296,960,6,"#70597b");rect(0,435,960,5,"#70597b");
 rect(393,130,142,410,"#202337");rect(401,140,5,400,"#68587f");rect(526,140,5,400,"#68587f");
 for(let x=0;x<960;x+=110){rect(x+24,370,52,4,"#ffcfaa90");rect(x+24,445,52,3,"#a887b767")}
 for(let y=185;y<535;y+=82){rect(460,y,4,32,"#f4c5988b")}
 // waterfront and city blocks
 rect(0,131,960,95,"#31203e");rect(0,216,960,5,"#a86d8e");
 rect(0,469,960,71,"#152b4e");for(let i=0;i<40;i++)rect(i*27,483+(i%4)*11,13,3,"#55b8d93d");
 // four large low-parallax blocks
 drawBuilding(60,175,200,124,"billboard","castle");
 drawBuilding(343,157,225,124,"billboard","forge");
 drawBuilding(679,167,224,119,"billboard","marina");
 drawBuilding(62,381,208,125,"factory","factory");
 drawBuilding(686,375,212,126,"rush","rush");
 // transit islands, street posts
 for(const [x,y] of [[332,300],[605,300],[332,475],[605,475]]){
  rect(x-5,y,10,68,"#151629");glow(x,y,50,"#ffc78444");rect(x-8,y-9,16,14,"#ffe1a3");
 }
 // luminous curb rain reflections
 for(let i=0;i<20;i++){const x=21+i*47,y=312+(i%5)*31;rect(x,y,25+(i%3)*13,2,i%2?"#ef7fc759":"#7cbdf454")}
 // passing transit cars in distant road
 const carx=(t*32)%1120-100;rect(carx,274,96,20,"#a13868");rect(carx+10,263,61,14,"#461c4e");rect(carx+8,292,17,7,"#131827");rect(carx+68,292,17,7,"#131827");glow(carx+95,282,35,"#ffaeb349");
 for(let i=0;i<12;i++){const x=i*91+32,y=500+(i%3)*7;glow(x,y,14,"#35dce94a")}
}
function districtSigns(){
 for(const d of DISTRICTS){
  const dist=Math.hypot(player.x-d.x,player.y-d.y),near=dist<=78,enabled=d.kind!=="planned";
  g.save();g.translate(d.x,d.y);
  glow(0,0,near?76:47,enabled?"#6cebd349":"#ee96e035");
  g.lineWidth=near?4:2;g.strokeStyle=enabled?"#89fff0":"#e6a3e3";g.beginPath();g.ellipse(0,4,near?32:25,13,0,0,Math.PI*2);g.stroke();
  const bob=Math.sin(t*2+d.x)*5;
  polygon([[0,-55+bob],[13,-40+bob],[0,-23+bob],[-13,-40+bob]],enabled?"#ffdc95":"#cd9ee7");
  g.font="bold 11px system-ui,sans-serif";
  const ww=Math.max(125,g.measureText(d.name).width+20);
  rect(-ww/2,-83+bob,ww,19,near?"#471c54eb":"#0b1326dc");g.fillStyle=near?"#fff3bd":"#d8e7ee";g.textAlign="center";g.fillText(d.name,0,-69+bob);g.textAlign="start";
  if(near){rect(-49,20,98,22,"#ffe0a5");text("E · INTERACT",-42,36,12,"#241e39")}
  g.restore();
 }
}
function avatar(){
 const x=player.x,y=player.y+Math.sin(t*7)*1.5;
 glow(x,y,25,"#ffe6a94a");
 // shadow
 g.fillStyle="#070d1faa";g.beginPath();g.ellipse(x,y+12,15,5,0,0,Math.PI*2);g.fill();
 // legs, jacket, head: recognizable original courier silhouette
 rect(x-8,y+1,7,12,"#2a2257");rect(x+2,y+1,7,12,"#25204d");
 rect(x-12,y-17,24,21,"#f3aa71");rect(x-9,y-14,18,15,"#254e78");rect(x-7,y-37,14,18,"#fed1a9");
 rect(x-13,y-36,26,8,"#362450");rect(x-4,y-34,7,5,"#f0c576");
 rect(x-14,y-12,5,15,"#f2b89b");rect(x+11,y-12,5,15,"#f2b89b");
 rect(x-11,y-6,4,7,"#75fbdd");glow(x-10,y-3,10,"#43ffe74f");
}
function update(dt){
 t+=dt;
 for(const s of sparks){s.y-=s.v*dt;s.x+=Math.sin(t+s.y)*dt*2;if(s.y<0)s.y=540}
 if(mode==="roam"){
  player=stepPlayer(player,move(),dt);
  const d=closestDistrict(player),near=currentInteraction(player);
  $("mission-name").textContent=near?near.ch:"寻找下一个街区";
  $("mission-info").textContent=near?(near.kind==="planned"?"这里正在建设。按 E 了解未来游戏。":near.action+" · 按 E 进入"):"穿过城市，靠近发光的任务地点。";
  $("prompt").textContent=near?"E · 进入 "+near.name:"WASD / 方向键移动";
 }
}
function draw(){
 g.imageSmoothingEnabled=false;
 cityscape();
 for(const s of sparks){rect(s.x,s.y,1.5,1.5,"#d8f8f778")}
 districtSigns();avatar();
 // foreground scanlines + vignette
 for(let y=0;y<540;y+=4)rect(0,y,960,.35,"#07112625");
 const v=g.createRadialGradient(480,265,140,480,270,615);v.addColorStop(0,"#0000");v.addColorStop(1,"#06091894");rect(0,0,960,540,v);
}
function loop(ms){const dt=Math.min(.045,Math.max(0,(ms-(last??ms))/1000));last=ms;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
