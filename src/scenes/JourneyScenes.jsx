import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {journeyFadeProgress,KING_REVEAL_MS} from '../turtle-game.js';
import {SplashGame} from '../splash-game.js';
import './journey.css';

const JourneyScenes=forwardRef(function JourneyScenes({scene,runKey,handsRef,enabled,mode,onAdvance},ref){
 const sea=useRef(null),king=useRef(null),black=useRef(null),game=useRef(new SplashGame());
 const live=useRef({scene,onAdvance});live.current={scene,onAdvance};
 const endAt=useRef(null),kingAt=useRef(null),fired=useRef(false),foam=useRef([]),serial=useRef(0),testTime=useRef(0);
 const [ui,setUi]=useState({turns:0,rate:1,foam:[]}),[problem,setProblem]=useState({}),[blocked,setBlocked]=useState(null);
 const active=scene==='minigame'||scene==='king';
 function apply(events,now){
  if(!events.length)return;
  sea.current.playbackRate=game.current.rate;
  for(const event of events)foam.current.push({id:serial.current++,side:event.id==='Left'?-1:1,time:now});
  foam.current=foam.current.slice(-12);
  setUi({turns:game.current.turns,rate:game.current.rate,foam:[...foam.current]});
 }
 async function play(name){
  const v=name==='minigame'?sea.current:king.current;
  setBlocked(null);v.muted=false;v.volume=1;v.playbackRate=name==='minigame'?game.current.rate:1;v.preservesPitch=true;
  try{await v.play();}catch(e){if(live.current.scene!==name)return;if(e.name==='NotAllowedError')setBlocked(name);else if(e.name!=='AbortError')setProblem(p=>({...p,[name]:'영상을 재생하지 못했습니다. MP4 파일을 확인해 주세요.'}));}
 }
 useImperativeHandle(ref,()=>({
  finish(){if(live.current.scene==='minigame'&&endAt.current===null){sea.current.pause();endAt.current=performance.now();}},
  testTurn(){
   if(mode!=='demo'||live.current.scene!=='minigame'||endAt.current!==null)return;
   const now=performance.now(),events=[];testTime.current=Math.max(testTime.current+1400,now);
   for(const [id,delay] of [['Left',1000],['Right',500]]){
    for(const [dt,y] of [[0,.5],[120,.38],[240,.5]])events.push(...game.current.update([{id,x:id==='Left'?.35:.65,y,sampleAt:testTime.current-delay+dt}],testTime.current-delay+dt));
   }
   apply(events,now);
  },
  prime(){for(const [name,v] of [['minigame',sea.current],['king',king.current]]){
   if(!v||v.readyState<1||live.current.scene===name)continue;
   v.volume=0;v.play()?.then(()=>{if(live.current.scene!==name){v.pause();v.currentTime=0;v.volume=1;}}).catch(()=>{});
  }}
 }));
 useEffect(()=>{
  endAt.current=null;fired.current=false;kingAt.current=scene==='king'?performance.now():null;
  game.current.reset();foam.current=[];setUi({turns:0,rate:1,foam:[]});setBlocked(null);
  if(black.current)black.current.style.opacity=scene==='king'?'1':'0';
  for(const [name,v] of [['minigame',sea.current],['king',king.current]]){v.pause();v.currentTime=0;if(scene===name)play(name);}
  return()=>{sea.current?.pause();king.current?.pause();};
 },[scene,runKey,mode]);
 useEffect(()=>{
  if(!active)return;let raf;
  function frame(now){
   if(live.current.scene==='minigame'){
    const v=sea.current;
    if(enabled&&mode==='camera'&&endAt.current===null&&!v.paused&&!v.seeking)apply(game.current.update(handsRef?.current||[],now),now);
    const remaining=foam.current.filter(b=>now-b.time<2100);
    if(remaining.length!==foam.current.length){foam.current=remaining;setUi({turns:game.current.turns,rate:game.current.rate,foam:[...remaining]});}
    v.dataset.turns=String(game.current.turns);v.dataset.rate=String(game.current.rate);v.dataset.strokes=String(game.current.strokeCount);
    if(endAt.current!==null){const p=journeyFadeProgress(now,endAt.current);black.current.style.opacity=String(p);v.volume=1-p;if(p===1&&!fired.current){fired.current=true;live.current.onAdvance('minigame');}}
   }else if(live.current.scene==='king'&&kingAt.current!==null)black.current.style.opacity=String(Math.max(0,1-(now-kingAt.current)/KING_REVEAL_MS));
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[scene,active,enabled,mode,handsRef]);
 return <section className={`journey-scenes ${active?'is-visible':''}`} aria-label={scene==='king'?'03. 용왕':'02. 첨벙첨벙 자라미니게임'}>
  <div className={`turtle-scene splash-scene ${scene==='minigame'?'is-visible':''}`}>
   <video ref={sea} src="/videos/jara01.mp4" className="journey-film" playsInline preload="auto" aria-label="jara01 첨벙첨벙 영상" onLoadedMetadata={()=>setProblem(p=>({...p,minigame:null}))} onError={()=>setProblem(p=>({...p,minigame:'public/videos/jara01.mp4 영상을 확인해 주세요.'}))} onEnded={()=>{if(live.current.scene==='minigame'&&endAt.current===null)endAt.current=performance.now();}}/>
   <div className="splash-foam" aria-hidden="true">{ui.foam.map(b=><div key={b.id} className={`foam-burst ${b.side<0?'from-left':'from-right'}`}>{Array.from({length:20},(_,i)=><i key={i} style={{'--x':`${80+(i*53)%360}px`,'--y':`${250+(i*163)%1700}px`,'--drift':`${(b.side<0?1:-1)*(100+(i*47)%270)}px`,'--rise':`${220+(i*97)%650}px`,'--size':`${22+(i*23)%88}px`,'--delay':`${i%5*.035}s`}}/>)}</div>)}</div>
   <header className="turtle-instructions splash-instructions"><h1>양팔을 번갈아 첨벙첨벙, 자라와 함께 용궁으로!</h1><p>왼팔·오른팔을 한 번씩 위아래로 흔들어 물살에 힘을 더해주세요.</p><p className="turtle-instructions-en">Splash your arms up and down, alternating left and right.</p><div className="splash-progress" aria-live="polite"><span>첨벙 <b>{ui.turns}턴</b></span><strong>{ui.rate.toFixed(1)}×</strong><small>{ui.rate>=2?'최대 물살에 도달했어요!':'양팔을 번갈아 3턴마다 물살이 더 빨라져요'}</small></div></header>
  </div>
  <video ref={king} src="/videos/king_VD.mp4" className={`king-film journey-film ${scene==='king'?'is-visible':''}`} playsInline preload="auto" aria-label="king_VD 용왕 영상" onEnded={()=>{if(live.current.scene==='king')live.current.onAdvance('king');}} onError={()=>setProblem(p=>({...p,king:'king_VD.mp4 영상을 확인해 주세요.'}))}/>
  <div ref={black} className="journey-blackout" aria-hidden="true"/>
  {active&&problem[scene]&&<div className="journey-message" role="alert">{problem[scene]}</div>}
  {active&&blocked===scene&&!problem[scene]&&<button className="journey-message" onClick={()=>play(scene)}>영상과 소리 재생</button>}
 </section>;
});
export default JourneyScenes;
