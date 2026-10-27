(()=>{'use strict';
const C=WaveConfig,W=C.width,H=C.height,TAU=Math.PI*2,$=id=>document.getElementById(id),canvas=$('art'),ctx=canvas.getContext('2d');ctx.setTransform(1.5,0,0,1.5,0,0);
const videos={opening:$('opening'),water:$('interactiveBg'),descent:$('descent'),rain:$('rainBg'),branch:$('film'),ending:$('ending')};
const sound=new WaveSound([videos.opening,videos.ending]);
const waterLayers=[videos.water,$('waterTwin')];let waterFront=0,waterMix=false;
const phases={gather:'PPT 5 · 물웅덩이 줌 이동',branch:'PPT 6 · 빛 구슬의 균형',direction:'PPT 6 · 방향 결정',approach:'PPT 7 · 선택한 세계로 접근',lightpath:'PPT 8 · 빛의 길',ending:'PPT 8 · 마지막 영상'};
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
let startedAt=null,finishedAt=null,experienceTest=false,experienceHistory=[];
let scene='intro',mode='camera',questionIndex=0,chosen=[],caught={},caughtTotal=0,lastCaught='',result=null;
let elapsed=0,clock=0,lastFrame=0,questionLock=0,selectedIdx=-1,hoverIdx=-1,hoverSince=0,hoverHand=null,releaseRequired=false;
let hands=[],pointer={x:W/2,y:H/2,active:false},rainDrops=[],particles=[],splashes=[],hitFlashes=[],waterEnergy=0,rainActive=0,pendingGather=-1,lastCatch=-Infinity;
let activeKey=null,mediaEpoch=0,mediaBlocked=false,playback=null,startAttempt=0,lastGesture='',visibilityPaused=false;
// Interaction artwork and animation ported from the supplied maeum_wave/app.js.
let bubbleScales=[1,1,1,1],bubbleBurst=null,selectedAt=0;
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

const dust=Array.from({length:42},()=>({x:rnd(10,W-10),y:rnd(0,H),phase:rnd(0,TAU),speed:rnd(4,11),r:rnd(.7,1.8)}));
function fillText(text,x,y,size,color='#fff',weight='500'){ctx.font=`${weight} ${size}px WaveSans,"Malgun Gothic",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x,y);}
/* SHARED_RENDERERS */
function notice(text=''){if($('notice').textContent!==text)$('notice').textContent=text;}
function updateUI(){
  $('stage').classList.toggle('interactive',['intro','select','rain'].includes(scene));
  for(const [id,s] of [['intro','intro'],['question','select'],['rainTitle','rain'],['complete','complete']])$(id).hidden=scene!==s;
  $('tiltLabels').hidden=!['branch','direction','approach'].includes(scene);
  if(result)updateTiltLabels(false);
  $('inputStatus').hidden=!['intro','select','rain','complete'].includes(scene);
  $('questionHelp').textContent=mode==='camera'?'원하는 물방울을 손끝으로 1초 동안 가리켜 주세요':'원하는 물방울에 마우스를 1초 동안 머물러 주세요';
  stationUI();
  const gesture=$('gestureMode').value;$('rainHelp').textContent=mode==='mouse'?'마음에 남는 단어를 클릭해 빛으로 바꿔 주세요':gesture==='fist'?'단어 위에서 펼친 손을 주먹으로 쥐어 주세요':gesture==='clap'?'단어 위에서 두 손을 모아 박수쳐 주세요':'단어 위에서 주먹을 쥐거나 두 손을 모아 박수쳐 주세요';
}
function updateTiltLabels(reveal){
  if(!result)return;
  const signature=`${result.development}:${result.stability}:${result.side}:${result.tie}:${reveal}`;
  if($('tiltLabels').dataset.signature===signature)return;
  $('tiltLabels').dataset.signature=signature;
  $('developmentScore').textContent=`${result.development}점`;
  $('stabilityScore').textContent=`${result.stability}점`;
  for(const el of $('tiltLabels').querySelectorAll('[data-side]'))el.classList.toggle('chosen',reveal&&el.dataset.side===result.side);
  $('tiltDecision').textContent=reveal?(result.tie?'두 점수가 같아 마지막 선택이 이끄는 방향으로 흐릅니다':`${result.value}이 마음을 이끕니다`):'선택한 말들이 나의 마음을 움직입니다';
}
function resetHold(){hoverIdx=-1;hoverSince=0;hoverHand=null;}
function clearInput(){hands=[];pointer.active=false;resetHold();camera?.clear();}
function waterTransform(scale=1,y=0){for(const v of [...waterLayers,videos.rain]){v.style.transformOrigin='50% 78%';v.style.transform=`translateY(${y}%) scale(${scale})`;}}
function updateWater(){
  if(activeKey!=='water'||mediaBlocked)return;
  const front=waterLayers[waterFront],back=waterLayers[1-waterFront];
  if(front.duration&&front.currentTime>=front.duration-2&&!waterMix){waterMix=true;back.currentTime=0;back.style.zIndex='1';front.style.zIndex='0';back.play().catch(()=>videoError('배경 반복 재생을 확인해 주세요.'));}
  if(waterMix){back.style.opacity=clamp((front.currentTime-(front.duration-2))/2,0,1);if(front.ended){front.pause();front.style.opacity='0';back.style.opacity='1';waterFront=1-waterFront;waterMix=false;}}
}
function hideVideoError(){mediaBlocked=false;$('mediaError').hidden=true;}
function videoError(message){sound.pause();mediaBlocked=true;resetHold();$('mediaErrorText').textContent=message;$('mediaError').hidden=false;}
function visibleVideo(key){for(const [name,v] of Object.entries(videos)){if(name==='water')continue;v.classList.toggle('visible',name===key);if(name!==key)v.pause();}for(let i=0;i<2;i++){const v=waterLayers[i];v.classList.toggle('visible',key==='water');if(key!=='water'){v.pause();v.style.opacity='0';}else if(!waterMix)v.style.opacity=i===waterFront?'1':'0';}activeKey=key;}
function showWater(reset=false){visibleVideo('water');if(reset){waterFront=0;waterMix=false;waterLayers[0].currentTime=0;waterLayers[1].currentTime=0;visibleVideo('water');}waterLayers[waterFront].play().catch(()=>videoError('수중 배경을 재생하지 못했습니다. 다시 시작해 주세요.'));playback={key:'water'};}
function resumeActive(){if(activeKey==='water'&&waterMix)return Promise.all(waterLayers.map(v=>v.play()));return (activeKey==='water'?waterLayers[waterFront]:videos[activeKey]).play();}
async function playVideo(key,{src,onEnd,reset=true}={}){
  const epoch=++mediaEpoch,v=videos[key];hideVideoError();playback={key,src,onEnd};
  if(src&&v.getAttribute('src')!==src){v.src=src;v.load();}if(reset)v.currentTime=0;
  v.onended=()=>{if(epoch===mediaEpoch&&activeKey===key&&onEnd)onEnd();};
  v.onerror=()=>{if(epoch===mediaEpoch)videoError('영상 파일을 읽을 수 없습니다. '+(src||v.getAttribute('src')));};
  try{await v.play();if(epoch!==mediaEpoch){v.pause();return;}visibleVideo(key);if(['branch','ending'].includes(scene))$('branchStill').classList.remove('visible');}
  catch(error){if(epoch===mediaEpoch&&error.name!=='AbortError')videoError('영상 재생을 시작하지 못했습니다. 다시 재생을 눌러 주세요.');}
}
function setScene(next){
  mediaEpoch++;scene=next;elapsed=0;resetHold();notice();hideVideoError();selectedIdx=-1;questionLock=0;releaseRequired=false;
  $('branchStill').classList.remove('visible');$('branchStill').style.opacity='';waterTransform();videos.branch.style.transform='none';videos.branch.style.opacity='';videos.ending.style.opacity='';
  if(next==='intro'){showWater(true);}
  else if(next==='opening'){playVideo('opening',{onEnd:()=>setScene('select')});}
  else if(next==='select'){clearInput();showWater(true);updateQuestion();}
  else if(next==='descent'){clearInput();playVideo('descent',{onEnd:()=>setScene('rain')});}
  else if(next==='rain'){clearInput();playVideo('rain');initRain();}
  else if(next==='gather'){result=C.resolveResult(caught,lastCaught,chosen);for(const [key,src]of[['branch',result.film],['ending',result.ending]]){videos[key].src=src;videos[key].load();}particles=[];splashes=[];}
  else if(next==='branch'){particles=[];clearInput();$('branchStill').classList.add('visible');videos.branch.playbackRate=.65;playVideo('branch',{src:result.film,onEnd:()=>setScene('lightpath')});}
  else if(next==='lightpath'){videos.branch.pause();visibleVideo('branch');videos.branch.style.transform=`scale(${1.14+.12*result.strength})`;videos.branch.style.transformOrigin=result.side==='left'?'30% 48%':'72% 48%';}
  else if(next==='ending'){playVideo('ending',{src:result.ending,onEnd:()=>setScene('complete')});}
  else if(next==='complete'){videos.ending.pause();finishedAt=Date.now();}
  if(next==='complete')void saveExperience();
  sound.setScene(next,result);updateUI();
}
function resetArtwork(){startedAt=null;finishedAt=null;experienceTest=false;experienceHistory=[];startAttempt++;chosen=[];caught={};caughtTotal=0;lastCaught='';result=null;questionIndex=0;particles=[];rainDrops=[];splashes=[];hitFlashes=[];waterEnergy=0;rainActive=0;lastGesture='';pendingGather=-1;clearInput();setScene('intro');}
async function reset(){if(station.held)return;if(station.active)return station.release();station.leavePreview();resetArtwork();}
function updateQuestion(){const q=C.questions[questionIndex];$('count').textContent=`${questionIndex+1} / 7 · ${q[0]}`;$('questionTitle').textContent=q[1];$('progress').innerHTML=C.questions.map((_,i)=>`<i class="${i<questionIndex?'done':''}"></i>`).join('');resetHold();}
function targets(t){return positions.map(([x,y],i)=>({x:x+Math.sin(t*.85+i*1.7)*8,y:y+Math.cos(t*.74+i*2.1)*9}));}

function inputPoints(){return mode==='mouse'?(pointer.active?[{...pointer,id:'mouse'}]:[]):hands.map(p=>({x:p.x*W,y:p.y*H,id:p.id,fist:p.fist}));}
function drawSelection(t,dt){
 const now=clock*1000;
 ctx.fillStyle='rgba(0,10,25,.055)';ctx.fillRect(0,0,W,H);
 const points=targets(t);
 // Keep the selected bubble visible while it grows, then burst before changing question.
 if(selectedIdx>=0&&now-selectedAt>=680){
  const selectedWord=C.questions[questionIndex][2][selectedIdx];
  experienceHistory.push({type:'choice',question_index:questionIndex,word:selectedWord,at:new Date().toISOString()});
  chosen.push(selectedWord);
  questionIndex++;selectedIdx=-1;resetHold();
  if(questionIndex>=7){setScene('descent');return;}
  releaseRequired=true;updateQuestion();
  return;
 }
 if(scene!=='select')return;
 let found=-1;
 if(selectedIdx<0){
  let candidate=null;
  for(const point of inputPoints())for(let i=0;i<4;i++){
    const distance=Math.hypot(point.x-points[i].x,point.y-points[i].y);
    if(distance<108&&(!candidate||distance<candidate.distance))candidate={index:i,id:point.id,distance};
  }
  if(releaseRequired){if(!candidate){releaseRequired=false;notice();}else notice('손끝을 물방울 밖으로 옮긴 뒤 다음 단어를 골라 주세요.');candidate=null;}
  if(!candidate)resetHold();
  else if(candidate.index!==hoverIdx||candidate.id!==hoverHand){hoverIdx=candidate.index;hoverHand=candidate.id;hoverSince=0;}
  else hoverSince+=dt*1000;
  found=candidate?candidate.index:-1;
  if(found>=0&&hoverSince>=C.dwellMs){
   selectedIdx=found;selectedAt=now;sound.play('bubble_pop',{pan:(points[found].x/W-.5)*1.4});
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
  const progress=(hovered&&hoverIdx===i&&selectedIdx<0)?clamp(hoverSince/C.dwellMs,0,1):0;
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
   fillText(C.questions[questionIndex][2][i],0,0,26);
  }
  ctx.shadowBlur=0;
  ctx.restore();
 }
}

function makeDrop(top=false){
 const word=chosen[Math.floor(Math.random()*chosen.length)]||C.questions[0][2][0];
 return {word,x:rnd(65,W-65),y:top?rnd(-H,0):rnd(-220,-70),speed:rnd(1.35,3.3),phase:rnd(0,TAU),size:rnd(21,32),gold:false,opacity:rnd(.62,1)};
}

function initRain(){rainDrops=Array.from({length:32},()=>makeDrop(true));caught={};caughtTotal=0;lastCaught='';waterEnergy=0;rainActive=0;pendingGather=-1;lastCatch=-Infinity;hitFlashes=[];splashes=[];}

function basinSurfaceY(x,t){
 // 배경 영상의 U자형 물웅덩이와 대략 맞춘 접촉 높이
 const nx=Math.abs((x-W/2)/(W/2));
 return 1000-245*Math.pow(nx,1.65)+Math.sin(t*2+x*.016)*9;
}

function dropPosition(drop,t){return{x:drop.x+Math.sin(t*1.7+drop.phase)*15,y:drop.y};}

function catchAt(px,py){
  if(scene!=='rain'||mediaBlocked||pendingGather>=0||caughtTotal>=C.catchTarget||clock-lastCatch<.24)return false;
  let candidate=-1,best=Infinity;
  rainDrops.forEach((drop,i)=>{const p=dropPosition(drop,clock),n=Array.from(drop.word.replace(/ /g,'')).length,cy=p.y+(n-1)*drop.size*.5;const distance=((px-p.x)/Math.max(48,drop.size*1.15))**2+((py-cy)/Math.max(58,n*drop.size*.58))**2;if(distance<1.3&&distance<best){best=distance;candidate=i;}});
  if(candidate<0)return false;
  const drop=rainDrops[candidate],p=dropPosition(drop,clock);caught[drop.word]=(caught[drop.word]||0)+1;caughtTotal++;experienceHistory.push({type:'capture',word:drop.word,gesture:mode==='mouse'?'mouse':lastGesture,at:new Date().toISOString()});lastCaught=drop.word;lastCatch=clock;waterEnergy=clamp(caughtTotal/C.catchTarget,0,1);hitFlashes.push({word:drop.word,x:p.x,y:p.y,born:clock*1000});sound.play('word_catch',{pan:(p.x/W-.5)*1.4,volume:.85});emit(p.x,p.y,true,55);rainDrops[candidate]=makeDrop();
  if(caughtTotal===C.catchTarget)pendingGather=0;return true;
}

function drawRain(t,seconds){
 const active=mode==='mouse'||hands.length>0;
 if(pendingGather>=0){pendingGather+=seconds;if(pendingGather>=.85){setScene('gather');return;}}
 else if(active){rainActive+=seconds;if(rainActive>=C.rainMaxActiveSeconds){setScene('gather');return;}}
 const dt=active&&pendingGather<0?seconds*1000:0;
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
 drawSplashes(clock*1000);
 for(let i=hitFlashes.length-1;i>=0;i--){
  const f=hitFlashes[i],a=(clock*1000-f.born)/800;
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

function drawOrb(x,y,r,alpha=1){ctx.save();ctx.globalAlpha=alpha;const halo=ctx.createRadialGradient(x,y,0,x,y,r*2);halo.addColorStop(0,'rgba(255,246,197,.7)');halo.addColorStop(.42,'rgba(255,220,130,.35)');halo.addColorStop(1,'rgba(255,212,111,0)');ctx.fillStyle=halo;ctx.fillRect(x-r*2,y-r*2,r*4,r*4);ctx.shadowBlur=20;ctx.shadowColor='#ffdc8b';ctx.strokeStyle='#fff0c3';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.restore();}
function drawGather(t){
  const p=clamp(elapsed/C.gatherSeconds,0,1),converge=ease(p/.8),orbY=H*.515;
  waterTransform(1+ease(p)*.75,-ease(p)*6);
  if(p>.68){$('branchStill').classList.add('visible');$('branchStill').style.opacity=ease((p-.68)/.32);}
  // Expanding concentric ripples turn the basin into a full-frame dive.
  ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<5;k++){const r=30+((p*1.4+k*.2)%1)*1100;ctx.strokeStyle=`rgba(135,225,255,${(1-r/1150)*Math.sin(p*Math.PI)*.25})`;ctx.lineWidth=2+k;ctx.beginPath();ctx.ellipse(W/2,1030-ease(p)*340,r,r*.52,0,0,TAU);ctx.stroke();}ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<110;i++){const startX=W/2+Math.sin(i*2.4)*(25+(i*19)%255),startY=1015+Math.cos(i*2.1)*85;const spin=(1-converge)*Math.sin(t*1.6+i)*28;const x=startX+(W/2-startX)*converge+spin,y=startY+(orbY-startY)*converge+Math.cos(i+t)*spin*.4;ctx.fillStyle='#ffdf93';ctx.shadowColor='#ffdb82';ctx.shadowBlur=10;ctx.globalAlpha=.28+.4*converge;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.5,0,TAU);ctx.fill();}
  ctx.restore();drawOrb(W/2,1015+(orbY-1015)*converge,10+24*converge,p>.86?1-ease((p-.86)/.14):.9);
  if(p>=1)setScene('branch');
}
function drawBranch(){
  const at=videos.branch.currentTime;
  updateTiltLabels(at>=3);
  // One continuous clip: preserve its playhead while advancing PPT 6 -> 7.
  scene=at<3?'branch':at<7?'direction':'approach';
  const zoom=1+(.14+.12*result.strength)*ease((at-7)/3);videos.branch.style.transformOrigin=result.side==='left'?'30% 48%':'72% 48%';videos.branch.style.transform=`scale(${zoom})`;
}
function drawLightPath(){
  const p=clamp(elapsed/4,0,1),side=result.side==='left'?-1:1;
  // Dissolve the orb's old image as its particles leave, then carry the path
  // across the incoming underwater image instead of leaving two intact orbs.
  const v=videos.ending;if(v.readyState>=2){ctx.save();ctx.globalAlpha=ease((p-.1)/.72);ctx.drawImage(v,0,0,W,H);ctx.restore();}
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<180;i++){
    const a=i/179,travel=clamp(p*1.6-a*.6,0,1),bend=Math.sin(travel*Math.PI);
    const x=W*(.5+side*.10)*(1-travel)+W*.5*travel+side*bend*100+Math.sin(i*2.4)*18*(1-p);
    const y=H*.55*(1-travel)+H*.16*travel+Math.cos(i*1.7)*24*(1-p);
    ctx.globalAlpha=Math.sin(Math.PI*clamp(p*1.25,0,1))*(.3+.7*a);ctx.fillStyle='#ffedba';ctx.shadowColor='#ffd57e';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(x,y,1+(i%4)*.45,0,TAU);ctx.fill();
  }
  ctx.restore();
  if(p>=1)setScene('ending');
}
function drawDescent(){
  const p=clamp(elapsed/C.descentSeconds,0,1);
  // Carry the outgoing water frame over the first second of the restored
  // downward camera move; its final depth matches rain_bg.mp4.
  const outgoing=waterLayers[waterFront];
  if(p<.18&&outgoing.readyState>=2){ctx.save();ctx.globalAlpha=1-ease(p/.18);ctx.drawImage(outgoing,0,0,W,H);ctx.restore();}
  if(p>=1)setScene('rain');
}
function drawDust(t){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of dust){const x=p.x+Math.sin(t*.35+p.phase)*9,y=(p.y-t*p.speed+H*10)%H;ctx.fillStyle='#bcf1ff';ctx.globalAlpha=.08+.08*Math.sin(t*.5+p.phase);ctx.beginPath();ctx.arc(x,y,p.r,0,TAU);ctx.fill();}ctx.restore();}
function drawPointers(){for(const point of inputPoints()){ctx.save();ctx.strokeStyle=point.fist?'#ffe09a':'#c9f5ff';ctx.lineWidth=2;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(point.x,point.y,point.fist?15:9,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(point.x,point.y,2.4,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();}}
const camera=new CameraInput($('camera'),value=>{
  if(mode!=='camera')return;
  const previous=hands;hands=value.hands.map(p=>{const old=previous.find(o=>o.id===p.id);return old?{...p,x:old.x+(p.x-old.x)*.55,y:old.y+(p.y-old.y)*.55}:p;});
  if(!hands.length)resetHold();
  const gestureMode=$('gestureMode').value;
  for(const event of value.events){if(gestureMode!=='both'&&event.type!==gestureMode)continue;lastGesture=event.type==='clap'?'박수':'주먹';catchAt(event.x*W,event.y*H);}
},(state,message)=>{
  if(mode!=='camera')return;if($('inputStatus').textContent!==message)$('inputStatus').textContent=message;$('inputStatus').dataset.state=state;
  if(state==='error'){notice(message);$('operator').hidden=false;}
  else if(['select','rain'].includes(scene)&&state==='waiting')notice('손 전체가 카메라에 보이도록 들어 주세요.');
  else if(state==='tracking'&&!releaseRequired)notice();
});
async function changeMode(next){if(next==='mouse')experienceTest=true;mode=next;$('inputMode').value=next;clearInput();notice();updateUI();if(next==='mouse'){camera.stop();$('inputStatus').textContent='마우스 테스트';$('inputStatus').dataset.state='mouse';return true;}return camera.ready||await camera.connect();}
async function start(next){if(!station.allowed||station.held)return;sound.unlock();const attempt=++startAttempt;$('begin').disabled=true;$('mouseBegin').disabled=true;const ready=await changeMode(next);$('begin').disabled=false;$('mouseBegin').disabled=false;if(ready&&attempt===startAttempt&&scene==='intro'){chosen=[];caught={};caughtTotal=0;questionIndex=0;startedAt=Date.now();finishedAt=null;experienceHistory=[];experienceTest=next!=='camera'||station.preview;setScene('opening');}}
$('begin').onclick=()=>start('camera');$('mouseBegin').onclick=()=>start('mouse');$('again').onclick=reset;$('restart').onclick=reset;$('errorHome').onclick=reset;
$('resumeMedia').onclick=async()=>{if(!playback)return;const {key}=playback;hideVideoError();try{await sound.unlock();await resumeActive();visibleVideo(key);}catch{videoError('재생하지 못했습니다. 영상 파일과 브라우저를 확인해 주세요.');}};
$('reconnect').onclick=async()=>{await changeMode('camera');};$('inputMode').onchange=e=>changeMode(e.target.value);$('gestureMode').onchange=()=>{camera.gestures.reset();updateUI();};
$('operatorToggle').onclick=()=>{$('operator').hidden=!$('operator').hidden;};$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('stage').requestFullscreen().catch(()=>notice('브라우저 전체화면을 사용할 수 없습니다. F11로 실행해 주세요.'));};
function pos(e){const rect=canvas.getBoundingClientRect();pointer={x:clamp((e.clientX-rect.left)/rect.width*W,0,W),y:clamp((e.clientY-rect.top)/rect.height*H,0,H),active:true};}
canvas.addEventListener('pointermove',e=>{if(mode==='mouse')pos(e);});canvas.addEventListener('pointerdown',e=>{if(mode==='mouse'){pos(e);catchAt(pointer.x,pointer.y);}});canvas.addEventListener('pointerleave',()=>{pointer.active=false;if(mode==='mouse')resetHold();});
window.addEventListener('keydown',e=>{if(['SELECT','INPUT'].includes(document.activeElement?.tagName))return;if(['2','3','4','5'].includes(e.key)){if(!station.allowed||station.held)return;experienceTest=true;}if(['1','2','3','4','5'].includes(e.key))sound.unlock();if(e.key.toLowerCase()==='d')$('operator').hidden=!$('operator').hidden;else if(e.key==='Escape'){$('operator').hidden=true;resetHold();}else if(e.key==='1')reset();else if(e.key==='2'){questionIndex=0;chosen=[];setScene('select');}else if(e.key==='3'){if(!chosen.length)chosen=C.questions.map(q=>q[2][0]);setScene('rain');}else if(e.key==='4'||e.key==='5'){const side=e.key==='4'?'left':'right';result=C.resolveResult({},'',Array(7).fill(side==='left'?'성장 기회':'고용 안정'));setScene('branch');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.pause();else sound.resume();clearInput();lastFrame=0;if(document.hidden){visibilityPaused=!!activeKey&&!(activeKey==='water'?waterLayers[waterFront]:videos[activeKey]).paused;[...Object.values(videos),...waterLayers].forEach(v=>v.pause());}else if(visibilityPaused&&activeKey){visibilityPaused=false;resumeActive().catch(()=>videoError('계속하려면 다시 재생을 눌러 주세요.'));}});
window.addEventListener('pagehide',()=>{camera.stop();sound.pause();});
$('soundEnabled').onchange=e=>sound.setEnabled(e.target.checked);$('soundVolume').oninput=e=>sound.setVolume(e.target.value/100);
function loop(now){
  const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):0;lastFrame=now;camera.tick(now,['select','rain'].includes(scene));
  if(document.hidden){requestAnimationFrame(loop);return;}
  updateWater();const advancing=!mediaBlocked&&(station.allowed||scene==='complete');const step=advancing?dt:0;clock+=step;elapsed+=step;ctx.clearRect(0,0,W,H);
  if(scene==='intro'){drawDust(clock);}
  else if(scene==='select'){if(advancing)drawSelection(clock,step);else drawSelection(clock,0);drawDust(clock);drawParticles(step*1000);drawPointers();}
  else if(scene==='descent'){drawDescent();drawDust(clock);}
  else if(scene==='rain'){drawRain(clock,step);drawDust(clock);drawParticles(step*1000);drawPointers();}
  else if(scene==='gather'){drawGather(clock);drawParticles(step*1000);}
  else if(['branch','direction','approach'].includes(scene)){drawBranch();}
  else if(scene==='lightpath'){drawLightPath();}
  else if(scene==='ending'&&!videos.ending.classList.contains('visible')&&videos.ending.readyState>=2){ctx.drawImage(videos.ending,0,0,W,H);}
  else if(scene==='complete'&&elapsed>12&&!station.held)void reset();
  if(!$('operator').hidden)$('diagnostic').textContent=`장면: ${phases[scene]||scene}\n입력: ${mode} · 손: ${hands.length} · 마지막 제스처: ${lastGesture||'없음'}\n선택: ${chosen.length}/7 · 잡은 단어: ${caughtTotal}/${C.catchTarget}\n점수: 발전 ${result?.development??0} / 안정 ${result?.stability??0}\n결과: ${result?result.label:'미정'} · 활성 체험: ${rainActive.toFixed(1)}초`;
  requestAnimationFrame(loop);
}
// An explicit diagnostic hook is installed only by local test pages before load.
if(window.__WAVE_TEST__)window.__wave={get state(){return{scene,mode,questionIndex,chosen:[...chosen],caught:{...caught},caughtTotal,result,elapsed,rainActive,mediaBlocked,hands:[...hands],hoverSince};},setScene,reset,catchAt,targets,step:seconds=>{clock+=seconds;elapsed+=seconds;if(scene==='select')drawSelection(clock,seconds);else if(scene==='rain')drawRain(clock,seconds);else if(scene==='gather')drawGather(clock);else if(scene==='descent')drawDescent();else if(scene==='lightpath')drawLightPath();else if(['branch','direction','approach'].includes(scene))drawBranch();},sound,camera,receive:value=>camera.onResult(value),drops:()=>rainDrops,chooseForTest:words=>{chosen=[...words];},setPointer:(x,y,active=true)=>{pointer={x,y,active};},get clock(){return clock;},setCaughtForTest:(counts,last)=>{caught={...counts};caughtTotal=Object.values(counts).reduce((a,b)=>a+b,0);lastCaught=last;}};
if(location.protocol==='file:'){$('launchHelp').hidden=true;notice('카메라 사용은 실행하기.bat로 실행해 주세요. 마우스 미리보기는 직접 열어도 사용할 수 있습니다.');}

function stationUI(){
  $('stationGate').hidden=station.allowed||scene!=='intro';
  $('stationError').textContent=station.error;
  $('stationInfo').textContent=station.active?`연결 관객: ${station.active.nickname} · ${station.active.participant_code}`:station.preview?'마우스 미리보기 · DB 저장 안 함':station.saved?'체험 완료 · DB 저장됨':'QR 입장 대기 · 3조 / 부스 코드 1002';
  $('stationSave').hidden=!station.held;
  $('stationSaveText').textContent=station.saving?'체험 결과를 저장하고 있습니다.':station.error||'체험 결과 저장을 다시 시도해 주세요.';
  $('stationRetry').disabled=station.saving;
}
async function saveExperience(){
  if(!station.active||station.preview)return;
  try{
    const payload=WaveStation.resultForExperience(C,{chosen,caught,caughtTotal,lastCaught,rainActive,mode,test:experienceTest||!!window.__WAVE_TEST__,startedAt,finishedAt,history:experienceHistory});
    await station.finish(payload);
  }catch{notice('미리보기 또는 테스트 체험입니다. DB 완료 기록은 저장하지 않습니다. 처음으로 돌아가 다시 진행해 주세요.');}
}
const station=new WaveStation.Controller({request:WaveStation.request,onChange:stationUI,
  onAssignment:()=>{camera.stop();mode='camera';$('inputMode').value='camera';resetArtwork();},
  onLost:()=>resetArtwork()});
$('stationPreview').onclick=()=>{if(station.enterPreview())void start('mouse');};
$('stationRefresh').onclick=()=>station.refresh();$('stationRetry').onclick=()=>station.retry();
void station.refresh();setInterval(()=>void station.refresh(),2000);
setScene('intro');stationUI();requestAnimationFrame(loop);
})();
