import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';

const ArrivalScene=forwardRef(function ArrivalScene({scene,mode,starting,status,error,onCamera,onDemo,onEnded},ref){
 const film=useRef(null),activeScene=useRef(scene);activeScene.current=scene;
 const [filmError,setFilmError]=useState(''),[blocked,setBlocked]=useState(false),[ended,setEnded]=useState(false);
 async function play(){
  const v=film.current;if(!v)return;
  setBlocked(false);setEnded(false);
  try{v.muted=false;v.volume=1;await v.play();}catch(e){if(activeScene.current!=='intro')return;if(e.name==='NotAllowedError')setBlocked(true);else setFilmError('오프닝 영상을 재생할 수 없습니다. 원본 파일을 확인해 주세요.');}
 }
 useImperativeHandle(ref,()=>({
  prime(){const v=film.current;if(!v||v.readyState<1)return;v.muted=false;v.volume=0;const attempt=v.play();attempt?.then(()=>{if(activeScene.current!=='intro'){v.pause();v.currentTime=0;}v.volume=1;}).catch(()=>{v.volume=1;});},
  reset(){const v=film.current;v?.pause();if(v)v.currentTime=0;setEnded(false);setBlocked(false);},
 }));
 useEffect(()=>{
  const v=film.current;if(!v)return;
  // The first video frame contains the standby hand. Never seek back to it
  // while handing the screen to scene 02 (including delayed browser paints).
  if(scene==='intro'){v.style.visibility='visible';v.currentTime=0;play();}else{v.style.visibility='hidden';v.pause();setEnded(false);setBlocked(false);}
 },[scene]);
 return <section className={`arrival-scene ${scene==='standby'||scene==='intro'?'is-visible':''}`} aria-label={scene==='intro'?'01. 오프닝':'00. 대기화면'}>
  {scene==='standby'&&<div className="standby-design" data-figma-node="76:41">
   <img className="standby-background" src="/assets/loading_BG.png" alt="손바닥을 올려주세요" data-figma-node="76:39"/>
   <div className="standby-hand" data-figma-node="76:43" aria-label="손목 진입 영역"><img src="/assets/standby-hand.png" alt=""/></div>
   {(mode==='idle'||starting||error)&&<div className="arrival-setup"><div><button onClick={onCamera} disabled={starting}>{starting?'웹캠과 인식 모델 준비 중…':'웹캠 인식 켜기'}</button><button onClick={onDemo} disabled={starting}>마우스로 대기화면 테스트</button></div><p role="status">{error||status}</p></div>}
  </div>}
  <video ref={film} className={`opening-film ${scene==='intro'?'is-visible':''}`} src="/videos/opening_VD.mp4" preload="auto" playsInline data-figma-node="57:7" aria-label="opening_VD 오프닝 영상" onLoadedMetadata={()=>setFilmError('')} onError={()=>setFilmError('원본 opening_VD.mp4가 필요합니다. public/videos 폴더에 넣어 주세요.')} onEnded={()=>{film.current.style.visibility='hidden';film.current.pause();setEnded(true);if(activeScene.current==='intro')onEnded?.();}}/>
  {scene==='intro'&&filmError&&<div className="opening-notice" role="alert">{filmError}</div>}
  {scene==='intro'&&blocked&&!filmError&&<button className="opening-play" onClick={play}>오프닝 영상 재생</button>}
  {scene==='intro'&&ended&&<span className="sr-only" role="status">오프닝 재생 완료</span>}
 </section>;
});
export default ArrivalScene;
