// @refresh reset
import React, { useEffect, useRef, useState } from 'react';
import { newSession, reduceSession, GripController, ConfirmController, dropOutcome, isTextEntry } from './interaction.js';
import {displayLabel,isLanguageScene,translate} from './language.js';
import {shortTether} from './tether.js';
import {pickLabel} from './layout.js';
import {DualWrists} from './dual-wrists.js';
import {EndingWristTracker,poseWrists} from './ending-wrists.js';
import {smoothMask} from './mask.js';
import {UpperBodyLayout,upperBodyFrame,upperBodyOccluded} from './upper-body.js';
import { createVision, HandSearch, foregroundMask } from './vision.js';
import { createRenderer, OUTPUT_W, OUTPUT_H } from './renderer.js';

import ArrivalScene from './scenes/ArrivalScene.jsx';
import JourneyScenes from './scenes/JourneyScenes.jsx';
import GlitchRabbitScenes from './scenes/GlitchRabbitScenes.jsx';
import EndingScenes from './scenes/EndingScenes.jsx';
import {PHOTO_FADE_MS} from './ending.js';
import {ArrivalController,insideHandTarget,STANDBY_HANDOFF_MS} from './arrival.js';
import {BgmController} from './bgm.js';
import WaterDropTransition from './WaterDropTransition.jsx';
import {WATER_IMPACT_MS,WATER_DURATION_MS} from './water-transition.js';

