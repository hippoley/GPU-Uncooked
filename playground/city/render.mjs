/* Original vector-illustrated cyber-noir art, no external game assets. */
const P={
 factory:['#573449','#ffb37c','THREAD DEPOT'],rush:['#412550','#ff72b7','WARP EXPRESS'],
 marina:['#194a68','#7be9e2','MEMORY BAY'],castle:['#304b4f','#b2e6a5','CACHE BANK'],
 forge:['#693d49','#ffbd7c','TENSOR WORKS'],cluster:['#344775','#adaef8','CLUSTER PORT']
};
export function cameraFor(player,previous={x:480,y:270},dt=0,zoom=1.12){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid camera');
 const rx=480/zoom,ry=270/zoom,s=1-Math.exp(-Math.min(dt,.1)*5.5);
 const x=Math.min(960-rx,Math.max(rx,player.x)),y=Math.min(540-ry,Math.max(ry,player.y));
 return {x:previous.x+(x-previous.x)*s,y:previous.y+(y-previous.y)*s,zoom};
}
export function drawCity(g,s){
 const {time:t=0,player,districts=[],visited=new Set(),cars=[],npcs=[],rain=[]}=s;
 const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
 const poly=(v,c)=>{g.beginPath();v.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=c;g.fill()};
 const gradient=(x,y,w,h,a,b)=>{const z=g.createLinearGradient(x,y,x,y+h);z.addColorStop(0,a);z.addColorStop(1,b);R(x,y,w,h,z)};
 const glow=(x,y,r,c)=>{const z=g.createRadialGradient(x,y,1,x,y,r);z.addColorStop(0,c);z.addColorStop(1,'#0000');R(x-r,y-r,r*2,r*2,z)};
 const txt=(v,x,y,sz,col='#ffe8d2')=>{g.fillStyle=col;g.font='900 '+sz+'px system-ui,sans-serif';g.fillText(v,x,y)};
 const line=(a,b,c,w=2)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke()};
 const seed=n=>(Math.sin(n*92.3+33)*41879.15)%1;
 g.save();g.imageSmoothingEnabled=true;
 gradient(0,0,960,540,'#201637','#b65c83');glow(710,123,285,'#ffab8880');
 g.fillStyle='#ffe0b6';g.beginPath();g.arc(706,130,53,0,Math.PI*2);g.fill();
 // Layered cityscape, lit towers and volumetric dusk
 for(let i=0;i<32;i++){
  const x=i*32-20,h=47+(i*37)%135;R(x,205-h,25,h+100,i%3?'#644264':'#493455');
  for(let j=0;j<6;j++)if((i+j)%4)R(x+6+(j%2)*10,208-h+Math.floor(j/2)*16,3,6,'#ffc59a7c');
 }
 gradient(0,214,960,326,'#32213f','#111b31');glow(480,230,230,'#ed77ba1c');
 // Readable road/sidewalk geometry with reflection streaks
 R(0,290,960,155,'#1a1d32');R(0,297,960,5,'#865d7b');R(0,438,960,4,'#765779');
 R(393,138,143,402,'#202437');R(400,138,4,402,'#755d83');R(529,138,4,402,'#755d83');
 for(let x=18;x<960;x+=109){R(x,365,48,3,'#f7c49b84');R(x,431,48,2,'#d5aaab63')}
 for(let y=172;y<540;y+=74)R(461,y,4,31,'#f9cc9b8f');
 R(0,126,960,96,'#30213e');R(0,218,960,5,'#bc748f');
 gradient(0,473,960,67,'#1c3555','#0d253b');
 for(let i=0;i<75;i++)R((i*57)%960,480+(i%6)*9,9+(i%5)*8,2,i%3?'#77d2ed66':'#ff9bb177');
 // Architectural blocks, differentiated storefronts, extruded side walls
 const buildings=[
  [45,169,250,125,'castle'],[343,148,255,137,'forge'],[657,160,268,131,'marina'],
  [46,430,252,106,'factory'],[658,430,267,106,'rush']
 ];
 const drawBuilding=(b,index)=>{
  const [x,y,w,h,id]=b,[wall,accent,sign]=P[id];
  poly([[x+w,y+8],[x+w+17,y+21],[x+w+17,y+h+18],[x+w,y+h]],'#12182c');
  gradient(x,y,w,h,wall,'#251c37');R(x-6,y,w+12,9,accent);
  poly([[x-6,y],[x+11,y-13],[x+w+7,y-13],[x+w,y]],accent);
  for(let row=0;row<3;row++)for(let col=0;col<7;col++){
   const wx=x+19+col*(w-37)/7,wy=y+34+row*25,lit=(row*7+col+index)%5!==0;
   R(wx,wy,18,15,'#0a1931');R(wx+2,wy+1,13,11,lit?accent+'b4':'#22374b');R(wx+8,wy+2,2,10,'#172639aa');
  }
  R(x+8,y+h-29,w-16,29,'#10172d');
  for(let col=0;col<7;col++)R(x+13+col*(w-30)/7,y+h-26,24,24,col%2?'#253e58':'#1c354a');
  R(x+11,y+h-32,w-22,3,accent);
  R(x+30,y+12,w-60,24,'#101429ee');glow(x+w/2,y+24,68,accent+'4c');
  g.textAlign='center';txt(sign,x+w/2,y+29,15,accent);g.textAlign='start';
  if(id==='marina'){R(x+w-40,y-40,5,35,'#89e9ed');R(x+w-59,y-34,43,5,'#7ce8d7')}
  if(id==='forge')for(let n=0;n<3;n++){R(x+28+n*79,y-30,17,20,'#39243b');glow(x+36+n*79,y-34,23,'#ffbf8960')}
  if(id==='rush')for(let n=0;n<3;n++)R(x+12,y+h+2+n*5,w-24,2,'#ff6fc8');
 };
 buildings.forEach(drawBuilding);
 // Environment props: street lamps, foliage, warm reflections
 for(const [x,y] of [[322,294],[611,294],[321,449],[613,449]]){
  R(x,y-10,7,57,'#13172b');glow(x+3,y-16,40,'#ffd3a661');R(x-10,y-28,28,14,'#fff0c4');R(x-6,y-25,20,4,'#fffbe1');
 }
 for(const [x,y] of [[289,331],[630,332],[288,464],[626,464]]){
  R(x,y,5,37,'#122d35');glow(x+2,y-25,32,'#48f7c745');g.fillStyle='#227477';g.beginPath();g.ellipse(x,y-13,20,16,0,0,Math.PI*2);g.fill();
  g.fillStyle='#37a792';g.beginPath();g.ellipse(x+10,y-24,14,11,0,0,Math.PI*2);g.fill();
 }
 // Moving traffic. Every car has original wheel/body/headlight silhouettes.
 for(const car of cars){
  const x=car.x,y=car.y;g.save();g.translate(x,y);g.scale(car.dir,1);
  glow(32,-2,40,'#ffcc9560');poly([[-47,-12],[-28,-26],[17,-26],[43,-12],[47,4],[-48,4]],car.color);
  poly([[-20,-24],[16,-24],[27,-12],[-33,-12]],'#19374f');R(-42,-7,9,6,'#ffc9a2');R(37,-8,9,7,'#fff5d1');
  for(const wheel of [-29,27]){g.fillStyle='#0c1321';g.beginPath();g.arc(wheel,5,9,0,2*Math.PI);g.fill();g.fillStyle='#7ba6b8';g.beginPath();g.arc(wheel,5,4,0,2*Math.PI);g.fill()}
  g.restore();
 }
 for(let i=0;i<35;i++)R((i*57)%960,309+(i*39)%155,16+(i%4)*9,1,i%2?'#fa90be58':'#77deea4c');
 const actor=(x,y,color,walk,scale=1)=>{
  g.save();g.translate(x,y);g.scale(scale,scale);
  g.fillStyle='#07121d99';g.beginPath();g.ellipse(0,10,12,4,0,0,2*Math.PI);g.fill();
  const w=Math.sin(walk)*4;line([-4,0],[-6+w,12],'#20243b',4);line([4,0],[6-w,12],'#20243b',4);
  R(-8,-17,16,21,color);R(-6,-28,12,13,'#f7c7a5');R(-8,-29,16,6,'#29243f');
  line([-7,-13],[-12-w*.5,0],color,4);line([7,-13],[12+w*.5,0],color,4);g.restore();
 };
 for(const npc of npcs)actor(npc.x,npc.y,npc.color,t*3+npc.phase,.82);
 // Mission markers fade into the architecture; only the nearest one shows a large label
 for(const d of districts){
  const near=Math.hypot(player.x-d.x,player.y-d.y)<=78,active=d.kind!=='planned';
  glow(d.x,d.y,near?70:35,active?'#60f5dd4b':'#c689f43a');
  g.beginPath();g.ellipse(d.x,d.y+9,near?33:24,11,0,0,Math.PI*2);g.strokeStyle=active?'#78f4dd':'#b98fce';g.lineWidth=near?4:2;g.stroke();
  const bob=Math.sin(t*2+d.x)*5;
  poly([[d.x,d.y-50+bob],[d.x+11,d.y-38+bob],[d.x,d.y-24+bob],[d.x-11,d.y-38+bob]],active?'#ffdd9f':'#b99be3');
  if(near){R(d.x-74,d.y-88+bob,148,24,'#0a172beb');g.textAlign='center';txt(d.name,d.x,d.y-71+bob,12,'#ffe8c3');g.textAlign='start'}
 }
 actor(player.x,player.y,'#ed9c71',Math.abs(player.vx||0)+Math.abs(player.vy||0)>1?t*11:0,1.12);
 R(player.x+7,player.y-10,7,11,'#46d5af');glow(player.x-7,player.y-6,19,'#71f9ce42');
 for(const drop of rain){line([drop.x,drop.y],[drop.x-6,drop.y+13],'#d9e7ff30',.8)}
 const vignette=g.createRadialGradient(480,270,120,480,270,615);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#08081c8c');R(0,0,960,540,vignette);
 g.restore();
}
