import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import React,{act,useState} from 'react';
import {create} from 'react-test-renderer';
import {newSession,reduceSession} from '../src/interaction.js';
import {BgmController} from '../src/bgm.js';

const bundled=await build({stdin:{contents:`export {default as Arrival} from './src/scenes/ArrivalScene.jsx'; export {default as Journey} from './src/scenes/JourneyScenes.jsx'; export {default as Glitch} from './src/scenes/GlitchRabbitScenes.jsx'; export {default as Ending} from './src/scenes/EndingScenes.jsx';`,resolveDir:fileURLToPath(new URL('..',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node',external:['react'],loader:{'.css':'empty'}});
const source=bundled.outputFiles[0].text.replaceAll('from "react"',`from ${JSON.stringify(import.meta.resolve('react'))}`);
const {Arrival,Journey,Glitch,Ending}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('20 complete exhibition cycles reuse media safely, reset speed and targets, preserve narration, and release every timer',async()=>{
 const saved={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,fetch:globalThis.fetch,document:globalThis.document,window:globalThis.window,act:globalThis.IS_REACT_ACT_ENVIRONMENT,now:Object.getOwnPropertyDescriptor(performance,'now')};
 let clock=1000,serial=0,raf=new Map(),timers=new Map(),renderer,session,dispatch;
 const media=new Map(),surface={dataset:{}},hands={current:[]},hand={current:null},camera={current:null},mask={current:null};
 const journey=React.createRef(),ending=React.createRef();
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,key)=>key in o?o[key]:()=>{}});
 const canvas=()=>({width:1280,height:720,dataset:{},getContext:()=>context});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 Object.defineProperty(performance,'now',{value:()=>clock,configurable:true});
 globalThis.requestAnimationFrame=cb=>{raf.set(++serial,cb);return serial;};globalThis.cancelAnimationFrame=id=>raf.delete(id);
 globalThis.setTimeout=(cb,ms)=>{timers.set(++serial,{cb,at:clock+ms});return serial;};globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['media'])});
 globalThis.document={createElement:canvas};globalThis.window={};
 const node=e=>{
  if(e.type==='canvas')return canvas();
  if(['video','audio'].includes(e.type)){
   const label=e.props['aria-label'];
   const m={style:{},dataset:{},currentTime:0,duration:label.includes('나레이션')?17.99:14,readyState:4,paused:true,seeking:false,ended:false,volume:0,playbackRate:1,play(){this.paused=false;this.ended=false;return Promise.resolve();},pause(){this.paused=true;},closest:()=>surface};media.set(label,m);return m;
  }
  return {style:{},animate(){}};
 };
 function Harness(){
  const [state,setState]=useState(newSession);session=state;
  dispatch=action=>setState(previous=>reduceSession(previous,action));
  const advance=expected=>setState(previous=>previous.scene===expected?reduceSession(previous,{type:'next'}):previous);
  const props={scene:state.scene,runKey:0,mode:'demo',onAdvance:advance,handsRef:hands,handRef:hand};
  return React.createElement(React.Fragment,null,
   React.createElement(Arrival,{...props,onEnded:()=>advance('intro')}),
   React.createElement(Journey,{...props,ref:journey,enabled:true}),
   React.createElement(Glitch,{...props,cameraRef:camera,maskRef:mask}),
   React.createElement(Ending,{...props,ref:ending}));
 }
 const action=async a=>act(async()=>dispatch(a));
 const step=async ms=>{clock+=ms;const callbacks=[...raf.values()];raf.clear();await act(async()=>callbacks.forEach(cb=>cb(clock)));const due=[...timers].filter(([,v])=>v.at<=clock);for(const [id,v] of due){timers.delete(id);await act(async()=>v.cb());}};
 const element=label=>renderer.root.findByProps({'aria-label':label});
 const end=async label=>{const m=media.get(label);m.currentTime=m.duration;m.ended=true;m.paused=true;await act(async()=>element(label).props.onEnded());};
 const movie=mediaLabel=>media.get(mediaLabel);
 try{
  await act(async()=>{renderer=create(React.createElement(Harness),{createNodeMock:node});});
  const baseline=raf.size;
  for(let cycle=0;cycle<20;cycle++){
   assert.equal(session.scene,'standby');assert.equal(session.count,0);assert.equal(session.labels.length,7);
   await action({type:'next'});assert.equal(session.scene,'intro');assert.equal(movie('opening_VD 오프닝 영상').currentTime,0);
   await end('opening_VD 오프닝 영상');assert.equal(session.scene,'minigame');
   assert.equal(movie('jara01 첨벙첨벙 영상').playbackRate,.8);assert.equal(movie('fish_A 자라미니게임 오디오').currentTime,0);
   for(let i=0;i<2;i++)await act(async()=>journey.current.testTurn());
   assert.equal(movie('jara01 첨벙첨벙 영상').playbackRate,1);
   await end('jara01 첨벙첨벙 영상');await step(2000);assert.equal(session.scene,'king');assert.equal(movie('fish_A 자라미니게임 오디오').paused,true);
   await end('king_VD 용왕 영상');assert.equal(session.scene,'glitch');
   for(const label of ['4분할글리치 배경음악','glitch 배경 효과음'])assert.equal(movie(label).paused,false);
   await step(30000);assert.equal(session.scene,'rabbitPause');await step(1999);assert.equal(session.scene,'rabbitPause');await step(1);assert.equal(session.scene,'rabbit');
   for(const label of ['4분할글리치 배경음악','glitch 배경 효과음'])assert.equal(movie(label).paused,true);
   await end('rabbit_VD 토끼해킹 영상');assert.equal(session.scene,'mainReady');await action({type:'next'});
   for(let i=0;i<7;i++)await action({type:'add',id:`${cycle}-${i}`,text:`기준${i}`});assert.equal(session.scene,'photo');
   await action({type:'next'});assert.equal(session.scene,'endingPrelude');const voice=movie('rabbit_ending 엔딩 나레이션');assert.equal(voice.currentTime,0);assert.equal(voice.playbackRate,1.3);assert.equal(voice.paused,false);
   voice.currentTime=7.8;await step(6000);assert.equal(session.scene,'ending');assert.equal(voice.currentTime,7.8);
   const v=movie('ending_VD 엔딩 영상');v.currentTime=1;await step(16);assert.equal(v.currentTime,2);voice.currentTime=15;await step(16);
   assert.equal(element('08. 엔딩').props['data-hit-count'],0);
   for(let i=0;i<3;i++){
    await step(500);await act(async()=>ending.current.testSwing());
    if(i<2){assert.equal(v.currentTime,4);v.currentTime=5;await step(16);assert.equal(v.currentTime,6);}
   }
   assert.equal(v.currentTime,7);assert.equal(v.playbackRate,1);
   await end('ending_VD 엔딩 영상');assert.equal(session.scene,'ending');
   await end('rabbit_ending 엔딩 나레이션');assert.equal(session.scene,'endingWhite');await step(2000);assert.equal(session.scene,'escaped');
   await step(1100);assert.equal(movie('ending_BGM 엔딩 배경음악').paused,true);
   await action({type:'reset'});assert.equal(session.history.length,0);
   for(const [label,m] of media)assert.equal(m.paused,true,`${cycle}: media leaked after reset: ${label}`);
   assert.equal(raf.size,baseline);assert.equal(timers.size,0);
  }
  // Also interrupt each stage rather than only resetting after a normal ending.
  const sequence=['intro','minigame','king','glitch','rabbitPause','rabbit','mainReady','main','photo','endingPrelude','ending','endingWhite'];
  for(const interrupted of sequence){
   for(const target of sequence){await action({type:'next'});assert.equal(session.scene,target);if(target===interrupted)break;}
   await action({type:'reset'});assert.equal(session.scene,'standby');
   for(const [label,m] of media)assert.equal(m.paused,true,`${interrupted}: reset leaked ${label}`);
   assert.equal(raf.size,baseline);assert.equal(timers.size,0);
  }
  await act(async()=>renderer.unmount());renderer=null;assert.equal(raf.size,0);assert.equal(timers.size,0);
 }finally{
  await act(async()=>renderer?.unmount());
  for(const [key,value] of Object.entries({requestAnimationFrame:saved.raf,cancelAnimationFrame:saved.caf,setTimeout:saved.setTimeout,clearTimeout:saved.clearTimeout,fetch:saved.fetch,document:saved.document,window:saved.window,IS_REACT_ACT_ENVIRONMENT:saved.act})){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  if(saved.now)Object.defineProperty(performance,'now',saved.now);else delete performance.now;
 }
});

test('main BGM fades and resets across 100 visitors without restarting between 06 and 07',async()=>{
 const a={paused:true,currentTime:0,volume:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
 const music=new BgmController(a);let now=0;
 for(let visit=0;visit<100;visit++){
  music.arm();await Promise.resolve();await Promise.resolve();
  for(let i=0;i<100;i++)music.update({now:now+=50,scene:'main'});
  assert.ok(a.volume>.6);a.currentTime=31;music.update({now:now+=50,scene:'photo'});assert.equal(a.currentTime,31);
  for(let i=0;i<100;i++)music.update({now:now+=50,scene:'endingPrelude'});
  assert.equal(a.paused,true);assert.equal(a.volume,0);assert.equal(a.currentTime,0);music.stop();
 }
});



