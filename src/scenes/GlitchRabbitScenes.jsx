import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {FishAudioController as SceneAudioController} from '../fish-audio.js';
import {GlitchTimeline,quadrantAt,drawGlitchRegion,drawGlassCracks,activeGlitchRegions} from '../quadrant-glitch.js';
import {cameraWrist} from '../dual-wrists.js';
import {bodyMaskPixels} from '../glitch-mask.js';
import './glitch-rabbit.css';

function coverCamera(ctx,video,w,h){
 const vw=video.videoWidth,vh=video.videoHeight,aspect=w/h;
 const sw=Math.min(vw,vh*aspect),sh=sw/aspect;
 ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,w,h);ctx.restore();
}
function demoCamera(ctx,w,h,time,point){
 const glow=ctx.createLinearGradient(0,0,w,h);glow.addColorStop(0,'#53717b');glow.addColorStop(1,'#1d2835');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#c0d5d222';ctx.lineWidth=2;for(let x=0;x<w;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 const x=w*.5+Math.sin(time/1800)*15;ctx.fillStyle='#a9b7bd';ctx.beginPath();ctx.ellipse(x,h*.74,w*.22,h*.4,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d3b6a7';ctx.beginPath();ctx.ellipse(x,h*.3,w*.075,h*.17,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#25313b';ctx.beginPath();ctx.ellipse(x,h*.19,w*.078,h*.07,0,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle='#28343e';ctx.fillRect(x-35,h*.29,12,5);ctx.fillRect(x+23,h*.29,12,5);
 if(point){ctx.strokeStyle='#a9b7bd';ctx.lineWidth=45;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w*.15,h*.6);ctx.lineTo(point.x*w,point.y*h);ctx.stroke();ctx.fillStyle='#d3b6a7';ctx.beginPath();ctx.arc(point.x*w,point.y*h,20,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#eaf6f0';ctx.font='16px sans-serif';ctx.fillText('마우스 테스트 · 가상 웹캠',24,h-25);
}
const GlitchRabbitScenes=forwardRef(function GlitchRabbitScenes({scene,runKey,handRef,handsRef,cameraRef,maskRef,mode,onAdvance},ref){
 const timelineRef=useRef(null),cursorNodes=useRef([]);
 const canvas=useRef(null),rabbit=useRef(null),sound=useRef(null),music=useRef(null);
 const glitchSound=useRef(null),glitchNoise=useRef(null);
 const live=useRef({scene,onAdvance,mode});live.current={scene,onAdvance,mode};
 const [problem,setProblem]=useState(''),[blocked,setBlocked]=useState('');
 const active=scene==='glitch'||scene==='rabbitPause'||scene==='rabbit';
 async function playRabbit(){
  setBlocked('');try{rabbit.current.muted=false;await rabbit.current.play();}catch(e){if(live.current.scene!=='rabbit')return;if(e.name==='NotAllowedError')setBlocked('rabbit');else if(e.name!=='AbortError')setProblem('rabbit_VD.mp4 영상을 재생할 수 없습니다.');}
 }
 useImperativeHandle(ref,()=>({finish(){if(live.current.scene==='glitch')timelineRef.current?.finish(performance.now());},prime(){
  music.current?.prime();glitchNoise.current?.prime();const v=rabbit.current;if(!v||v.readyState<1||live.current.scene==='rabbit')return;
  v.volume=0;v.play()?.then(()=>{if(live.current.scene!=='rabbit'){v.pause();v.currentTime=0;}v.volume=1;}).catch(()=>{v.volume=1;});
 }}));
 useEffect(()=>{
  music.current=new SceneAudioController(sound.current,e=>{if(live.current.scene==='glitch')setBlocked('audio');},{volume:.9,loop:true,limit:Infinity});
  glitchNoise.current=new SceneAudioController(glitchSound.current,e=>{if(live.current.scene==='glitch')setBlocked('audio');},{volume:.7,loop:true,limit:Infinity});
  let raf;function tick(now){music.current.tick(now);glitchNoise.current.tick(now);sound.current.dataset.volume=String(Math.round(sound.current.volume*100));glitchSound.current.dataset.volume=String(Math.round(glitchSound.current.volume*100));raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(raf);music.current.stop();glitchNoise.current.stop();};
 },[]);
 useEffect(()=>{
  setBlocked('');setProblem('');rabbit.current.pause();rabbit.current.currentTime=0;
  for(const audio of [music.current,glitchNoise.current]){if(scene==='glitch')audio.start();else if(scene==='standby')audio.stop();else audio.fadeOut(performance.now());}
  if(scene==='rabbit')playRabbit();
  if(scene==='rabbitPause'){
   music.current.stop();glitchNoise.current.stop();
   const timer=setTimeout(()=>{if(live.current.scene==='rabbitPause')live.current.onAdvance('rabbitPause');},2000);
   return()=>clearTimeout(timer);
  }
 },[scene,runKey]);
 useEffect(()=>{
  if(scene!=='glitch')return;
  const ctx=canvas.current.getContext('2d'),source=document.createElement('canvas'),patch=document.createElement('canvas');
  source.width=1280;source.height=720;patch.width=640;patch.height=360;
  const s=source.getContext('2d'),timeline=new GlitchTimeline(performance.now());
  timelineRef.current=timeline;
  const body=document.createElement('canvas'),rawMask=document.createElement('canvas');body.width=1280;body.height=720;
  const b=body.getContext('2d');let maskVersion=-1;
  let raf,last=0;
  function frame(now){
   if(live.current.scene!=='glitch')return;
   const state=timeline.update(now);music.current.transition(state.fade);glitchNoise.current.transition(state.fade);
   if(state.advance){live.current.onAdvance('glitch');return;}
    const mode=live.current.mode;
    const points=mode==='camera'?handsRef.current.map(h=>cameraWrist(h,cameraRef.current?.videoWidth,cameraRef.current?.videoHeight)).filter(h=>quadrantAt(h)):mode==='demo'&&handRef.current?[handRef.current]:[];
    for(let i=0;i<2;i++){const el=cursorNodes.current[i],point=points[i];if(!el)continue;el.style.display=point?'block':'none';if(point){el.style.left=point.x*100+'%';el.style.top=point.y*100+'%';}}
   if(now-last>=66){last=now;
    const point=points[0]??null;
    if(mode==='camera'&&cameraRef.current?.readyState>=2)coverCamera(s,cameraRef.current,1280,720);
    else if(mode==='demo')demoCamera(s,1280,720,now,point);
    else {s.fillStyle='#070b13';s.fillRect(0,0,1280,720);s.fillStyle='#d1dae3';s.font='28px sans-serif';s.textAlign='center';s.fillText('웹캠 화면을 기다리고 있어요',640,360);s.textAlign='left';}
    ctx.filter='grayscale(1) brightness(.48) contrast(1.15)';ctx.drawImage(source,0,0);ctx.filter='none';
    const quadrant=quadrantAt(point),regions=activeGlitchRegions(state.elapsed,points);
    canvas.current.dataset.wristCount=String(points.length);
    canvas.current.dataset.quadrant=quadrant??'';canvas.current.dataset.regions=regions.join(',');canvas.current.dataset.elapsed=String(Math.round(state.elapsed));
    let bodyMask=null;
    if(mode==='camera'&&maskRef.current&&now-maskRef.current.time<700){
     const sample=maskRef.current;
     if(sample.version!==maskVersion){
      maskVersion=sample.version;rawMask.width=sample.mask.width;rawMask.height=sample.mask.height;
      rawMask.getContext('2d').putImageData(new ImageData(bodyMaskPixels(sample.mask),sample.mask.width,sample.mask.height),0,0);
      b.clearRect(0,0,1280,720);b.save();b.translate(1280,0);b.scale(-1,1);b.drawImage(rawMask,0,0,1280,720);b.restore();
     }
     bodyMask=body;
    }else if(mode==='demo'){
     b.clearRect(0,0,1280,720);const x=640+Math.sin(now/1800)*15;b.fillStyle='#000';
     b.beginPath();b.ellipse(x,720*.74,1280*.22,720*.4,0,0,Math.PI*2);b.fill();
     b.beginPath();b.ellipse(x,720*.3,1280*.078,720*.18,0,0,Math.PI*2);b.fill();
     if(point){b.strokeStyle='#000';b.lineWidth=45;b.lineCap='round';b.beginPath();b.moveTo(x+1280*.15,720*.6);b.lineTo(point.x*1280,point.y*720);b.stroke();b.beginPath();b.arc(point.x*1280,point.y*720,20,0,Math.PI*2);b.fill();}
     bodyMask=body;
    }
    canvas.current.dataset.bodyMask=bodyMask?(mode==='demo'?'demo':'camera'):'waiting';
    for(const region of regions)drawGlitchRegion(ctx,source,patch,region,now,bodyMask);
    drawGlassCracks(ctx,1280,720,regions);

   }
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[scene,runKey,handRef,handsRef,cameraRef,maskRef]);
 return <section className={`glitch-rabbit-scenes ${active?'is-visible':''}`} aria-label={scene==='rabbitPause'?'토끼해킹 전 검정 화면':scene==='rabbit'?'05. 토끼해킹':'04. 4분할글리치'}>
  <audio ref={sound} src="/audio/4space_BGM.mp4" loop preload="auto" aria-label="4분할글리치 배경음악" onError={()=>setProblem('4space_BGM.mp4 오디오를 확인해 주세요.')}/>
  <audio ref={glitchSound} src="/audio/glitch.wav" loop preload="auto" aria-label="glitch 배경 효과음" onError={()=>setProblem('glitch.wav 오디오를 확인해 주세요.')}/>
  <canvas ref={canvas} width="1280" height="720" className={`quadrant-camera ${scene==='glitch'?'is-visible':''}`} data-figma-node="59:23" aria-label="손목 위치에 반응하는 4분할 웹캠"/>
  {scene==='glitch'&&[0,1].map(i=><div key={i} ref={el=>{cursorNodes.current[i]=el;}} className="glitch-wrist-cursor" aria-label={`손목 커서 ${i+1}`} style={{display:'none'}}/>)}
  <video ref={rabbit} className={`rabbit-film ${scene==='rabbit'?'is-visible':''}`} src="/videos/rabbit_VD.mp4" playsInline preload="auto" onEnded={()=>{if(live.current.scene==='rabbit')live.current.onAdvance('rabbit');}} data-figma-node="57:9" aria-label="rabbit_VD 토끼해킹 영상" onError={()=>setProblem('rabbit_VD.mp4 원본 영상을 확인해 주세요.')}/>
  {active&&problem&&<div className="glitch-message" role="alert">{problem}</div>}
  {active&&blocked&&!problem&&<button className="glitch-message" onClick={()=>{setBlocked('');if(blocked==='rabbit')playRabbit();else{music.current.start();glitchNoise.current.start();}}}>{blocked==='rabbit'?'토끼 영상 재생':'배경음악 재생'}</button>}
 </section>;
});
export default GlitchRabbitScenes;
