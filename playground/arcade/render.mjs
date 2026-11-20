/* GPU Uncooked original procedural art direction — no third-party sprites or fonts.
   Uses a fixed 960x540 world and deliberately separates rendering from game mechanics. */
export function renderWorld(g,s){
 const {time=0,ship,stones=[],enemies=[],bubbles=[],particles=[],pulseRing=0,phase,signal="",signalUntil=0,count=0,oxygen=100}=s;
 const W=960,H=540;
 const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
 const line=(pts,color,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()};
 const glow=(x,y,r,color)=>{const gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,"transparent");g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)};
 const label=(text,x,y,size=13,color="#d1f6f4")=>{g.font="800 "+size+"px ui-monospace,monospace";g.textBaseline="middle";g.fillStyle="#052033";g.fillText(text,x+2,y+2);g.fillStyle=color;g.fillText(text,x,y)};
 const poly=(points,color)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill()};
 const rand=(seed)=>{let v=Math.sin(seed*127.1+78.233)*43758.5453;return v-Math.floor(v)};
 const sea=g.createLinearGradient(0,0,0,H);sea.addColorStop(0,"#1282a5");sea.addColorStop(.23,"#0b5b83");sea.addColorStop(.62,"#073454");sea.addColorStop(1,"#05182f");rect(0,0,W,H,sea);
 // Surface, luminous rays and distant water layers
 for(let i=0;i<11;i++){const x=i*103-55+Math.sin(time*.23+i)*12;poly([[x,47],[x+40,47],[x+200,510],[x+85,510]],i%2?"#54deee08":"#b9faff09")}
 for(let i=0;i<19;i++){const x=i*57;g.beginPath();g.ellipse(x,51+Math.sin(time*1.3+i*.8)*3,40,7,0,0,7);g.fillStyle=i%2?"#7ef9f34c":"#bcffff55";g.fill()}
 // Giant silhouette / depth and landmarks
 glow(490,196,155,"#0fa1ca24");
 g.save();g.translate(472,208);g.rotate(-.12);g.strokeStyle="#0e4d6e";g.lineWidth=20;g.beginPath();g.arc(0,0,98,0,Math.PI*2);g.stroke();g.strokeStyle="#237b8b";g.lineWidth=4;g.setLineDash([12,8]);g.beginPath();g.arc(0,0,97,0,Math.PI*2);g.stroke();g.setLineDash([]);g.restore();
 for(let i=0;i<23;i++){const x=i*51+rand(i)*30,y=210+rand(i+11)*160;rect(x,y,28+rand(i+12)*34,H-y,"#082d49");if(i%3===0){rect(x+10,y+20,4,5,"#146179");rect(x+23,y+32,4,5,"#146179")}}
 // Whale silhouette in background
 g.save();g.globalAlpha=.19;g.translate(708+Math.sin(time*.08)*35,145);g.fillStyle="#021b32";g.beginPath();g.ellipse(0,0,96,22,-.05,0,Math.PI*2);g.fill();poly([[-75,0],[-119,-21],[-110,19]],"#021b32");poly([[48,-4],[85,-20],[77,-2]],"#021b32");g.restore();
 // Cache ruins arches — permanent landmarks
 const arch=(x,y,w,h,kind)=>{
   rect(x,y,w,15,"#184964");rect(x+7,y+9,w-14,7,"#347f86");rect(x+9,y+14,18,h-14,"#164660");rect(x+w-27,y+14,18,h-14,"#164660");
   for(let k=0;k<Math.floor(w/35);k++){rect(x+12+k*35,y-2,28,8,k%2?"#255875":"#396b70");if(k%3===0)rect(x+18+k*35,y+1,7,3,"#64d7b7")}
   glow(x+w*.5,y+13,35,"#30efcd39");label(kind,x+w*.22,y+7,14,"#a0d8cf");
   for(let i=0;i<4;i++)rect(x+12+i*18,y+14+Math.sin(i)*4,4,5,"#ffcf7b");
 };
 arch(675,260,250,205,"L2 CACHE");arch(65,318,170,180,"GLOBAL MEMORY");
 // Foreground rocks and reef
 poly([[0,440],[70,423],[132,455],[212,438],[307,472],[384,455],[485,487],[607,455],[704,475],[833,446],[960,467],[960,540],[0,540]],"#08263a");
 poly([[0,472],[64,462],[132,486],[265,464],[370,492],[498,481],[605,500],[719,479],[835,491],[950,465],[960,540],[0,540]],"#113b4a");
 for(let i=0;i<31;i++){
  const x=i*37+rand(i+70)*30,y=466+rand(i+92)*63,h=16+rand(i+117)*42;
  const color=i%3===0?"#ff75bf":i%3===1?"#a85cdb":"#30bfb6";g.strokeStyle=color;g.lineWidth=3+(i%2);g.lineCap="round";
  g.beginPath();g.moveTo(x,y+h);g.quadraticCurveTo(x-8,y+h/2,x+Math.sin(time*1.2+i)*7,y);g.stroke();
  g.beginPath();g.moveTo(x,y+h*.75);g.lineTo(x+11,y+h*.47);g.stroke();glow(x,y,10,color+"35");
 }
 // Circuit lines embedded in reef
 for(let i=0;i<13;i++){let x=i*77+20,y=496+(i%4)*10;line([[x,y],[x+23,y],[x+30,y-7],[x+47,y-7]],"#15a9a4",2);glow(x+47,y-7,8,"#8cfee777")}
 // Animated jellyfish as ambience
 for(let i=0;i<9;i++){
  const x=75+i*103+Math.sin(time*.7+i)*15,y=145+(i%4)*43+Math.sin(time+i)*13;
  glow(x,y,28,"#b66af43a");g.fillStyle=i%2?"#bb83f9":"#6ee8ed";g.beginPath();g.arc(x,y,10,Math.PI,0);g.lineTo(x+10,y+5);g.lineTo(x-10,y+5);g.fill();
  for(let k=-1;k<=1;k++)line([[x+k*6,y+5],[x+k*6+Math.sin(time*2+k+i)*3,y+19]],"#bcd7ff",1);
  rect(x-4,y-1,2,2,"#273b69");rect(x+3,y-1,2,2,"#273b69");
 }
 for(const bubble of bubbles){const alpha=.2+.2*Math.sin(time+bubble.x);g.globalAlpha=alpha;g.strokeStyle="#b6f9f8";g.lineWidth=1;g.beginPath();g.arc(bubble.x,bubble.y,Math.max(1.3,bubble.r),0,Math.PI*2);g.stroke()}g.globalAlpha=1;
 // Surface extraction rig
 rect(351,40,259,13,"#114055");rect(368,28,224,15,"#25495c");for(let i=0;i<8;i++){rect(369+i*28,32,16,4,"#f2c273")}
 rect(402,12,100,20,"#15344f");label("EXTRACTION",408,24,12,"#ffe6b1");rect(466,52,5,27,"#ffe5a5");rect(489,52,5,27,"#ffe5a5");
 for(let i=0;i<6;i++)rect(468,58+i*5,24,2,"#cfe4dc");
 glow(470,58,70,"#f9ca5945");label("↑ RETURN TO SURFACE",384,89,13,"#e3fff7");
 // Collectible data with distinct glow, indexing labels
 for(const stone of stones)if(!stone.got){
  const x=stone.x,y=stone.y+Math.sin(time*3+stone.i)*4;
  glow(x,y,37,"#28ffe37d");g.save();g.translate(x,y);g.shadowColor="#a9fef7";g.shadowBlur=16;
  poly([[0,-15],[12,-5],[11,9],[0,18],[-11,8],[-12,-4]],"#48f9e3");poly([[0,-15],[12,-5],[0,4]],"#cffff7");poly([[0,4],[11,9],[0,18]],"#169ba9");
  g.restore();label("0x"+stone.index.toString(16).toUpperCase(),x-16,y-28,10,"#d4fff4");
 }
 // Cache miss fish: original angler-like creatures
 for(const fish of enemies){g.save();g.translate(fish.x,fish.y+Math.sin(time*2+fish.phase)*7);g.scale(fish.dx>0?1:-1,1);
  const stunned=(fish.stunnedUntil||0)>time;const body=stunned?"#8291f7":"#e96083";glow(0,0,30,stunned?"#849cff55":"#ff667b52");
  poly([[-16,0],[-39,-16],[-34,14]],body);g.fillStyle=body;g.beginPath();g.ellipse(0,0,27,18,0,0,Math.PI*2);g.fill();
  poly([[-8,-15],[4,-27],[15,-16]],"#ae3a76");poly([[0,12],[13,23],[20,10]],"#ae3a76");
  poly([[4,2],[24,1],[20,15],[8,13]],"#351b3d");for(let k=0;k<3;k++)poly([[7+k*5,3],[11+k*5,3],[10+k*5,9]],"#fff3e2");
  rect(8,-8,7,6,"#fff2c7");rect(12,-7,3,4,"#1f283c");
  line([[7,-15],[17,-25],[25,-25]],"#f98885",2);glow(25,-25,11,"#ffc86b");rect(22,-28,6,6,"#ffcf74");g.restore();
 }
 // Player mini-sub & distinct pilot face
 g.save();g.translate(ship.x,ship.y+Math.sin(time*5)*1.5);g.scale(ship.vx<0?-1:1,1);
 glow(0,2,52,"#ffcd6145");
 // engine and wake
 rect(-38,-8,12,16,"#d5a45f");rect(-48,-5,12,10,"#9a7a74");for(let i=0;i<4;i++){glow(-48-i*12-Math.sin(time*8+i)*4,2+i*3,9,"#83f3f766")}
 g.fillStyle="#ffce74";g.beginPath();g.ellipse(0,1,32,22,0,0,Math.PI*2);g.fill();
 g.strokeStyle="#7b6d69";g.lineWidth=3;g.stroke();rect(-16,-23,22,7,"#ffd992");rect(-14,18,28,7,"#b98c51");
 // cabin glass
 glow(12,-1,26,"#7ffaff39");g.fillStyle="#143b60";g.beginPath();g.arc(12,-2,17,0,Math.PI*2);g.fill();g.strokeStyle="#b9f5ef";g.lineWidth=3;g.stroke();
 rect(5,-6,5,5,"#baffea");rect(17,-6,5,5,"#baffea");line([[10,5],[14,8],[19,5]],"#a2fce9",2);
 poly([[-15,-19],[-10,-29],[-5,-18]],"#ffdb9e");poly([[23,-18],[28,-29],[30,-12]],"#ffdb9e");
 // headlights
 glow(38,0,55,"#ffef9955");poly([[33,-4],[130,-27],[130,30],[33,7]],"#fff9ab0c");rect(30,-9,10,18,"#ffe7a0");
 g.restore();
 if(pulseRing>0){g.save();g.strokeStyle="#aefff7";g.lineWidth=4;g.globalAlpha=pulseRing/.4;g.beginPath();g.arc(ship.x,ship.y,105*(1-pulseRing/.4),0,Math.PI*2);g.stroke();g.restore()}
 for(const p of particles){g.globalAlpha=Math.max(0,p.life*2);glow(p.x,p.y,12,"#ffda7888");rect(p.x,p.y,4,4,"#fff2b0")}g.globalAlpha=1;
 if(phase==="dive"&&signal&&time<signalUntil){glow(483,134,92,"#14d7c255");label(signal,325,129,18,"#fff1af")}
 if(phase==="dive"&&count>=8)label("MISSION COMPLETE · RETURN ↑",297,111,19,"#ffe29a");
 if(phase==="dive"&&oxygen<25)label("LOW OXYGEN!",760,108,20,"#ff9db0");
 // Edge vignette
 const shade=g.createRadialGradient(W/2,H*.43,130,W/2,H*.5,570);shade.addColorStop(0,"#00000000");shade.addColorStop(1,"#010c1b93");rect(0,0,W,H,shade);
}
