import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {journeyFadeProgress,KING_REVEAL_MS} from '../turtle-game.js';
import {SplashGuides,splashAudioFade} from '../splash-guides.js';
import {FishAudioController} from '../fish-audio.js';
import {EndingCursorDisplay} from '../ending-wrists.js';
import {createWaterWhoosh} from '../splash-feedback.js';
import './journey.css';

const JourneyScenes=forwardRef(function JourneyScenes({scene,runKey,handsRef,enabled,mode,onAdvance},ref){
 const sea=useRef(null),king=useRef(null),black=useRef(null),game=useRef(new SplashGuides());
 const fishAudio=useRef(null),fish=useRef(null);
 const live=useRef({scene,onAdvance});live.current={scene,onAdvance};
 const endAt=useRef(null),kingAt=useRef(null),fired=useRef(false),foam=useRef([]),serial=useRef(0);
 const [ui,setUi]=useState({turns:0,rate:.8,foam:[],targets:game.current.targets}),[problem,setProblem]=useState({}),[blocked,setBlocked]=useState(null);
 const [entranceStarted,setEntranceStarted]=useState(false);
 const cursorNodes=useRef({}),cursorDisplay=useRef(new EndingCursorDisplay()),demoHands=useRef([]),whoosh=useRef(null);
 if(!whoosh.current)whoosh.current=createWaterWhoosh();
 const [boost,setBoost]=useState(0);
 const active=scene==='minigame'||scene==='king';
 function apply(events,now){
  if(!events.length)return;
  if(game.current.rate>sea.current.playbackRate){setBoost(n=>n+1);whoosh.current.play();}
  sea.current.playbackRate=game.current.rate;
  for(const event of events)foam.current.push({id:serial.current++,x:event.x,y:event.y,time:now});
  foam.current=foam.current.slice(-12);
  setUi({turns:game.current.turns,rate:game.current.rate,foam:[...foam.current],targets:game.current.targets});
 }
 async function play(name){
  const v=name==='minigame'?sea.current:king.current;
  setBlocked(null);v.muted=false;v.volume=1;v.playbackRate=name==='minigame'?game.current.rate:1;v.preservesPitch=true;
  try{await v.play();if(name==='minigame'&&live.current.scene===name&&!fish.current?.active)await fish.current?.start();}catch(e){if(live.current.scene!==name)return;if(e.name==='NotAllowedError')setBlocked(name);else if(e.name!=='AbortError')setProblem(p=>({...p,[name]:'영상을 재생하지 못했습니다. MP4 파일을 확인해 주세요.'}));}
 }
 useImperativeHandle(ref,()=>({
  finish(){if(live.current.scene==='minigame'&&endAt.current===null){sea.current.pause();endAt.current=performance.now();}},
  testTurn(){
   if(mode!=='demo'||live.current.scene!=='minigame'||endAt.current!==null)return;
   const now=performance.now(),events=[];
   for(const at of [now-100,now]){
    const points=game.current.targets.map((t,i)=>({id:i?'Right':'Left',x:t.x,y:t.y,sampleAt:at}));
    events.push(...game.current.update(points,at));demoHands.current=points;
   }
   apply(events,now);
  },
  prime(){whoosh.current.arm();fish.current?.prime();for(const [name,v] of [['minigame',sea.current],['king',king.current]]){
   if(!v||v.readyState<1||live.current.scene===name)continue;
   v.volume=0;v.play()?.then(()=>{if(live.current.scene!==name){v.pause();v.currentTime=0;v.volume=1;}}).catch(()=>{});
  }}
 }));
 useEffect(()=>{
  fish.current=new FishAudioController(fishAudio.current,e=>{if(live.current.scene!=='minigame')return;if(e.name==='NotAllowedError')setBlocked('minigame');else setProblem(p=>({...p,minigame:'fish_A 오디오를 재생하지 못했습니다.'}));},{volume:.85,limit:Infinity});
  return()=>fish.current?.stop();
 },[]);
 useEffect(()=>{
  endAt.current=null;fired.current=false;kingAt.current=scene==='king'?performance.now():null;
  game.current.reset();cursorDisplay.current=new EndingCursorDisplay();demoHands.current=[];setBoost(0);setEntranceStarted(false);whoosh.current.stop();fish.current?.stop();foam.current=[];setUi({turns:0,rate:game.current.rate,foam:[],targets:game.current.targets});setBlocked(null);
  if(black.current)black.current.style.opacity=scene==='king'?'1':'0';
  for(const [name,v] of [['minigame',sea.current],['king',king.current]]){v.pause();v.currentTime=0;if(scene===name)play(name);}
  return()=>{sea.current?.pause();king.current?.pause();fish.current?.stop();};
 },[scene,runKey,mode]);
 useEffect(()=>()=>whoosh.current.close(),[]);
 useEffect(()=>{
  if(!active)return;let raf;
  function frame(now){
   if(live.current.scene==='minigame'){
    const v=sea.current;
    const rawHands=enabled?(mode==='camera'?(handsRef?.current||[]):demoHands.current.filter(h=>now-h.sampleAt<1800)):[];
    const display=cursorDisplay.current.update(rawHands,now);
    for(const id of ['Left','Right']){const el=cursorNodes.current[id],point=display.find(p=>p.id===id);if(el){el.style.opacity=String(point?.opacity??0);if(point)el.style.transform=`translate(${point.x*3840}px,${point.y*2160}px)`;}}
    if(enabled&&mode==='camera'&&endAt.current===null&&!v.paused&&!v.seeking)apply(game.current.update(rawHands,now),now);
    const remaining=foam.current.filter(b=>now-b.time<2100);
    if(remaining.length!==foam.current.length){foam.current=remaining;setUi({turns:game.current.turns,rate:game.current.rate,foam:[...remaining],targets:game.current.targets});}
    v.dataset.turns=String(game.current.turns);v.dataset.rate=String(game.current.rate);v.dataset.strokes=String(game.current.strokeCount);
    fish.current?.transition(splashAudioFade(v,endAt.current===null?0:journeyFadeProgress(now,endAt.current)));
    if(endAt.current!==null){const p=journeyFadeProgress(now,endAt.current);black.current.style.opacity=String(p);v.volume=1-p;if(p===1&&!fired.current){fired.current=true;live.current.onAdvance('minigame');}}
   }else if(live.current.scene==='king'&&kingAt.current!==null)black.current.style.opacity=String(Math.max(0,1-(now-kingAt.current)/KING_REVEAL_MS));
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[scene,active,enabled,mode,handsRef]);
 return <section className={`journey-scenes ${active?'is-visible':''}`} aria-label={scene==='king'?'03. 용왕':'02. 첨벙첨벙 자라미니게임'}>
  <div className={`turtle-scene splash-scene ${scene==='minigame'?'is-visible':''}`}>
   <video ref={sea} src="/videos/jara01.mp4" className="journey-film" playsInline preload="auto" aria-label="jara01 첨벙첨벙 영상" onPlaying={()=>{if(live.current.scene==='minigame')setEntranceStarted(true);}} onLoadedMetadata={()=>setProblem(p=>({...p,minigame:null}))} onError={()=>setProblem(p=>({...p,minigame:'public/videos/jara01.mp4 영상을 확인해 주세요.'}))} onEnded={()=>{if(live.current.scene==='minigame'&&endAt.current===null)endAt.current=performance.now();}}/>
   <div className="splash-foam" aria-hidden="true">{ui.foam.map(b=><div key={b.id} className="foam-burst at-target" style={{left:b.x*100+'%',top:b.y*100+'%'}}>{Array.from({length:24},(_,i)=><i key={i} style={{'--x':`${-140+(i*53)%280}px`,'--y':`${-100+(i*47)%200}px`,'--drift':`${(i%2?-1:1)*(80+(i*47)%190)}px`,'--rise':`${180+(i*97)%400}px`,'--size':`${30+(i*23)%85}px`,'--delay':`${i%5*.025}s`}}/>)}</div>)}</div>
   <div className="splash-targets" aria-label="양손 대각선 터치 가이드">{ui.targets.filter(t=>!t.hit).map(t=><div key={t.id} className="ending-crack splash-target" data-target-id={t.id} style={{left:t.x*100+'%',top:t.y*100+'%',width:t.r*4320,height:t.r*4320}} aria-label="손으로 터치할 빛"><i/><i/><b/></div>)}</div>
   {boost>0&&<div key={boost} className="splash-speed-effect" aria-hidden="true"><div className="speed-water-ring"/>{Array.from({length:24},(_,i)=><i key={i} style={{'--angle':`${i*15+7}deg`,'--reach':`${750+(i*113)%1150}px`,'--streak-length':`${180+(i*47)%300}px`}}/>)}</div>}
   {['Left','Right'].map(id=><div key={id} ref={el=>cursorNodes.current[id]=el} className="splash-wrist" aria-label={`${id==='Left'?'왼쪽':'오른쪽'} 손목 커서`}>
    <div className="wrist-bubbles" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--bubble-size':`${20+(i*17)%46}px`,'--bubble-drift':`${(i%2?-1:1)*(22+(i*13)%65)}px`,'--bubble-rise':`${160+(i*37)%220}px`,'--bubble-time':`${1.35+(i%5)*.2}s`,'--bubble-phase':`${-i*.19}s`}}/>)}</div>
    <div className="ending-wrist splash-common-cursor" aria-hidden="true"/>
   </div>)}
   <header className="turtle-instructions splash-instructions"><h1>자라와 함께 용궁 속으로 떠나보아요</h1><p>양손으로 두 빛을 터치하고, 반대쪽 빛을 따라 첨벙첨벙 헤엄쳐보세요.</p><p className="turtle-instructions-en">Touch both lights with your hands, then follow the opposite pair.</p></header>
   {scene==='minigame'&&<div key={runKey} className={`splash-white-entrance ${entranceStarted?'is-playing':''}`} aria-hidden="true"/>}
  </div>
  <audio ref={fishAudio} src="/audio/fish_A.wav" preload="auto" aria-label="fish_A 자라미니게임 오디오" onError={()=>setProblem(p=>({...p,minigame:'fish_A.wav 오디오를 확인해 주세요.'}))}/>
  <video ref={king} src="/videos/king_VD.mp4" className={`king-film journey-film ${scene==='king'?'is-visible':''}`} playsInline preload="auto" aria-label="king_VD 용왕 영상" onEnded={()=>{if(live.current.scene==='king')live.current.onAdvance('king');}} onError={()=>setProblem(p=>({...p,king:'king_VD.mp4 영상을 확인해 주세요.'}))}/>
  <div ref={black} className="journey-blackout" aria-hidden="true"/>
  {active&&problem[scene]&&<div className="journey-message" role="alert">{problem[scene]}</div>}
  {active&&blocked===scene&&!problem[scene]&&<button className="journey-message" onClick={()=>play(scene)}>영상과 소리 재생</button>}
 </section>;
});
export default JourneyScenes;