const stageNames = { standby:'00. 대기화면',intro:'01. 오프닝',minigame:'02. 자라미니게임',king:'03. 용왕',glitch:'04. 4분할글리치',rabbitPause:'토끼해킹 전 검정 화면',rabbit:'05. 토끼해킹',mainReady:'5.5 메인시작', main: '나의 기준', photo: '나의 모습', endingPrelude:'7.5. 엔딩전', ending:'08. 엔딩',endingWhite:'엔딩 후 흰 화면',escaped:'09. 마지막' };
export default function App() {
  const [session,setSession] = useState(newSession);
  const [language,setLanguage]=useState('ko');const languageRef=useRef(language);languageRef.current=language;
  const english=language==='en'&&isLanguageScene(session.scene);
  const t=value=>translate(value,english?'en':'ko');
  const languageButton=useRef(null),languageHold=useRef(new ConfirmController());
  const [languageProgress,setLanguageProgress]=useState(0);
  function toggleLanguage(){setLanguage(value=>value==='ko'?'en':'ko');grip.current.reset();confirmation.current.reset();}
  const sessionRef=useRef(session);sessionRef.current=session;
  const [mode,setMode]=useState('idle');const modeRef=useRef(mode);modeRef.current=mode;
  const [status,setStatus]=useState('카메라를 켜고, 나만의 기준을 찾아보세요.');
  const [error,setError]=useState('');const [starting,setStarting]=useState(false);
  const [text,setText]=useState('');const [toast,setToast]=useState('');
  const [ui,setUi]=useState({labels:[],hands:[],progress:0,target:null,drag:null,fps:0});
  const [journeyRun,setJourneyRun]=useState(0);
  const [debug,setDebug]=useState(false); const [preview,setPreview]=useState(false);
  const [flash,setFlash]=useState(false);
  const [photoFade,setPhotoFade]=useState(false);
  const photoFading=useRef(false);photoFading.current=photoFade;
  const transitioning=useRef(false),transitionTimers=useRef([]);
  const [scale,setScale]=useState(()=>Math.min(window.innerWidth/OUTPUT_W,window.innerHeight/OUTPUT_H));
  const canvas=useRef(null),video=useRef(null),stage=useRef(null),input=useRef(null);
  const renderer=useRef(null),vision=useRef(null),stream=useRef(null),grip=useRef(new GripController());
  const allWrists=useRef([]),dualWrists=useRef(new DualWrists());
  const pointer=useRef(null),dragPoint=useRef(null),bursts=useRef([]),activeHand=useRef(null);
  const grabbedMask=useRef(null),glitchMask=useRef(null),bodyWrists=useRef([]),lastBodyOcclusion=useRef(-Infinity);
  const confirmation=useRef(new ConfirmController());
  const stableLayout=useRef(new UpperBodyLayout()),anchorFrame=useRef(null),heldLabel=useRef(null);
  const confirmButton=useRef(null),audio=useRef(null),music=useRef(null);
  const [audioError,setAudioError]=useState('');
  const journey=useRef(null),glitchRabbit=useRef(null),ending=useRef(null);
  const arrival=useRef(null),arrivalEntry=useRef(new ArrivalController());
  const birthTimes=useRef(new Map()),lastLayoutTime=useRef(0),displayCache=useRef({});
  useEffect(()=>{const resize=()=>setScale(Math.min(window.innerWidth/OUTPUT_W,window.innerHeight/OUTPUT_H));window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const lastGesture=useRef({value:'unknown',since:0,stable:'unknown',id:null});
  const inputActive=useRef(false),mounted=useRef(true),startVersion=useRef(0),lastSeen=useRef(0);
  const reduce = action => {
    if(transitioning.current)return;
    const previous=sessionRef.current,updated=reduceSession(previous,action);
    if(previous.scene==='standby'&&updated.scene==='intro'){
      // Paint the wrist over the hand before the next scene removes both.
      transitioning.current=true;
      transitionTimers.current=[setTimeout(()=>{sessionRef.current=updated;setSession(updated);transitioning.current=false;},STANDBY_HANDOFF_MS)];
    }else if(previous.scene==='main'&&updated.scene==='photo'){
      transitioning.current=true;clearInteraction();input.current?.blur();setFlash(true);
      const waiting={...updated,scene:'main'};sessionRef.current=waiting;setSession(waiting);
      transitionTimers.current=[setTimeout(()=>{sessionRef.current=updated;setSession(updated);},WATER_IMPACT_MS+30),setTimeout(()=>{transitioning.current=false;setFlash(false);},WATER_DURATION_MS)];
    }else if(previous.scene==='photo'&&updated.scene==='endingPrelude'){
      transitioning.current=true;clearInteraction();setPhotoFade(true);ending.current?.prime();
      transitionTimers.current=[setTimeout(()=>{sessionRef.current=updated;setSession(updated);setPhotoFade(false);transitioning.current=false;},PHOTO_FADE_MS)];
    }else{sessionRef.current=updated;setSession(updated);}
  };
  function notify(message) {setToast(message);}
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(id);},[toast]);
  function clearInteraction(){arrivalEntry.current.reset();grip.current.reset();confirmation.current.reset();languageHold.current.reset();dragPoint.current=null;grabbedMask.current=null;heldLabel.current=null;activeHand.current=null;lastGesture.current={value:'unknown',since:0,stable:'unknown',id:null};}
  function next(){if(transitioning.current)return;if(sessionRef.current.scene==='standby'){arrival.current?.prime();journey.current?.prime();glitchRabbit.current?.prime();ending.current?.prime();}if(['rabbit','mainReady'].includes(sessionRef.current.scene))music.current?.arm();clearInteraction();reduce({type:'next'});}
  function requestNext(){if(transitioning.current)return;const scene=sessionRef.current.scene;if(scene==='escaped'){reset();return;}if(scene==='minigame'){journey.current?.finish();return;}if(scene==='glitch'){glitchRabbit.current?.finish();return;}if(scene==='ending'){ending.current?.finish();return;}next();}
  function reset(){setLanguage('ko');languageHold.current.reset();setLanguageProgress(0);pointer.current=null;arrival.current?.reset();music.current?.stop();transitionTimers.current.forEach(clearTimeout);transitioning.current=false;setFlash(false);setPhotoFade(false);stableLayout.current.reset();anchorFrame.current=null;birthTimes.current.clear();clearInteraction();bursts.current=[];setText('');input.current?.blur();reduce({type:'reset'});}
  useEffect(()=>{
    const handler=e=>{if(e.isComposing||isTextEntry(e.target))return;if(e.repeat)return;if(e.code==='Digit0'||e.code==='Numpad0'){e.preventDefault();requestNext();}if(e.code==='Digit1'||e.code==='Numpad1'){e.preventDefault();reset();}};
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[]);
  useEffect(()=>{
    clearInteraction();
    inputActive.current=false;
    if(session.scene!=='main') input.current?.blur();
    if(session.scene!=='glitch'){glitchMask.current=null;allWrists.current=[];dualWrists.current=new DualWrists();}
  },[session.scene]);

  function advanceFrom(expected){if(sessionRef.current.scene===expected)next();}
  async function startCamera(){
    if(starting)return;arrival.current?.prime();journey.current?.prime();glitchRabbit.current?.prime();ending.current?.prime();music.current?.arm();setAudioError('');setStarting(true);setError('');const version=++startVersion.current;
    let acquired=null, created=null;
    try{
      setStatus('웹캠 연결 중…');
      acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:30},aspectRatio:{ideal:16/9},facingMode:'user'},audio:false});
      if(!mounted.current||version!==startVersion.current){acquired.getTracks().forEach(t=>t.stop());return;}
      if(stream.current)stream.current.getTracks().forEach(t=>t.stop());stream.current=acquired;
      video.current.srcObject=acquired;await video.current.play();
      setStatus('손 인식과 실루엣 모델을 준비하고 있습니다…');
      created=vision.current||await createVision();
      if(!mounted.current||version!==startVersion.current){created.hands.close();created.detailHands?.close();created.segmenter.close();created.pose?.close();acquired.getTracks().forEach(t=>t.stop());return;}
      vision.current=created;clearInteraction();stableLayout.current.reset();anchorFrame.current=null;setMode('camera');setStatus(`웹캠 연결됨 · ${created.delegate}`);

    }catch(err){
      if(version!==startVersion.current){acquired?.getTracks().forEach(t=>t.stop());return;}
      acquired?.getTracks().forEach(t=>t.stop());stream.current=null;music.current?.stop();
      const message=err.name==='NotAllowedError'?'카메라 권한이 필요합니다. 브라우저 주소창의 카메라 권한을 허용한 뒤 다시 시도해 주세요.':err.name==='NotFoundError'?'웹캠을 찾지 못했습니다. 웹캠 연결을 확인해 주세요.':`연결하지 못했습니다: ${err.message}. 모델 준비 여부와 카메라 사용 중인 다른 앱을 확인해 주세요.`;
      setError(message);setStatus('웹캠 연결 대기');
    }finally{if(mounted.current&&version===startVersion.current)setStarting(false);}
  }
  function demo(scene='standby'){setJourneyRun(n=>n+1);pointer.current=null;arrival.current?.prime();journey.current?.prime();glitchRabbit.current?.prime();ending.current?.prime();music.current?.stop();music.current?.arm();setAudioError('');startVersion.current++;transitionTimers.current.forEach(clearTimeout);transitioning.current=false;setFlash(false);setPhotoFade(false);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;clearInteraction();stableLayout.current.reset();anchorFrame.current=null;birthTimes.current.clear();bursts.current=[];renderer.current?.reset();setMode('demo');setStatus('마우스 테스트 · 실제 카메라 인식 아님');setError('');const initial={...newSession(),scene};sessionRef.current=initial;setSession(initial);}
  function openMain(){
    transitionTimers.current.forEach(clearTimeout);transitioning.current=false;setFlash(false);setPhotoFade(false);bursts.current=[];
    clearInteraction();stableLayout.current.reset();birthTimes.current.clear();const initial={...newSession(),scene:'mainReady'};sessionRef.current=initial;setSession(initial);setMode(stream.current?'camera':'idle');music.current?.stop();music.current?.arm();if(!stream.current)startCamera();
  }
  useEffect(()=>{
    renderer.current=createRenderer(canvas.current);mounted.current=true;
    music.current=new BgmController(audio.current,setAudioError);
    const resumeMusic=()=>{if(['main','photo'].includes(sessionRef.current.scene))music.current?.arm();};
    window.addEventListener('pointerdown',resumeMusic);window.addEventListener('keydown',resumeMusic);
    const search=new HandSearch(document.createElement('canvas'));
    const segmentationFrame=document.createElement('canvas');segmentationFrame.width=768;segmentationFrame.height=432;
    const segmentationContext=segmentationFrame.getContext('2d');
    const endingTracker=new EndingWristTracker();let poseHands=[],lastEndingPose=-Infinity;
    let raf,lastInference=0,lastFrame=-1,lastSegment=0,lastUI=0,frames=0,fps=0,statsTime=performance.now();
    function loop(now){
      if(!mounted.current)return;
      const current=sessionRef.current, demoMode=modeRef.current==='demo';
      let detected=[];
      if(modeRef.current==='camera'&&!['intro','king','rabbitPause','rabbit','endingPrelude','endingWhite','escaped'].includes(current.scene)&&vision.current&&video.current.readyState>=2&&now-lastInference>(['glitch','ending'].includes(current.scene)?45:85)&&video.current.currentTime!==lastFrame){
        lastInference=now;lastFrame=video.current.currentTime;
        try{
          detected=search.detect(vision.current,video.current,now,{detail:current.scene!=='ending'});
          if(current.scene==='ending'){
            if(now-lastEndingPose>=85){
              lastEndingPose=now;
              try{
                segmentationContext.drawImage(video.current,0,0,768,432);
                poseHands=poseWrists(vision.current.pose.detectForVideo(segmentationFrame,now).landmarks[0],now);
              }catch{poseHands=[];}
            }
            allWrists.current=endingTracker.update(detected,poseHands,now);
          }else{poseHands=[];allWrists.current=dualWrists.current.update(detected).map(h=>({...h,sampleAt:now}));}
          if(['main','photo','glitch'].includes(current.scene)&&now-lastSegment>200){
            lastSegment=now;
            if(current.scene==='glitch'){
              const vw=video.current.videoWidth,vh=video.current.videoHeight,sw=Math.min(vw,vh*16/9),sh=sw*9/16;
              segmentationContext.drawImage(video.current,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,768,432);
            }else segmentationContext.drawImage(video.current,0,0,768,432);
            vision.current.segmenter.segmentForVideo(segmentationFrame,now,result=>{
              const mask=foregroundMask(result);
              if(mask&&current.scene==='glitch')glitchMask.current={mask:smoothMask(mask,glitchMask.current?.mask),time:now,version:(glitchMask.current?.version??0)+1};
              else if(mask)renderer.current.updateMask(mask);
            });
            if(current.scene!=='glitch'){const points=vision.current.pose.detectForVideo(segmentationFrame,now).landmarks[0];const frame=upperBodyFrame(points);if(frame)anchorFrame.current=frame;bodyWrists.current=poseWrists(points,now);}
          }
          frames++;
        }catch(err){setError(`인식이 중단되었습니다: ${err.message}`);setMode('idle');stream.current?.getTracks().forEach(t=>t.stop());}
        if(detected.length){
          const locked=grip.current.drag||grip.current.target;
          let chosen=(current.scene==='standby'?detected.find(h=>insideHandTarget(h)):null)||detected.find(h=>h.id===activeHand.current);
          if(!chosen&&!locked)chosen=detected.find(h=>h.gesture==='open')||detected[0];
          if(chosen){activeHand.current=chosen.id;lastSeen.current=now;
            const old=pointer.current;const x=old&&old.id===chosen.id?old.x+(chosen.x-old.x)*.6:chosen.x,y=old&&old.id===chosen.id?old.y+(chosen.y-old.y)*.6:chosen.y;
            const g=lastGesture.current;
            if(g.id!==chosen.id){g.id=chosen.id;g.stable='unknown';g.value='unknown';}
            if(g.value!==chosen.gesture){g.value=chosen.gesture;g.since=now;}
            if(now-g.since>(g.value==='open'?70:110))g.stable=g.value;
            pointer.current={...chosen,x,y,gesture:g.stable,rawGesture:chosen.gesture};
          }else pointer.current=null;
        }else{pointer.current=null;if(now-lastSeen.current>1200)activeHand.current=null;}
      }
      if(now-statsTime>1000){fps=frames;frames=0;statsTime=now;}
      const r=renderer.current;
      if(displayCache.current.source!==current.labels||displayCache.current.language!==languageRef.current)displayCache.current={source:current.labels,language:languageRef.current,labels:current.labels.map(l=>({...l,text:displayLabel(l,languageRef.current)}))};
      const displayLabels=displayCache.current.labels;
      const sizes={};for(const l of displayLabels){const units=[...l.text].reduce((n,c)=>n+(/\s/.test(c)?30:c.charCodeAt(0)>255?76:44),0);sizes[l.id]={w:Math.min(1100,Math.max(340,units+124))/OUTPUT_W,h:116/OUTPUT_H,fontSize:66};}
      if(upperBodyOccluded(anchorFrame.current,[...allWrists.current,...bodyWrists.current.filter(p=>now-p.sampleAt<350)]))lastBodyOcclusion.current=now;
      const positions=(current.scene==='main'||current.scene==='photo')?stableLayout.current.update(displayLabels,sizes,demoMode?null:anchorFrame.current,now-lastLayoutTime.current,demoMode||modeRef.current==='idle'?r.demoMask:r.mask,!demoMode&&modeRef.current!=='idle',!demoMode&&now-lastBodyOcclusion.current<650):[];lastLayoutTime.current=now;
      for(const l of positions){const born=birthTimes.current.get(l.id);if(born&&!born.emitted){bursts.current.push({...l,type:'birth',time:now});born.emitted=true;}}
      const hand=(demoMode||modeRef.current==='camera')?pointer.current:null;
      if(arrivalEntry.current.update({scene:current.scene,enabled:modeRef.current==='camera'||demoMode,point:hand})){next();}
      const confirm=current.scene==='photo'||current.scene==='mainReady';
      let target=null;
      if(hand){
        const rect=stage.current.getBoundingClientRect();
        const client={x:rect.left+hand.x*rect.width,y:rect.top+hand.y*rect.height};
        const contains=el=>{if(!el)return false;const b=el.getBoundingClientRect();return client.x>=b.left&&client.x<=b.right&&client.y>=b.top&&client.y<=b.bottom;};
        if(confirm&&contains(confirmButton.current))target='confirm';
        if(isLanguageScene(current.scene)&&!grip.current.drag&&contains(languageButton.current))target='language';
        if(current.scene==='main'){
          const bounds=positions.map(l=>{const el=stage.current.querySelector(`[data-label-id="${l.id}"]`);if(!el)return l;const b=el.getBoundingClientRect();return {...l,x:(b.left+b.width/2-rect.left)/rect.width,y:(b.top+b.height/2-rect.top)/rect.height,w:b.width/rect.width,h:b.height/rect.height};});
          if(target!=='language')target=pickLabel(hand,bounds,grip.current.target);
        }
      }
      if(languageHold.current.update({now,inside:isLanguageScene(current.scene)&&target==='language'&&!inputActive.current&&!transitioning.current,gesture:hand?.gesture,hand:hand?.id})){toggleLanguage();}
      if(confirm&&!inputActive.current&&!transitioning.current){
        if(confirmation.current.update({now,inside:target==='confirm',gesture:hand?.gesture,hand:hand?.id})){next();notify('손으로 확인했습니다.');}
      }
      if(!inputActive.current&&current.scene==='main'&&!transitioning.current){
        const event=grip.current.update({now,point:hand?{x:hand.x,y:hand.y}:null,hand:hand?.id,gesture:hand?.gesture,target:target==='language'?null:target,duration:2000});
        if(event?.type==='grab'){const label=positions.find(l=>l.id===event.id);const offset={x:label.x-event.point.x,y:label.y-event.point.y};heldLabel.current={offset,point:{x:label.x,y:label.y},origin:{x:label.x,y:label.y}};dragPoint.current=heldLabel.current.point;const source=demoMode?r.demoMask:r.mask;grabbedMask.current=source?{...source,data:new Float32Array(source.data)}:null;}
        if(event?.type==='move'&&heldLabel.current&&(hand?.rawGesture||hand?.gesture)==='fist'){const held=heldLabel.current;held.point={x:event.point.x+held.offset.x,y:event.point.y+held.offset.y};dragPoint.current=held.point;}
        if(event?.type==='cancel'){dragPoint.current=null;heldLabel.current=null;grabbedMask.current=null;notify('손을 놓쳐 라벨을 원래 자리로 돌려놓았어요.');}
        if(event?.type==='confirm')next();
        if(event?.type==='release'){
          // Freeze the body at pickup: the moving wrist is itself foreground in a live mask.
          // Otherwise an outstretched hand can make every release count as "inside".
          const {point,discard}=dropOutcome(heldLabel.current,grabbedMask.current,event.point);
          if(discard){const label=positions.find(l=>l.id===event.id);bursts.current.push({...label,...point,type:'discard',time:now});reduce({type:'discard',id:event.id});}
          dragPoint.current=null;grabbedMask.current=null;heldLabel.current=null;
        }
      }
      music.current?.update({now,scene:photoFading.current?'endingPrelude':sessionRef.current.scene,progress:confirmation.current.progress,holding:current.scene==='photo'&&target==='confirm'&&hand?.gesture==='fist'});
      bursts.current=bursts.current.filter(b=>now-b.time<1850);
      if(current.scene==='main'||current.scene==='photo')r.draw({time:now,count:current.count,demo:demoMode||modeRef.current==='idle',bursts:bursts.current,phase:current.scene,bodyFrame:stableLayout.current.frame});
      if(now-lastUI>45){lastUI=now;setLanguageProgress(languageHold.current.progress);setUi({labels:positions,hands:hand?[hand]:[],progress:target==='language'?languageHold.current.progress:confirm?confirmation.current.progress:grip.current.progress,target:grip.current.target||target,drag:grip.current.drag,dragPoint:dragPoint.current,fps,musicVolume:Math.round((audio.current?.volume||0)*100),musicPlaying:!audio.current?.paused});}
      raf=requestAnimationFrame(loop);
    }
    raf=requestAnimationFrame(loop);
    return()=>{music.current?.stop();window.removeEventListener('pointerdown',resumeMusic);window.removeEventListener('keydown',resumeMusic);mounted.current=false;startVersion.current++;transitionTimers.current.forEach(clearTimeout);cancelAnimationFrame(raf);stream.current?.getTracks().forEach(t=>t.stop());vision.current?.hands.close();vision.current?.detailHands?.close();vision.current?.segmenter.close();vision.current?.pose?.close();};
  },[]);
  function onPointer(e,gesture){if(modeRef.current!=='demo')return;const rect=stage.current.getBoundingClientRect();pointer.current={id:'mouse',x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height,gesture:gesture||pointer.current?.gesture||'open'};}
  function add(e){e.preventDefault();if(sessionRef.current.scene!=='main'||transitioning.current)return;const clean=text.trim();if(!clean)return;const id=crypto.randomUUID();birthTimes.current.set(id,{time:performance.now(),emitted:false});reduce({type:'add',text:clean,id});setText('');inputActive.current=false;input.current?.blur();clearInteraction();}
  const photo=session.scene==='photo',main=session.scene==='main',ready=session.scene==='mainReady';
  return <main className="app">
    <audio ref={audio} src="/audio/main_BGM.mp3" loop preload="auto" onError={()=>setAudioError('main_BGM.mp3 파일을 재생할 수 없습니다.')} aria-label={t("메인 콘텐츠 배경음악")}/>
    <div ref={stage} lang={english?'en':'ko'} className={`stage ${english?'language-en':''} ${mode==='demo'?'demo':''} ${session.labels.length>8?'dense-labels':''} scene-${session.scene}`} style={{width:OUTPUT_W,height:OUTPUT_H,transform:`translate(-50%,-50%) scale(${scale})`}} onPointerMove={onPointer} onPointerDown={e=>{if(e.target.closest('button,input')&&!e.target.closest('.confirm-button,.main-start-button'))return;input.current?.blur();onPointer(e,'fist');if(!e.target.closest('button'))e.currentTarget.setPointerCapture?.(e.pointerId);}} onPointerUp={e=>onPointer(e,'open')} onPointerCancel={()=>{pointer.current=null;}} onPointerLeave={()=>{if(!grip.current.drag)pointer.current=null;}}>
    <section className="stage-shell">
      <div className="scene-layer">
        <img className="scene-background main-background" src="/assets/main_BG.png" alt="" data-figma-node="62:30" style={{visibility:main||ready?'visible':'hidden'}}/>
        <img className="scene-background result-background" src="/assets/result_BG.png" alt="" data-figma-node="69:35" style={{visibility:photo?'visible':'hidden'}}/>
        <ArrivalScene ref={arrival} scene={session.scene} mode={mode} starting={starting} status={status} error={error} onCamera={startCamera} onDemo={()=>demo()} onEnded={()=>advanceFrom('intro')}/>
        <JourneyScenes ref={journey} runKey={journeyRun} scene={session.scene} handRef={pointer} enabled={mode==='camera'||mode==='demo'} onAdvance={advanceFrom}/>
        <GlitchRabbitScenes ref={glitchRabbit} runKey={journeyRun} scene={session.scene} handRef={pointer} handsRef={allWrists} cameraRef={video} maskRef={glitchMask} mode={mode} onAdvance={advanceFrom}/>
        <EndingScenes ref={ending} runKey={journeyRun} scene={session.scene} handRef={pointer} handsRef={allWrists} mode={mode} onAdvance={advanceFrom} onReset={reset}/>
        <canvas ref={canvas} style={{visibility:main||photo?'visible':'hidden'}} className="art" aria-label={t("관객 실루엣과 빛 입자")}/>
        <video ref={video} className={preview?'camera-preview':'camera-hidden'} muted playsInline aria-label={t("좌우 반전 웹캠 미리보기")}/>
        {(main||photo)&&<div className="scene-title"><h1>{english?(photo?<>You, shaped by<br/><em>your own values.</em></>:<>Beyond the words<br/>you were given,<br/><em>leave your own values.</em></>):photo?<>당신의 기준으로<br/>채워진, 당신.</>:<>정해진 말 너머,<br/><em>나만의 기준</em>을<br/>남겨보세요.</>}</h1><p>{t(photo?'지금의 모습을 휴대폰으로 남겨보세요.':'나에게 맞지 않는 말은 내려놓고, 소중한 말을 더해보세요.')}</p></div>}
        {(main||photo)&&<div className="labels" aria-label={t("실루엣 키워드")}><svg className="label-threads" viewBox="0 0 3840 2160" aria-hidden="true">{ui.labels.filter(l=>l.id!==ui.drag).map(l=><line key={l.id} {...shortTether(l)}/>)}</svg>{ui.labels.map(l=>{
          const dragging=ui.drag===l.id,point=dragging&&ui.dragPoint?ui.dragPoint:l;
          return <div key={l.id} data-label-id={l.id} className={`word-label ${l.side<0?'left':'right'} ${l.own?'own':''} ${birthTimes.current.has(l.id)?'born':''} ${dragging?'grabbed':''} ${ui.target===l.id?'holding':''}`} style={{left:`${point.x*100}%`,top:`${point.y*100}%`,width:l.w*OUTPUT_W,height:l.h*OUTPUT_H,minHeight:l.h*OUTPUT_H,fontSize:l.fontSize,'--tilt':`${l.angle}deg`,'--hold':`${ui.target===l.id?ui.progress*100:0}%`}}><span className="label-hole"/><span className="word-text">{displayLabel(session.labels.find(item=>item.id===l.id)||l,english?"en":"ko")}</span><span className="label-spark">✧</span></div>;
        })}</div>}
        {session.scene==='standby'&&ui.hands.map(h=><div key={h.id} className="arrival-cursor" aria-label="손목 위치" style={{left:`${h.x*100}%`,top:`${h.y*100}%`}}><i/></div>)}
        {(main||photo||ready)&&<button ref={languageButton} className={`language-toggle ${ui.target==='language'?'is-hovered':''}`} onClick={toggleLanguage} disabled={flash||photoFade||!!ui.drag} style={{'--hold':`${languageProgress*100}%`}} aria-label={english?'한국어로 변경':'Switch to English'}><span>{english?'한국어':'English'}</span><small>{ui.target==='language'&&languageProgress>0?`${(languageProgress*3).toFixed(1)} / 3${english?'s':'초'}`:(english?'Click or hold a fist · 3s':'클릭 또는 주먹 3초')}</small></button>}
        {(main||photo||ready)&&ui.hands.map(h=><div key={h.id} className={`hand-cursor ${h.gesture}`} style={{left:`${h.x*100}%`,top:`${h.y*100}%`}}><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" className="cursor-track"/><circle cx="26" cy="26" r="23" className="cursor-progress" strokeDasharray={`${ui.progress*144.5} 144.5`}/></svg><span>{h.gesture==='fist'?'●':'✧'}</span><small>{h.gesture==='fist'?(ui.drag?t('이동'):`${Math.ceil(ui.progress*(photo||ready||ui.target==='language'?3:2)*10)/10}${english?'s':'초'}`):t('펴기')}</small></div>)}
        {main&&<aside className="count-display" aria-label={t("진행 횟수")} aria-live="polite"><span>{t('완료한 상호작용')}</span><strong>{String(session.count).padStart(2,'0')}<small>/ 10</small></strong><div className="count-line"><i style={{width:session.count*10+'%'}}/></div><p>{english?<><em>{10-session.count}</em> interactions remaining</>:<>앞으로 <em>{10-session.count}회</em> 남았어요</>}</p></aside>}
        {photo&&<button ref={confirmButton} className={`confirm-button ${ui.target==='confirm'?'is-hovered':''}`} onClick={next} style={{'--hold':`${ui.target==='confirm'?ui.progress*100:0}%`}}>{t('확인')} <span>→</span><small>{ui.target==='confirm'?(ui.progress>0?(english?`${(ui.progress*3).toFixed(1)} / 3s · Keep holding`:`${(ui.progress*3).toFixed(1)} / 3초 · 그대로 유지하세요`):t('손이 닿았어요 · 주먹을 쥐어주세요')):t('주먹 3초 유지 또는 클릭')}</small></button>}
        {ready&&<div className="welcome main-ready" aria-label="5.5 메인시작"><p className="eyebrow">{english?"Discover what matters to you":"나의 기준을 찾는 시간"}</p><h1>{english?<>Beyond the words you were given,<br/><em>leave your own values.</em></>:<>정해진 말 너머,<br/><em>나만의 기준을 남겨보세요.</em></>}</h1>{english?(<div className="main-ready-guide"><section><strong>01 · Let go of a keyword</strong><p>Hold a fist over a label for <em>2 seconds</em> to grab it.<br/>Move outside your body and open your hand to let it go.<br/>Release inside your body to return it.</p></section><section><strong>02 · Add your own values</strong><p>Type a keyword and press <em>Enter</em>.<br/>You can type in any language.<br/>Complete <em>10 actions</em> in total: letting go or adding.</p></section></div>):(<div className="main-ready-guide"><section><strong>01 · 키워드 내려놓기</strong><p>라벨 위에서 주먹을 <em>2초</em> 쥐어 잡으세요.<br/>몸 밖으로 옮겨 손을 펴면 사라져요.<br/>몸 안에서 놓으면 원래 자리로 돌아와요.</p></section><section><strong>02 · 나의 기준 더하기</strong><p>입력창에 나만의 키워드를 적고<br/>키보드의 <em>Enter</em>를 누르세요.<br/>버리기와 입력을 합해 <em>10회</em> 진행해요.</p></section></div>)}<button ref={confirmButton} className={`main-start-button ${ui.target==='confirm'?'is-hovered':''}`} style={{'--hold':`${ui.target==='confirm'?ui.progress*100:0}%`}} aria-label={t("시작하기")} onClick={next}>{t("시작하기")} <small>{ui.target==='confirm'&&ui.progress>0?(english?`${(ui.progress*3).toFixed(1)} / 3s · Keep holding`:`${(ui.progress*3).toFixed(1)} / 3초 · 그대로 유지하세요`):t('버튼 위에서 주먹을 3초간 유지해주세요')}</small></button></div>}
        {photoFade&&<div className="photo-ending-fade" aria-label={t("최종결과 페이드아웃")}/>}
        {toast&&<div className="toast" role="status">✧ {t(toast)}</div>}
        {flash&&<WaterDropTransition/>}
        {mode==='camera'&&!ui.hands.length&&main&&<div className="tracking-hint">{t('화면에 손을 펴서 보여주세요 · 손목 위치가 빛으로 표시됩니다')}</div>}
      </div>
    </section>
    <footer className="control-deck">
      <div className="instruction"><span className="step-no">01</span><div><strong>{t('내려놓기')}</strong><p>{t(mode==='demo'?'2초 눌러 잡고, 몸 밖으로 옮겨 놓기':'주먹 2초로 잡고, 몸 밖에서 손 펴기')}</p></div></div>
      <form onSubmit={add} className="word-form"><label htmlFor="word"><span className="step-no">02</span><strong>{t('나의 기준 더하기')}</strong></label><div className="input-line"><input id="word" ref={input} value={text} maxLength={12} placeholder={t("나만의 기준을 적어보세요")} disabled={!main||flash} autoComplete="off" onFocus={()=>{inputActive.current=true;clearInteraction();}} onBlur={()=>{inputActive.current=false;clearInteraction();}} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault();}}/><button type="submit" disabled={!main||flash||!text.trim()} aria-label={t("키워드 추가")}>Enter ↵</button></div></form>
    </footer>
    <div className="utility"><button onClick={()=>setDebug(!debug)}>{t('운영')} {debug?'−':'+'}</button></div>
    {starting&&<button className="cancel-camera" onClick={()=>{startVersion.current++;setStarting(false);setStatus('웹캠 연결을 취소했습니다.');stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;}}>카메라 권한 대기 취소</button>}
    {debug&&<section className="debug-panel"><strong>운영 · 테스트</strong><p>0 다음 씬 · 1 처음으로 (입력창에서는 비활성)</p><p>{status}</p><p>배경음악 · {ui.musicPlaying?'재생 중':'대기'} · {ui.musicVolume??0}%</p>{audioError&&<p className="error">{t(audioError)}</p>}<p>{stageNames[session.scene]} · 인식 {ui.fps}fps · {ui.hands[0]?.id||'손 대기'} · {ui.hands[0]?.gesture||'—'}</p><div><button onClick={requestNext}>다음 씬 [0]</button><button onClick={reset}>처음 [1]</button><button onClick={()=>demo()} disabled={starting}>00 마우스 테스트</button><button onClick={()=>demo('minigame')} disabled={starting}>02 미니게임 테스트</button><button onClick={()=>demo('king')} disabled={starting}>03 용왕 테스트</button><button onClick={()=>demo('glitch')} disabled={starting}>04 글리치 테스트</button><button onClick={()=>demo('rabbit')} disabled={starting}>05 토끼 테스트</button><button onClick={()=>demo('endingPrelude')} disabled={starting}>7.5 엔딩전 테스트</button><button onClick={()=>demo('ending')} disabled={starting}>08 엔딩 테스트</button>{session.scene==='ending'&&<button onClick={()=>ending.current?.testSwing()}>엔딩 타격 검증 (가상 손목)</button>}<button onClick={openMain} disabled={starting}>5.5 메인시작</button><button onClick={startCamera} disabled={starting}>웹캠 연결</button><button onClick={()=>setPreview(!preview)}>웹캠 미리보기</button><button onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}>전체 화면</button></div>{error&&<p className="error">{error}</p>}</section>}
    </div>
  </main>;
}






