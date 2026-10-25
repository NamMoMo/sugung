import React,{forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {createCracks,endingCoverOpacity,endingAcceptsHit,CrackHits,EndingSegments,ENDING_PRELUDE_MS,ENDING_WHITE_MS} from '../ending.js';
import {EndingAudioFade} from '../ending-audio.js';
import {EndingCursorDisplay} from '../ending-wrists.js';
import './ending.css';

const EndingScenes=forwardRef(function EndingScenes({scene,runKey,mode,handsRef,handRef,onAdvance,onReset},ref){
 const film=useRef(null),voice=useRef(null),bgm=useRef(null),logic=useRef(null),hits=useRef(null);
 const live=useRef({scene,onAdvance});live.current={scene,onAdvance};
 const start=useRef(0),armed=useRef(false),generation=useRef(0),cursorNodes=useRef([]),reveal=useRef(null);
 const revealStarted=useRef(null),bgmFade=useRef(new EndingAudioFade());
 const cursorDisplay=useRef(new EndingCursorDisplay());
 const missingSince=useRef(null),warningShown=useRef(false);
 const [trackingLost,setTrackingLost]=useState(false);
 const [cracks,setCracks]=useState(createCracks);
 const seek=useRef(null),flash=useRef(null),shake=useRef(null),lastRevision=useRef(-1);
 const [blocked,setBlocked]=useState(false),[problem,setProblem]=useState(''),[marks,setMarks]=useState({}),[count,setCount]=useState(0),[phase,setPhase]=useState('intro');
 const active=scene==='ending';
 function notice(e){if(e.name!=='AbortError'&&live.current.scene==='ending')setBlocked(true);}
 function playVideo(){film.current.play()?.catch(notice);}
 function jump(time){
  const v=film.current;if(v.readyState<1){seek.current=time;return;}
  if(Math.abs(v.currentTime-time)>.015){seek.current=time;v.currentTime=time;}
  else seek.current=null;
  playVideo();
 }
 function startAudio(){
  if(!armed.current){armed.current=true;voice.current.currentTime=0;voice.current.playbackRate=1.2;voice.current.volume=.9;voice.current.play()?.catch(e=>{armed.current=false;notice(e);});}
  bgm.current.volume=.42;bgm.current.play()?.catch(notice);
 }
 function prime(){
  if(['ending','escaped'].includes(live.current.scene))return;
  const epoch=generation.current;
  for(const el of [film.current,voice.current,bgm.current]){
   if(!el||el.readyState<1)continue;
   el.volume=0;el.play()?.then(()=>{if(epoch===generation.current&&!['ending','escaped'].includes(live.current.scene)){el.pause();el.currentTime=0;}}).catch(()=>{});
  }
 }
 function commitHit(hit){
  if(!hit||!logic.current.hit())return false;
  setMarks(m=>({...m,[hit.id]:performance.now()}));setCount(hit.count);
  shake.current?.animate([{transform:'translate(0,0)'},{transform:'translate(12px,-5px)'},{transform:'translate(-10px,4px)'},{transform:'translate(5px,0)'},{transform:'translate(0,0)'}],{duration:320});
  jump(logic.current.range[0]);return true;
 }
 useImperativeHandle(ref,()=>({prime,testSwing(){
  if(live.current.scene!=='ending'||!endingAcceptsHit(film.current,logic.current))return;
  const target=cracks.find(c=>!hits.current.hit.has(c.id));if(!target)return;
  const now=performance.now();
  // Operator-only synthetic wrist stroke goes through the real hit detector.
  hits.current.update([{id:'operator-test',x:target.x-target.r*9/16-.04,y:target.y}],now-100,true);
  commitHit(hits.current.update([{id:'operator-test',x:target.x,y:target.y}],now,true));
 },finish(){if(live.current.scene!=='ending'||!logic.current)return;logic.current.forceEscape();setCount(3);setMarks(Object.fromEntries(cracks.map(c=>[c.id,performance.now()])));jump(7);}}));
 useLayoutEffect(()=>{
  generation.current++;armed.current=false;setBlocked(false);setProblem('');setMarks({});setCount(0);setPhase('intro');
  for(const el of [film.current,voice.current])el.pause();
  if(!['endingWhite','escaped'].includes(scene))bgmFade.current.stop(bgm.current);
  seek.current=null;lastRevision.current=-1;revealStarted.current=null;cursorDisplay.current=new EndingCursorDisplay();missingSince.current=null;warningShown.current=false;setTrackingLost(false);
  if(reveal.current)reveal.current.style.opacity='1';
  if(scene==='endingPrelude')start.current=performance.now();
  if(scene==='endingWhite'){
   const timer=setTimeout(()=>{if(live.current.scene==='endingWhite')live.current.onAdvance('endingWhite');},ENDING_WHITE_MS);
   return()=>{clearTimeout(timer);generation.current++;for(const el of [film.current,voice.current])el?.pause();};
  }
  if(scene==='ending'){
   const targets=createCracks();setCracks(targets);
   logic.current=new EndingSegments();hits.current=new CrackHits(targets);start.current=performance.now();
   film.current.muted=false;film.current.volume=.7;film.current.playbackRate=1;bgm.current.currentTime=0;
   jump(0);startAudio();
  }
  return()=>{generation.current++;for(const el of [film.current,voice.current])el?.pause();};
 },[scene,runKey]);
 useEffect(()=>{
  let raf;const tick=now=>{bgmFade.current.tick(now);bgm.current.dataset.volume=String(bgm.current.volume);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(raf);bgmFade.current.stop(bgm.current);};
 },[]);
 useEffect(()=>{
  if(scene!=='endingPrelude'&&scene!=='ending')return;
  let raf,fired=false;
  function frame(now){
   if(scene==='endingPrelude'){
    if(now-start.current>=ENDING_PRELUDE_MS&&!fired){fired=true;live.current.onAdvance('endingPrelude');return;}
   }else{
    const v=film.current,l=logic.current;
    const points=mode==='camera'?handsRef.current:mode==='demo'&&handRef.current?[handRef.current]:[];
    const displayed=cursorDisplay.current.update(points,now);
    if(points.length)missingSince.current=null;else if(missingSince.current===null)missingSince.current=now;
    const lost=mode==='camera'&&missingSince.current!==null&&now-missingSince.current>1500;
    if(lost!==warningShown.current){warningShown.current=lost;setTrackingLost(lost);}
    for(let i=0;i<2;i++){const el=cursorNodes.current[i],p=displayed[i];if(el){el.style.opacity=String(p?.opacity??0);if(p){el.style.left=p.x*100+'%';el.style.top=p.y*100+'%';}}}
    const surface=film.current.closest('.ending-scene');
    surface.dataset.detectedWrists=String(points.length);surface.dataset.wristSources=points.map(p=>p.source||'hand').join(',');
    const hit=hits.current.update(points,now,endingAcceptsHit(v,l));
    if(hit)commitHit(hit);
    if(v.readyState>=2&&!v.paused&&!v.seeking&&!hit){const target=l.boundary(v.currentTime);if(target!==null)jump(target);}
    if(lastRevision.current!==l.revision){lastRevision.current=l.revision;setPhase(l.phase);}
    if(reveal.current)reveal.current.style.opacity=String(endingCoverOpacity(now,revealStarted.current));
    if(flash.current)flash.current.style.opacity=l.phase==='escape'?String(Math.max(0,1-Math.abs(v.currentTime-10.9)/.6)):'0';
   }
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[scene,runKey,mode,handsRef,handRef]);
 return <>
  {scene==='endingWhite'&&<section className="ending-white-hold" aria-label="엔딩 후 흰 화면"/>}
  {scene==='endingPrelude'&&<section className="ending-prelude" aria-label="7.5. 엔딩전"><div className="prelude-pin"/><div className="prelude-bloom"/><div className="prelude-dust"/></section>}
  <section className={`ending-scene ${active||scene==='escaped'?'is-visible':''}`} data-segment={phase} data-hit-count={count} aria-label={scene==='escaped'?'탈출 완료':'08. 엔딩'}>
   <div ref={shake} className="ending-door">
    <video ref={film} className="ending-film" src="/videos/ending_VD.mp4" preload="auto" playsInline aria-label="ending_VD 엔딩 영상"
     onPlaying={()=>{if(live.current.scene==='ending'&&revealStarted.current===null)revealStarted.current=performance.now();}}
     onLoadedMetadata={()=>{if(film.current.duration<8)setProblem('ending_VD는 7초 이후 탈출 구간이 포함된 원본 영상이 필요합니다.');if(live.current.scene==='ending'&&seek.current!==null)jump(seek.current);}}
     onSeeked={()=>{seek.current=null;}} onError={()=>setProblem('public/videos/ending_VD.mp4 영상을 확인해 주세요.')}
     onEnded={()=>{if(live.current.scene==='ending'&&logic.current?.phase==='escape'){if(flash.current)flash.current.style.opacity='1';film.current.pause();bgmFade.current.start(bgm.current,performance.now());live.current.onAdvance('ending');}}}/>
    {active&&cracks.map(c=><div key={c.id} className={`ending-crack ${marks[c.id]!==undefined?'is-struck':''}`} style={{left:c.x*100+'%',top:c.y*100+'%',width:c.r*4320,height:c.r*4320}} data-crack-id={c.id} data-hit={marks[c.id]!==undefined} aria-label={`타격 균열 ${c.id}`}><i/><i/><b/></div>)}
   </div>
   <audio ref={voice} src="/audio/rabbit_ending.wav" preload="auto" aria-label="rabbit_ending 엔딩 나레이션" onError={()=>setProblem('rabbit_ending.wav 오디오를 확인해 주세요.')}/>
   <audio ref={bgm} src="/audio/ending_BGM.mp3" loop preload="auto" aria-label="ending_BGM 엔딩 배경음악" onError={()=>setProblem('ending_BGM.mp3 오디오를 확인해 주세요.')}/>
   {active&&phase!=='escape'&&<header className="ending-instructions"><h1>균열을 향해 손을 휘둘러보세요.</h1><p>Swing your hand at the crack.</p><span aria-live="polite">{count} / 3</span></header>}
   {active&&phase!=='escape'&&trackingLost&&<p className="ending-tracking-hint" role="status">손과 팔이 카메라 화면 안에 보이도록 움직여주세요.</p>}
   {active&&[0,1].map(i=><div key={i} ref={el=>cursorNodes.current[i]=el} className="ending-wrist" aria-label={`${i+1}번째 손목 위치`}/>)}
   {active&&<><div ref={reveal} className="ending-reveal"/><div ref={flash} className="ending-white"/></>}
   {active&&blocked&&<button className="ending-play" onClick={()=>{setBlocked(false);film.current.volume=.7;playVideo();startAudio();}}>영상과 소리 재생</button>}
   {active&&problem&&<p className="ending-problem" role="alert">{problem}</p>}
   {scene==='escaped'&&<div className="escape-complete"><p>YOUR OWN WAY</p><h1>이제, 당신의 길로.</h1><button onClick={onReset}>처음으로 돌아가기</button></div>}
  </section>
 </>;
});
export default EndingScenes;
