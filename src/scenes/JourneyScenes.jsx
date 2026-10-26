import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {GAME_FADE_MS,KING_REVEAL_MS,SEA_PLAYBACK_RATE,GAME_SLOTS,LanePressure,JourneyCursor,turtleFrame,seaSpriteBrightness} from '../turtle-game.js';
import {FishAudioController} from '../fish-audio.js';
import './journey.css';


const JourneyScenes=forwardRef(function JourneyScenes({scene,runKey,handRef,enabled,onAdvance},ref){
 const sea=useRef(null),king=useRef(null),left=useRef(null),right=useRef(null),jara=useRef(null),cursor=useRef(null),black=useRef(null);
 const live=useRef({scene,onAdvance});live.current={scene,onAdvance};
 const endAt=useRef(null),kingAt=useRef(null),fired=useRef(false);
 const fishSound=useRef(null),fishAudio=useRef(null),ambienceSound=useRef(null),ambienceAudio=useRef(null);
 const ripple=useRef(null);
 const cursorMotion=useRef(new JourneyCursor()),lanePressure=useRef(new LanePressure());
 const [fishBlocked,setFishBlocked]=useState(false);
 const [problem,setProblem]=useState({}),[blocked,setBlocked]=useState(null);
 const active=scene==='minigame'||scene==='king';
 async function play(name){
  const v=name==='minigame'?sea.current:king.current;if(!v)return;
  setBlocked(null);v.muted=false;v.volume=1;v.playbackRate=name==='minigame'?SEA_PLAYBACK_RATE:1;
  try{await v.play();if(name==='minigame'&&live.current.scene===name){fishAudio.current?.start();ambienceAudio.current?.start();}}catch(e){if(live.current.scene!==name)return;if(e.name==='NotAllowedError')setBlocked(name);else if(e.name!=='AbortError')setProblem(p=>({...p,[name]:'영상을 재생하지 못했습니다. 원본 MP4 파일을 확인해 주세요.'}));}
 }
 useImperativeHandle(ref,()=>({finish(){if(live.current.scene==='minigame'&&endAt.current===null){sea.current.pause();endAt.current=performance.now();}},prime(){
  fishAudio.current?.prime();ambienceAudio.current?.prime();
  for(const [name,v] of [['minigame',sea.current],['king',king.current]]){
   if(!v||v.readyState<1||live.current.scene===name)continue;
   v.volume=0;v.play()?.then(()=>{if(live.current.scene!==name){v.pause();v.currentTime=0;}v.volume=1;}).catch(()=>{v.volume=1;});
  }
 }}));
 useEffect(()=>{
  fishAudio.current=new FishAudioController(fishSound.current,e=>{if(live.current.scene!=='minigame')return;if(e.name==='NotAllowedError')setFishBlocked(true);else setProblem(p=>({...p,fish:'fish_A 오디오를 재생할 수 없습니다. 원본 파일을 확인해 주세요.'}));});
  ambienceAudio.current=new FishAudioController(ambienceSound.current,e=>{if(live.current.scene!=='minigame')return;if(e.name==='NotAllowedError')setFishBlocked(true);else setProblem(p=>({...p,fish:'수중 배경음을 재생할 수 없습니다.'}));},{volume:.18,loop:true,limit:Infinity});
  let raf;function tick(now){fishAudio.current.tick(now);ambienceAudio.current.tick(now);fishSound.current.dataset.volume=String(Math.round(fishSound.current.volume*100));ambienceSound.current.dataset.volume=String(Math.round(ambienceSound.current.volume*100));raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(raf);fishAudio.current.stop();ambienceAudio.current.stop();};
 },[]);
 useEffect(()=>{
  endAt.current=null;fired.current=false;kingAt.current=scene==='king'?performance.now():null;
  if(black.current)black.current.style.opacity=scene==='king'?'1':'0';
  if(scene==='standby'){fishAudio.current?.stop();ambienceAudio.current?.stop();}
  else if(scene!=='minigame'){fishAudio.current?.fadeOut(performance.now());ambienceAudio.current?.fadeOut(performance.now());}
  if(cursor.current)cursor.current.style.opacity='0';
  cursorMotion.current.reset();lanePressure.current.reset();
  setFishBlocked(false);
  for(const [name,v] of [['minigame',sea.current],['king',king.current]]){
   v.pause();v.currentTime=0;if(scene===name)play(name);
  }
  setBlocked(null);
 },[scene,runKey]);
 useEffect(()=>{
  if(!active)return;
  let raf;
  function frame(now){
   if(live.current.scene==='minigame'){
    const pressure=lanePressure.current.update(enabled?handRef.current:null,now);
    const f=turtleFrame(sea.current.currentTime,{duration:sea.current.duration||19.958333,...pressure});
    sea.current.dataset.laneWidth=String(f.right-f.left);sea.current.dataset.leftPressure=String(pressure.leftPressure);sea.current.dataset.rightPressure=String(pressure.rightPressure);
    const brightness=seaSpriteBrightness(sea.current.currentTime,sea.current.duration);
    for(const element of [left.current,right.current,jara.current])element.firstElementChild.style.filter=`brightness(${brightness})`;
    const point=cursorMotion.current.update(enabled?handRef.current:null,now,f);
    cursor.current.style.opacity=String(point?.opacity??0);
    if(point)cursor.current.style.transform=`translate(${point.x}px,${point.y}px)`;
    ripple.current.setAttribute('scale',String(f.entry*42));
    left.current.style.transform=`translateX(${f.leftOffset}px)`;right.current.style.transform=`translateX(${f.rightOffset}px)`;
    jara.current.style.transform=`translate(${f.jara.x-GAME_SLOTS.jara.w/2}px,${f.jara.y-GAME_SLOTS.jara.h/2}px)`;
    if(endAt.current!==null){const p=Math.min(1,(now-endAt.current)/GAME_FADE_MS);black.current.style.opacity=String(p);fishAudio.current?.transition(p);ambienceAudio.current?.transition(p);
     if(p===1&&!fired.current){fired.current=true;live.current.onAdvance('minigame');}
    }
   }else if(live.current.scene==='king'&&kingAt.current!==null)black.current.style.opacity=String(Math.max(0,1-(now-kingAt.current)/KING_REVEAL_MS));
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[scene,active,enabled,handRef]);
 return <section className={`journey-scenes ${active?'is-visible':''}`} aria-label={scene==='king'?'03. 용왕':'02. 자라미니게임'}>
  <audio ref={fishSound} src="/audio/fish_A-25s.wav" preload="auto" aria-label="미니게임 물고기 음성 fish_A" onEnded={()=>fishAudio.current?.stop()} onError={()=>setProblem(p=>({...p,fish:'public/audio/fish_A-25s.wav 파일을 재생할 수 없습니다.'}))}/>
  <audio ref={ambienceSound} src="/audio/underwater-ambience.mp3" preload="auto" loop aria-label="수중 배경음 underwater-ambience" onError={()=>setProblem(p=>({...p,fish:'underwater-ambience.mp3 파일을 확인해 주세요.'}))}/>
  <svg className="journey-filter-defs" aria-hidden="true"><defs><filter id="fish-water-ripple" x="-10%" y="0%" width="120%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.00001 0.002" numOctaves="1" seed="8" result="noise"><animate attributeName="baseFrequency" values="0.00001 0.002;0.00001 0.003;0.00001 0.002" dur="8s" repeatCount="indefinite"/></feTurbulence><feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 .5  0 0 1 0 0  0 0 0 1 0" result="horizontal"/><feDisplacementMap ref={ripple} in="SourceGraphic" in2="horizontal" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
  <div className={`turtle-scene ${scene==='minigame'?'is-visible':''}`} data-figma-node="57:14">
   <video ref={sea} src="/videos/deepsea_VD.mp4" className="journey-film" playsInline preload="auto" aria-label="deepsea_VD 심해 영상" data-figma-node="57:11" onLoadedMetadata={()=>{sea.current.playbackRate=SEA_PLAYBACK_RATE;setProblem(p=>({...p,minigame:null}));}} onError={()=>setProblem(p=>({...p,minigame:'public/videos/deepsea_VD.mp4 원본 영상을 확인해 주세요.'}))} onEnded={()=>{if(live.current.scene==='minigame'&&endAt.current===null)endAt.current=performance.now();}}/>
   <div ref={right} className="fish-wall fish-right" data-figma-node="57:18"><img src="/assets/fish_right.png" alt="오른쪽 물고기 길"/></div>
   <div ref={left} className="fish-wall fish-left" data-figma-node="57:19"><img src="/assets/fish_left.png" alt="왼쪽 물고기 길"/></div>
   <div ref={jara} className="turtle-sprite" data-figma-node="57:17"><img src="/assets/jara.png" alt="길을 안내하는 자라"/></div>
   <div ref={cursor} className="sea-wrist-cursor" aria-label="손목을 따라오는 금빛 커서"><div className="sea-cursor-glow"><i className="sea-cursor-rays"/><i className="sea-cursor-core"/></div></div>
   <div className="underwater-bubbles" aria-hidden="true">{Array.from({length:42},(_,i)=><i key={i} className="water-bubble" style={{left:`${(i*37.7)%100}%`,width:22+(i*17)%52,height:22+(i*17)%52,'--duration':`${8+(i*1.13)%7}s`,'--delay':`${-(i*1.79)%15}s`,'--sway':`${(i%2?-1:1)*(35+i%6*12)}px`}}/>)}</div>
   <header className="turtle-instructions"><h1>자라를 따라 용궁으로 깊은 곳으로 떠나보아요</h1><p>손을 움직여 빛과 함께 길을 따라가보세요</p><p className="turtle-instructions-en" lang="en">Move your hand and follow the path with the light.</p></header>
  </div>
  <video ref={king} src="/videos/king_VD.mp4" className={`king-film journey-film ${scene==='king'?'is-visible':''}`} playsInline preload="auto" aria-label="king_VD 용왕 영상" onEnded={()=>{if(live.current.scene==='king')live.current.onAdvance('king');}} data-figma-node="57:8" onLoadedMetadata={()=>setProblem(p=>({...p,king:null}))} onError={()=>setProblem(p=>({...p,king:'public/videos/king_VD.mp4 원본 영상을 확인해 주세요.'}))}/>
  <div ref={black} className="journey-blackout" aria-hidden="true"/>
  {active&&problem[scene]&&<div className="journey-message" role="alert">{problem[scene]}</div>}
  {active&&blocked===scene&&!problem[scene]&&<button className="journey-message" onClick={()=>play(scene)}>영상 재생</button>}
  {scene==='minigame'&&problem.fish&&<div className="journey-message" role="alert">{problem.fish}</div>}
  {scene==='minigame'&&fishBlocked&&!problem.fish&&<button className="journey-message" onClick={()=>{setFishBlocked(false);fishAudio.current?.start();ambienceAudio.current?.start();}}>소리 재생</button>}
 </section>;
});
export default JourneyScenes;
