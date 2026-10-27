(()=>{'use strict';
const W=720,H=1280,TAU=Math.PI*2,canvas=document.getElementById('art'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);const videos={intro:$('introVideo'),opening:$('opening'),selection:$('selectionBg'),rain:$('rainBg'),ending:$('ending')};
const QUESTIONS=[['직장 선택','내가 직장을 선택할 때\n가장 중요하게 생각하는 조건',['높은 연봉','고용 안정','워라밸','성장 기회']],['업무 방식','내가 가장 선호하는 업무 방식',['자율성','체계성','협력','독립성']],['직업적 보람','내가 일하면서\n가장 큰 보람을 느끼는 순간',['목표 달성','타인의 인정','정당한 보상','자기발전']],['직업적 윤리','내가 중요한 결정을 내릴 때\n가장 우선하는 가치',['원칙 준수','융통성','공정성','인간적 배려']],['몰입하는 순간','내가 가장 몰입할 수 있는 업무 환경',['아이디어 실현','깊이 있는 연구','규칙적인 업무','협업 프로젝트']],['미래의 목표','내가 진로를 통해\n궁극적으로 얻고 싶은 것',['경제적 여유','전문성','사회적 영향력','시간적 자유']],['포기할 수 없는 가치','내가 일을 통해 이루고 싶은\n가장 중요한 가치',['자아실현','경제적 독립','사회적 기여','명예']]];
const wipeCanvas=$('introWipe'),wipeCtx=wipeCanvas.getContext('2d'),wipeMask=document.createElement('canvas'),maskCtx=wipeMask.getContext('2d');wipeMask.width=W;wipeMask.height=H;let wipeCoverage=0,wipeDistance=0,wipeLast=null,wipeStarted=false,wipeFinishing=false;
let bubbleScales=[1,1,1,1],bubbleBurst=null;let introRipple=null;let scene='intro',questionIndex=0,chosen=[],caught={},caughtTotal=0,rainDrops=[],particles=[],pointer={x:W/2,y:H/2,active:false},hoverIdx=-1,hoverSince=0,selectedAt=0,selectedIdx=-1,transitionAt=0,tiltAt=0,resultAt=0,stageTime=performance.now(),autoTilt=0,noticeUntil=0,lastTime=0,animId=0,gameStarted=false,hitFlashes=[],waterEnergy=0,splashes=[],bubbleGleams=[];
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Four spacious staggered positions across the vertical 720 × 1280 stage.
// Each bubble is 70% of the previous 512px diameter.
const BUBBLE_DIAMETER=226*1.2;
const BUBBLE_SIZE=BUBBLE_DIAMETER;
const bubbleTintCanvas=document.createElement("canvas");
const bubbleTintCtx=bubbleTintCanvas.getContext("2d");
// Symmetric two-by-two layout, matching the supplied reference image.
// Each bubble remains circular, and floats independently within its quadrant.
const positions=[[205,570],[515,570],[205,915],[515,915]];
// 28 original user-provided bubble assets, sheet order matches QUESTIONS flat order.
const bubbleImages=Array.from({length:28},(_,i)=>{
 const img=new Image();img.src=`assets/bubbles/${String(i).padStart(2,'0')}.png`;return img;
});

function videoMode(key){for(const [k,v] of Object.entries(videos)){v.style.opacity=k===key?'1':'0';if(k!==key)v.pause()}if(key){const v=videos[key];v.currentTime=0;const p=v.play();if(p&&p.catch)p.catch(()=>{});}}
function ui(){for(const id of ['intro','question','rainTitle','tiltTitle','result'])$(id).classList.add('hidden');if(scene==='intro')$('intro').classList.remove('hidden');if(scene==='select')$('question').classList.remove('hidden');if(scene==='rain')$('rainTitle').classList.remove('hidden');if(scene==='tilt')$('tiltTitle').classList.remove('hidden');if(scene==='result')$('result').classList.remove('hidden');$('restart').style.display=scene==='intro'?'none':'block';}
function setScene(s){if(s==='intro')resetWipe();scene=s;stageTime=performance.now();document.getElementById('stage').dataset.scene=s;wipeCanvas.style.display=s==='intro'?'block':'none';wipeCanvas.style.opacity=s==='intro'?'1':'0';if(s!=='intro'){wipeCtx.clearRect(0,0,W,H);ctx.clearRect(0,0,W,H)}ui();if(s==='intro'){videoMode('selection');videos.intro.currentTime=0;videos.intro.play().catch(()=>{})}else if(s==='opening'){videoMode('opening')}else if(s==='select'){videoMode('selection');updateQuestion()}else if(s==='rain'){videoMode('rain');initRain()}else if(s==='transition'){videoMode('rain');transitionAt=performance.now()}else if(s==='tilt'){videoMode('selection');tiltAt=performance.now()}else if(s==='result'){videoMode('selection');resultAt=performance.now();showResult()}else if(s==='ending'){videoMode('ending')}}
function reset(){bubbleScales=[1,1,1,1];bubbleBurst=null;questionIndex=0;chosen=[];caught={};caughtTotal=0;rainDrops=[];particles=[];splashes=[];hoverIdx=-1;selectedIdx=-1;autoTilt=0;setScene('intro')}
function updateQuestion(){if(questionIndex>=7){setScene('rain');return}$('count').textContent=`${questionIndex+1} / 7 · ${QUESTIONS[questionIndex][0]}`;$('questionTitle').textContent=QUESTIONS[questionIndex][1];$('progress').innerHTML=Array.from({length:7},(_,i)=>`<i class="${i<questionIndex?'done':''}"></i>`).join('');hoverIdx=-1;selectedIdx=-1;hoverSince=0;bubbleScales=[1,1,1,1];bubbleBurst=null}
// Intro: 2.5s calm water, then 4–6 intentional sweeping gestures reveal the deep sea.
let introSwipeProgress=0,introSwipes=0,introDirection=0,introLastPoint=null;
let introWaves=[];
function start(){ /* intro is controlled by wipe gestures, never by a single movement */ }
function resetWipe(){
 wipeFinishing=false;wipeLast=null;wipeStarted=false;wipeDistance=0;
 introSwipeProgress=0;introSwipes=0;introDirection=0;introLastPoint=null;introWaves=[];
 maskCtx.clearRect(0,0,W,H);wipeCtx.clearRect(0,0,W,H);
 wipeCanvas.style.display='block';wipeCanvas.style.opacity='1';$('intro').classList.remove('wiping');
}
function introMove(){
 if(scene!=='intro'||wipeFinishing||performance.now()-stageTime<2500)return;
 const pt={x:pointer.x,y:pointer.y};
 if(!introLastPoint){introLastPoint=pt;return}
 const dx=pt.x-introLastPoint.x,dy=pt.y-introLastPoint.y;
 const dist=Math.hypot(dx,dy);
 if(dist<2)return;
 // Do not count a tiny mouse jitter or a single diagonal flick as a full sweep.
 const dir=Math.abs(dx)>Math.abs(dy)*1.2?Math.sign(dx):0;
 if(dir&&dir!==introDirection&&Math.abs(dx)>4){introSwipes++;introDirection=dir}
 wipeDistance+=Math.min(dist,55);
 introSwipeProgress=Math.min(1,Math.min(wipeDistance/2050,introSwipes/5));
 maskCtx.save();maskCtx.globalCompositeOperation='source-over';
 maskCtx.strokeStyle='rgba(255,255,255,.92)';maskCtx.lineCap='round';maskCtx.lineJoin='round';
 maskCtx.lineWidth=170;maskCtx.beginPath();maskCtx.moveTo(introLastPoint.x,introLastPoint.y);maskCtx.lineTo(pt.x,pt.y);maskCtx.stroke();maskCtx.restore();
 introWaves.push({x:pt.x,y:pt.y,time:performance.now()});
 if(introWaves.length>20)introWaves.shift();
 introLastPoint=pt;
 if(introSwipeProgress>=1){
  wipeFinishing=true;gameStarted=true;
  $('intro').classList.add('wiping');
  setTimeout(()=>{if(scene==='intro'){setScene('opening')}},720);
 }
}
$('restart').addEventListener('click',reset);$('continue').addEventListener('click',()=>setScene('ending'));
videos.opening.addEventListener('ended',()=>{if(scene==='opening')setScene('select')});videos.ending.addEventListener('ended',()=>{if(scene==='ending')reset()});
function pos(e){const r=canvas.getBoundingClientRect();pointer.x=clamp((e.clientX-r.left)/r.width*W,0,W);pointer.y=clamp((e.clientY-r.top)/r.height*H,0,H);pointer.active=true}
canvas.addEventListener('pointermove',e=>{pos(e);if(scene==='intro')introMove()});
canvas.addEventListener('pointerdown',e=>{if(scene==='intro'){pos(e);introLastPoint=null}});
canvas.addEventListener('pointerdown',e=>{pos(e);if(scene==='rain')catchRainWord(pointer.x,pointer.y)});canvas.addEventListener('pointerenter',pos);canvas.addEventListener('pointerleave',()=>{pointer.active=false;hoverIdx=-1;wipeLast=null;introLastPoint=null;introDirection=0});
window.addEventListener('keydown',e=>{if(e.key==='1'){reset()}else if(e.key==='2'){questionIndex=0;chosen=[];setScene('select')}else if(e.key==='3'){if(!chosen.length)chosen=QUESTIONS.map(q=>q[2][Math.floor(Math.random()*4)]);setScene('rain')}else if(e.key==='4'){if(!chosen.length)chosen=QUESTIONS.map(q=>q[2][0]);if(!caughtTotal){chosen.forEach(w=>caught[w]=2);caughtTotal=14}setScene('tilt')}else if(e.key==='Escape')reset()});
function fillText(text,x,y,size,color='#fff',weight='500'){ctx.font=`${weight} ${size}px "Noto Sans KR", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y)}
function glowCircle(x,y,r,gold=false,alpha=1){
 const t=performance.now()/1000,tw=Math.sin(t*.85+x*.01);
 ctx.save();ctx.globalAlpha=alpha;
 // 광원은 원 내부가 아니라 얇은 비눗막의 가장자리에 집중: 중심은 배경이 비침
 let halo=ctx.createRadialGradient(x,y,r*.66,x,y,r*1.28);
 halo.addColorStop(0,'rgba(20,90,150,0)');
 halo.addColorStop(.7,'rgba(67,192,255,.015)');
 halo.addColorStop(.9,gold?'rgba(255,208,96,.11)':'rgba(123,222,255,.085)');
 halo.addColorStop(1,'rgba(70,170,255,0)');
 ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*1.28,0,TAU);ctx.fill();
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
 // 중심부는 거의 투명하고 가장자리만 볼록하게 반사되는 렌즈
 const glass=ctx.createRadialGradient(x-r*.26,y-r*.38,r*.12,x,y,r*1.03);
 glass.addColorStop(0,'rgba(240,255,255,.035)');
 glass.addColorStop(.40,'rgba(70,190,240,.025)');
 glass.addColorStop(.72,'rgba(19,68,109,.018)');
 glass.addColorStop(.88,gold?'rgba(255,217,143,.13)':'rgba(116,222,255,.10)');
 glass.addColorStop(1,gold?'rgba(255,225,162,.24)':'rgba(210,244,255,.23)');
 ctx.fillStyle=glass;ctx.fillRect(x-r,y-r,r*2,r*2);
 // 실제 비눗방울처럼 움직이는 넓은 무지갯빛 간섭무늬
 ctx.save();ctx.translate(x,y);ctx.rotate(t*.09+tw*.04);
 for(let k=0;k<4;k++){
  const theta=t*.21+k*Math.PI/2;
  const gx=Math.cos(theta)*r*.48,gy=Math.sin(theta)*r*.48;
  const film=ctx.createRadialGradient(gx,gy,2,gx,gy,r*.8);
  const hues=[['255,132,232','115,240,255'],['112,244,222','184,132,255'],['255,222,146','124,185,255'],['141,170,255','255,170,214']][k];
  film.addColorStop(0,`rgba(${hues[0]},.045)`);
  film.addColorStop(.55,`rgba(${hues[1]},.09)`);
  film.addColorStop(1,`rgba(${hues[0]},0)`);
  ctx.fillStyle=film;ctx.beginPath();ctx.arc(gx,gy,r*.8,0,TAU);ctx.fill();
 }
 ctx.restore();
 // 굴절 띠: 화면의 반짝이는 윤슬이 비눗막에 감기는 듯한 움직임
 for(let k=0;k<4;k++){
  const shift=t*.12+k*1.47;
  ctx.beginPath();
  ctx.ellipse(x+Math.sin(shift)*r*.14,y+Math.cos(shift)*r*.09,
              r*(.78-k*.09),r*(.86-k*.11),Math.sin(shift)*.3,shift+.7,shift+2.4);
  ctx.strokeStyle=[
   'rgba(151,239,255,.24)','rgba(248,151,248,.19)',
   'rgba(255,225,158,.18)','rgba(122,244,223,.16)'][k];
  ctx.lineWidth=5-k*.7;ctx.shadowBlur=7;ctx.shadowColor='#b4e9ff';ctx.stroke();
 }
 // 위쪽 커다란 반사광과 하단의 얇은 곡면 반사
 ctx.shadowBlur=12;ctx.shadowColor='#fff';
 ctx.beginPath();ctx.ellipse(x-r*.28,y-r*.64,r*.48,r*.12,-.38,-.05,2.8);
 ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=4;ctx.stroke();
 ctx.beginPath();ctx.ellipse(x+r*.24,y+r*.63,r*.44,r*.08,-.35,.1,2.8);
 ctx.strokeStyle='rgba(193,244,255,.40)';ctx.lineWidth=2.4;ctx.stroke();
 ctx.restore(); // clipping
 // 얇고 선명한 외곽선, 색이 시간에 따라 바뀌는 이리데슨트 링
 ctx.shadowBlur=gold?21:15;ctx.shadowColor=gold?'#ffd57d':'#83ddff';
 for(let k=0;k<7;k++){
  const start=t*.18+k*TAU/7;
  ctx.beginPath();ctx.arc(x,y,r-k*.37,start,start+TAU/7+.07);
  ctx.lineWidth=k%2?2.5:3.1;
  ctx.strokeStyle=gold?
    ['#fff7d7','#ffdf9a','#ffd17c','#fff2bd','#ffcf82','#ffe9af','#fff8dc'][k]:
    ['rgba(212,253,255,.85)','rgba(148,240,251,.8)','rgba(252,169,249,.77)',
     'rgba(178,156,255,.73)','rgba(255,216,159,.82)','rgba(141,245,225,.79)','rgba(221,249,255,.9)'][k];
  ctx.stroke();
 }
 ctx.shadowBlur=0;
 // 작은 물방울 표면의 빛점이 움직이며 반짝임
 for(let i=0;i<6;i++){
  const angle=t*(i%2?.15:-.18)+i*TAU/6;
  const px=x+Math.cos(angle)*(r-1),py=y+Math.sin(angle)*(r-1);
  const pulse=.6+.4*Math.sin(t*2.7+i);
  ctx.globalAlpha=alpha*pulse;ctx.shadowBlur=12;ctx.shadowColor='#ffffff';
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,i%3===0?3.3:1.8,0,TAU);ctx.fill();
 }
 ctx.globalAlpha=alpha;ctx.shadowBlur=0;
 if(gold){
  const goldLight=ctx.createRadialGradient(x,y,r*.05,x,y,r);
  goldLight.addColorStop(0,'rgba(255,225,133,.26)');
  goldLight.addColorStop(.75,'rgba(255,207,102,.10)');
  goldLight.addColorStop(1,'rgba(255,200,75,.05)');
  ctx.fillStyle=goldLight;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function innerWorld(x,y,r,idx,t,gold){
 ctx.save();ctx.beginPath();ctx.arc(x,y,r-5,0,TAU);ctx.clip();
 // 구슬마다 다른 작은 바닷속 풍경. 배경은 투명하게 비치도록 최소한의 색만 사용
 let floor=y+r*.57;
 const shade=ctx.createLinearGradient(0,y-r,0,y+r);
 shade.addColorStop(0,'rgba(8,49,87,.02)');shade.addColorStop(.55,gold?'rgba(255,197,96,.17)':'rgba(19,99,132,.10)');shade.addColorStop(1,gold?'rgba(243,168,78,.35)':'rgba(4,63,93,.32)');
 ctx.fillStyle=shade;ctx.fillRect(x-r,y-r,2*r,2*r);
 // 물결과 반짝이는 바닥
 ctx.beginPath();ctx.moveTo(x-r,floor);
 for(let j=-r;j<=r;j+=5)ctx.lineTo(x+j,floor+Math.sin(j*.07+t*1.3+idx)*3);
 ctx.lineTo(x+r,y+r);ctx.lineTo(x-r,y+r);ctx.closePath();
 ctx.fillStyle=gold?'rgba(162,104,39,.23)':'rgba(9,82,97,.34)';ctx.fill();
 // 4가지 바다 속 상징: 산호 / 궁전 / 해초 / 별빛
 if(idx===0||idx===2){
  for(let k=0;k<6;k++){
   const bx=x-r*.78+k*r*.31,by=floor+18;
   ctx.strokeStyle=k%2?'rgba(125,234,211,.64)':'rgba(244,164,201,.60)';ctx.lineWidth=2.1;
   ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+Math.sin(t+k)*8,by-21,bx+(k%2?7:-6),by-39-k%3*9);ctx.stroke();
   ctx.beginPath();ctx.moveTo(bx,by-14);ctx.lineTo(bx+12,by-25);ctx.stroke();
  }
 }else if(idx===1){
  ctx.fillStyle='rgba(255,210,144,.36)';
  ctx.fillRect(x-28,floor-31,56,35);ctx.fillRect(x-19,floor-49,38,18);
  ctx.beginPath();ctx.moveTo(x-36,floor-31);ctx.lineTo(x,floor-61);ctx.lineTo(x+36,floor-31);ctx.fill();
  for(let k=-1;k<=1;k++){ctx.fillStyle='rgba(255,232,168,.72)';ctx.fillRect(x+k*18-3,floor-24,6,15)}
 }else{
  for(let k=0;k<9;k++){
   const px=x+Math.sin(k*5.8)*r*.67,py=y+Math.cos(k*3.3)*r*.65;
   ctx.fillStyle='rgba(194,240,255,.55)';ctx.shadowColor='#9be9ff';ctx.shadowBlur=8;
   ctx.beginPath();ctx.arc(px,py,1.6+(k%3),0,TAU);ctx.fill();
  }
 }
 // 깊이감 있는 부유 입자
 for(let k=0;k<10;k++){
  const px=x+Math.sin(k*3.5+t*.18)*r*.77,py=y+Math.cos(k*2.8-t*.15)*r*.78;
  ctx.fillStyle=k%3===0?'rgba(255,222,156,.8)':'rgba(164,238,255,.48)';
  ctx.beginPath();ctx.arc(px,py,1+(k%3)*.5,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function bubbleWord(w,x,y,r,gold=false,progress=0,idx=0,t=0){
 glowCircle(x,y,r,gold);
 innerWorld(x,y,r,idx,t,gold);
 ctx.save();ctx.shadowBlur=15;ctx.shadowColor=gold?'#ffd47d':'#7ddfff';
 let words=w.split(' ');
 if(words.length===1)fillText(w,x,y-5,31,'#fff','600');
 else if(words.length===2){fillText(words[0],x,y-22,28,'#fff','600');fillText(words[1],x,y+18,28,'#fff','600')}
 else{fillText(words.slice(0,2).join(' '),x,y-19,24,'#fff','600');fillText(words.slice(2).join(' '),x,y+19,24,'#fff','600')}
 ctx.restore();
 if(progress>0){ctx.beginPath();ctx.arc(x,y,r+9,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.strokeStyle='#ffe3a2';ctx.shadowColor='#ffd375';ctx.shadowBlur=17;ctx.lineWidth=5;ctx.stroke();ctx.shadowBlur=0}
}
function emit(x,y,gold=true,n=28){for(let i=0;i<n;i++)particles.push({x,y,vx:rnd(-5,5),vy:rnd(-6,2),life:rnd(28,78),max:78,size:rnd(1,4),gold})}
function drawParticles(dt){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;p.vx*=.992;p.vy+=.025;p.life-=dt/16.7;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.gold?'#ffe1a0':'#9feaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill()}ctx.restore()}
function water(xBase,yBase,tilt,t,amplitude=20){ctx.save();ctx.beginPath();for(let x=-25;x<=W+25;x+=8){const y=yBase+tilt*(x-W/2)+Math.sin(x*.012+t*1.7)*amplitude+Math.sin(x*.027-t*1.2)*amplitude*.28;if(x===-25)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.lineTo(W+25,H);ctx.lineTo(-25,H);ctx.closePath();let g=ctx.createLinearGradient(0,yBase,0,H);g.addColorStop(0,'rgba(36,181,227,.23)');g.addColorStop(1,'rgba(0,25,52,.48)');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#6bdcff';ctx.shadowColor='#3dcfff';ctx.shadowBlur=22;ctx.lineWidth=4;ctx.stroke();ctx.restore()}
function drawIntroWipe(){
 if(scene!=='intro')return;
 wipeCtx.clearRect(0,0,W,H);
 const video=videos.intro;
 if(video.readyState>=2){
  try{wipeCtx.drawImage(video,0,0,W,H)}catch(e){}
 }else{wipeCtx.fillStyle='#32a9b9';wipeCtx.fillRect(0,0,W,H)}
 // Wiping reveals the exact same video used as interaction 1 background.
 wipeCtx.globalCompositeOperation='destination-out';
 wipeCtx.drawImage(wipeMask,0,0);
 wipeCtx.globalCompositeOperation='source-over';
 if(wipeFinishing)wipeCtx.globalAlpha=Math.max(0,1-(performance.now()-stageTime-2500)/8000);
}
function drawIntro(t){
 // The interaction-1 background video is already playing underneath.
 // Draw only translucent water ripples, never an opaque replacement sea.
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const wave of introWaves){
  const age=(performance.now()-wave.time)/1000;
  if(age<1.45){
   ctx.strokeStyle=`rgba(210,245,255,${.30*(1-age/1.45)})`;
   ctx.lineWidth=2;
   for(let j=0;j<3;j++){
    ctx.beginPath();ctx.arc(wave.x,wave.y,18+age*105+j*24,0,TAU);ctx.stroke();
   }
  }
 }
 ctx.restore();
 drawIntroWipe();
}
function drawCoralCorners(t){
 ctx.save();ctx.globalAlpha=.55;
 for(const side of [0,1]){
  const base=side?W-18:18;
  for(let j=0;j<11;j++){
   const startY=H-40-(j%3)*23;
   const endX=base+(side?-1:1)*(26+j*9);
   ctx.strokeStyle=j%3===0?'rgba(255,189,130,.42)':'rgba(89,191,209,.38)';ctx.lineWidth=2+j%3;
   ctx.beginPath();ctx.moveTo(base,startY+45);ctx.quadraticCurveTo(endX+(side?14:-14),startY-42,endX+Math.sin(t*.5+j)*4,startY-92-j*10);ctx.stroke();
  }
 }
 ctx.restore();
}
function drawSelection(t,now){
 ctx.fillStyle='rgba(0,10,25,.055)';ctx.fillRect(0,0,W,H);
 const points=positions.map(([bx,by],i)=>({
  x:bx+Math.sin(t*.85+i*1.7)*8,
  y:by+Math.cos(t*.74+i*2.1)*9
 }));
 // Keep the selected bubble visible while it grows, then burst before changing question.
 if(selectedIdx>=0&&now-selectedAt>=680){
  chosen.push(QUESTIONS[questionIndex][2][selectedIdx]);
  questionIndex++;updateQuestion();
  if(questionIndex>=7)setScene('rain');
  return;
 }
 if(scene!=='select')return;
 let found=-1;
 if(selectedIdx<0){
  for(let i=0;i<4;i++){
   if(pointer.active&&Math.hypot(pointer.x-points[i].x,pointer.y-points[i].y)<108){found=i;break}
  }
  if(found!==hoverIdx){hoverIdx=found;hoverSince=now}
  if(found>=0&&now-hoverSince>=1000){
   selectedIdx=found;selectedAt=now;
   const {x,y}=points[found];
   bubbleBurst={x,y,time:now};
   // Fine iridescent fragments radiate from the soap-film edge, rather than a solid yellow flash.
   for(let k=0;k<75;k++){
    const angle=rnd(0,TAU),radius=rnd(105,134),speed=rnd(1.1,4.4);
    particles.push({x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius,
     vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-0.8,
     life:rnd(26,54),max:54,size:rnd(1,3.3),gold:k%4!==0});
   }
  }
 }
 for(let i=0;i<4;i++){
  const {x,y}=points[i],selected=i===selectedIdx,hovered=i===found;
  const progress=(hovered&&hoverIdx===i&&selectedIdx<0)?clamp((now-hoverSince)/1000,0,1):0;
  // Gradually enlarge from 1x to 1.20x on hover, not an abrupt size jump.
  const target=1;
  bubbleScales[i]+=(target-bubbleScales[i])*.13;
  const burst=selected?clamp((now-selectedAt)/680,0,1):0;
  const popScale=selected?(1+0.10*Math.sin(Math.PI*Math.min(burst/.58,1)/2)):1;
  const size=BUBBLE_SIZE*popScale;
  const img=bubbleImages[questionIndex*4+i];
  ctx.save();ctx.translate(x,y);
  const breathe=1+.007*Math.sin(t*2+i*1.7);
  ctx.scale(breathe,breathe);
  // Tint only the original image pixels. No extra circle or halo layer.
  const strength=selected?1:progress;
  if(selected){
   ctx.globalAlpha=1-clamp((burst-.34)/.48,0,1);
  }
  if(img.complete&&img.naturalWidth){
   const dim=Math.ceil(size);
   if(bubbleTintCanvas.width!==dim||bubbleTintCanvas.height!==dim){
    bubbleTintCanvas.width=dim;bubbleTintCanvas.height=dim;
   }
   bubbleTintCtx.clearRect(0,0,dim,dim);
   bubbleTintCtx.globalCompositeOperation='source-over';
   bubbleTintCtx.globalAlpha=1;
   bubbleTintCtx.drawImage(img,0,0,dim,dim);
   if(strength>0){
    // Illuminate only the existing iridescent film near its rim.
    // The interior stays transparent; no flat yellow tint or new outline.
    bubbleTintCtx.globalCompositeOperation='source-atop';
    const rim=bubbleTintCtx.createRadialGradient(dim/2,dim/2,dim*.31,dim/2,dim/2,dim*.51);
    rim.addColorStop(0,'rgba(255,234,179,0)');
    rim.addColorStop(.55,`rgba(255,230,174,${strength*.055})`);
    rim.addColorStop(.82,`rgba(255,224,154,${strength*.15})`);
    rim.addColorStop(1,'rgba(255,245,213,0)');
    bubbleTintCtx.fillStyle=rim;
    bubbleTintCtx.fillRect(0,0,dim,dim);
    bubbleTintCtx.globalCompositeOperation='source-over';
   }
   ctx.shadowColor=strength>0?'#fff0c9':'#83dfff';
   ctx.shadowBlur=12+strength*17;
   ctx.drawImage(bubbleTintCanvas,-size/2,-size/2,size,size);
  }else{
   glowCircle(0,0,size*.42,strength>.5);
   fillText(QUESTIONS[questionIndex][2][i],0,0,26);
  }
  ctx.shadowBlur=0;
  ctx.restore();
 }
}
function makeDrop(top=false){
 const word=chosen[Math.floor(Math.random()*chosen.length)]||'자유';
 return {word,x:rnd(65,W-65),y:top?rnd(-H,0):rnd(-220,-70),speed:rnd(1.35,3.3),phase:rnd(0,TAU),size:rnd(21,32),gold:false,opacity:rnd(.62,1)};
}
function initRain(){
 rainDrops=Array.from({length:32},()=>makeDrop(true));
 caught={};caughtTotal=0;waterEnergy=0;hitFlashes=[];splashes=[];
}
function catchRainWord(px,py){
 let closest=-1,best=Infinity;
 for(let i=0;i<rainDrops.length;i++){
  const d=rainDrops[i],x=d.x+Math.sin(performance.now()/1000*1.7+d.phase)*15;
  const dx=(px-x)/Math.max(48,d.size*1.15),dy=(py-(d.y+Array.from(d.word.replace(/ /g,'')).length*d.size*.45))/Math.max(58,Array.from(d.word.replace(/ /g,'')).length*d.size*.58);
  const distance=dx*dx+dy*dy;
  if(distance<1.3&&distance<best){best=distance;closest=i}
 }
 if(closest<0)return;
 const d=rainDrops[closest];
 caught[d.word]=(caught[d.word]||0)+1;caughtTotal++;
 waterEnergy=clamp(caughtTotal/15,0,1);
 hitFlashes.push({word:d.word,x:d.x,y:d.y,born:performance.now()});
 emit(d.x,d.y,true,55);
 rainDrops[closest]=makeDrop();
 if(caughtTotal>=15){setTimeout(()=>{if(scene==='rain')setScene('transition')},850)}
}
function basinSurfaceY(x,t){
 // 배경 영상의 U자형 물웅덩이와 대략 맞춘 접촉 높이
 const nx=Math.abs((x-W/2)/(W/2));
 return 1000-245*Math.pow(nx,1.65)+Math.sin(t*2+x*.016)*9;
}
function addSplash(x,y,t){
 splashes.push({x,y,born:performance.now(),seed:rnd(0,TAU)});
 emit(x,y,false,12);
}
function drawSplashes(now){
 for(let i=splashes.length-1;i>=0;i--){
  const s=splashes[i],p=(now-s.born)/1050;
  if(p>=1){splashes.splice(i,1);continue}
  ctx.save();ctx.globalAlpha=(1-p)*.78;ctx.strokeStyle='#9aeaff';ctx.shadowColor='#63d9ff';ctx.shadowBlur=14;
  ctx.lineWidth=2.2*(1-p)+.6;
  ctx.beginPath();ctx.ellipse(s.x,s.y,8+p*66,2+p*12,0,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.ellipse(s.x,s.y,3+p*39,1+p*8,0,0,TAU);ctx.stroke();
  for(let j=0;j<7;j++){
   const a=j*TAU/7+s.seed;
   const px=s.x+Math.cos(a)*(8+p*39),py=s.y-Math.sin(p*Math.PI)*((j%3)+1)*21+Math.sin(a)*7;
   ctx.fillStyle='#d6f7ff';ctx.beginPath();ctx.arc(px,py,2.6*(1-p)+.5,0,TAU);ctx.fill();
  }
  ctx.restore();
 }
}
function drawRain(t,dt){
 ctx.fillStyle='rgba(0,14,31,.065)';ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W/2,1010,15,W/2,1010,380);
 glow.addColorStop(0,`rgba(255,209,112,${waterEnergy*.50})`);
 glow.addColorStop(.45,`rgba(255,196,81,${waterEnergy*.22})`);
 glow.addColorStop(1,'rgba(255,200,80,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,680,W,600);
 for(let i=0;i<rainDrops.length;i++){
  const d=rainDrops[i];d.y+=d.speed*dt*.06;
  const x=d.x+Math.sin(t*1.7+d.phase)*15;
  const chars=Array.from(d.word.replace(/ /g,''));
  const bottom=d.y+(chars.length-.5)*d.size;
  const surface=basinSurfaceY(x,t);
  // 클릭되지 않은 단어는 U자형 물웅덩이에 닿아 파문을 남기고 사라진다.
  if(bottom>=surface){addSplash(x,surface,t);rainDrops[i]=makeDrop();continue}
  ctx.save();ctx.globalAlpha=d.opacity;
  ctx.font=`500 ${d.size}px "Noto Sans KR",sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#1abfff';ctx.shadowBlur=13;ctx.fillStyle='#c6f4ff';
  for(let j=0;j<chars.length;j++){
   ctx.globalAlpha=d.opacity*(1-j/(chars.length+6)*.22);
   ctx.fillText(chars[j],x,d.y+j*d.size*.99);
  }
  ctx.restore();
 }
 drawSplashes(performance.now());
 for(let i=hitFlashes.length-1;i>=0;i--){
  const f=hitFlashes[i],a=(performance.now()-f.born)/800;
  if(a>=1){hitFlashes.splice(i,1);continue}
  ctx.save();ctx.globalAlpha=1-a;ctx.shadowColor='#ffcc5e';ctx.shadowBlur=35;
  ctx.fillStyle='#fff1b8';ctx.font=`600 ${30+a*12}px "Noto Sans KR",sans-serif`;
  ctx.textAlign='center';ctx.fillText(f.word,f.x,f.y-a*45);ctx.restore();
 }
 // 숫자 카운터 없이, 모은 단어의 빛이 물웅덩이 내부에 쌓인다.
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<caughtTotal*3;i++){
  const x=W/2+Math.sin(i*2.4+t*.45)*(25+(i*19)%205);
  const y=1015+Math.cos(i*2.1+t*.7)*((i*7)%70);
  ctx.globalAlpha=.18+waterEnergy*.65;ctx.shadowColor='#ffe29a';ctx.shadowBlur=18;
  ctx.fillStyle='#ffe6a1';ctx.beginPath();ctx.arc(x,y,1.3+(i%3),0,TAU);ctx.fill();
 }
 ctx.restore();
}
function drawTransition(t,now){const elapsed=(now-transitionAt)/1000;ctx.fillStyle='rgba(0,18,39,.15)';ctx.fillRect(0,0,W,H);const cy=960-clamp(elapsed/3,0,1)*390;const r=clamp(35+elapsed*34,35,240);glowCircle(W/2,cy,r,true);if(elapsed>1.5){const a=clamp((elapsed-1.5)/3,0,1);ctx.save();ctx.translate(W/2,cy);ctx.strokeStyle=`rgba(121,222,255,${a*.8})`;ctx.shadowColor='#4bdcff';ctx.shadowBlur=28;for(let j=0;j<4;j++){ctx.lineWidth=5-j;ctx.beginPath();ctx.arc(0,0,r+30+j*70+elapsed*18,0,TAU);ctx.stroke()}ctx.restore()}if(elapsed>5){setScene('tilt')}}
function getBias(){const stable=new Set(['높은 연봉','고용 안정','워라밸','체계성','독립성','정당한 보상','원칙 준수','공정성','규칙적인 업무','경제적 여유','시간적 자유','경제적 독립']);const possible=new Set(['성장 기회','자율성','협력','목표 달성','타인의 인정','자기발전','융통성','인간적 배려','아이디어 실현','깊이 있는 연구','협업 프로젝트','전문성','사회적 영향력','자아실현','사회적 기여','명예']);let s=0,p=0;for(const [w,n] of Object.entries(caught)){if(stable.has(w))s+=n;else if(possible.has(w))p+=n}return{stable:s,possible:p,bias:s===p?0:(p-s)/(s+p||1)}}
function drawTilt(t,now){const elapsed=(now-tiltAt)/1000,b=getBias(),manual=(pointer.x-W/2)/W*1.2;const reveal=clamp((elapsed-8)/5,0,1);const angle=manual*(1-reveal)+b.bias*.85*reveal;ctx.fillStyle='rgba(0,13,31,.35)';ctx.fillRect(0,0,W,H);water(0,700,angle,t,20);let x=clamp(W/2+angle*190,150,570),y=630+Math.sin(t*1.7)*12+Math.abs(angle)*35;glowCircle(x,y,95,true);fillText('나의',x,y-16,27,'#183d54','500');fillText('마음',x,y+21,29,'#183d54','600');ctx.save();ctx.shadowColor='#8de4ff';ctx.shadowBlur=12;fillText('안정의 물결',155,950,25,'#c9e9f3');fillText('가능성의 물결',555,950,25,'#c9e9f3');ctx.restore();if(elapsed>13){setScene('result')}}
function showResult(){const b=getBias();let head=b.bias>0.13?'가능성의 물결':b.bias<-.13?'안정의 물결':'두 물결 사이';$('resultHeading').textContent=head;$('resultDetail').textContent=b.bias>0.13?'지금은 새로운 방향과 성장의 가능성이 조금 더 크게 흐르고 있어요.':b.bias<-.13?'지금은 익숙한 기반과 안정의 가치가 조금 더 크게 흐르고 있어요.':'지금은 안정과 가능성이 비슷한 무게로 마음속에 머물고 있어요.';}
function drawResult(t){ctx.fillStyle='rgba(0,15,34,.53)';ctx.fillRect(0,0,W,H);water(0,770,getBias().bias*.6,t,12);glowCircle(W/2,670,90,true,.75)}
function loop(now){const dt=lastTime?Math.min(40,now-lastTime):16.7;lastTime=now;const t=now/1000;ctx.clearRect(0,0,W,H);if(scene==='intro')drawIntro(t);else if(scene==='select')drawSelection(t,now);else if(scene==='rain')drawRain(t,dt);else if(scene==='transition')drawTransition(t,now);else if(scene==='tilt')drawTilt(t,now);else if(scene==='result')drawResult(t);drawParticles(dt);animId=requestAnimationFrame(loop)}
ui();videoMode('intro');requestAnimationFrame(loop);
})();
