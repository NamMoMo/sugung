import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

const source=await readFile(new URL('../src/scenes/EndingScenes.jsx',import.meta.url),'utf8');
let {code}=await transform(source,{loader:'jsx',format:'esm'});
code=code.replace(/import "\.\/ending\.css";/,'');
for(const [from,to] of [['react',import.meta.resolve('react')],['../ending.js',new URL('../src/ending.js',import.meta.url).href],['../ending-audio.js',new URL('../src/ending-audio.js',import.meta.url).href],['../ending-wrists.js',new URL('../src/ending-wrists.js',import.meta.url).href]])code=code.replaceAll(`from "${from}"`,`from ${JSON.stringify(to)}`);
const {default:EndingScenes}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('component ignores stale seek completion, retains success guidance, and exits once without rewinding',async()=>{
 const original={fetch:globalThis.fetch,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame,performance:globalThis.performance,nowDescriptor:Object.getOwnPropertyDescriptor(globalThis.performance,'now'),act:globalThis.IS_REACT_ACT_ENVIRONMENT};
 let clock=1000,id=0,raf=new Map(),advanced=0,renderer;const ref=React.createRef(),surface={dataset:{}};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['seekable-video'],{type:'video/mp4'})});
 Object.defineProperty(globalThis.performance,'now',{value:()=>clock,configurable:true});
 globalThis.requestAnimationFrame=cb=>{raf.set(++id,cb);return id;};globalThis.cancelAnimationFrame=n=>raf.delete(n);
 const media=()=>({style:{},dataset:{},duration:14,currentTime:0,readyState:4,paused:true,seeking:false,ended:false,volume:0,playbackRate:1,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},closest(){return surface;}});
 const video=media(),voice={...media(),duration:17.99,ended:false},bgm=media();
 const step=async time=>{clock+=1000;if(time!==undefined)video.currentTime=time;const callbacks=[...raf.values()];raf.clear();await act(async()=>callbacks.forEach(cb=>cb(clock)));};
 const settle=async time=>{video.currentTime=time;video.seeking=false;await act(async()=>renderer.root.findByType('video').props.onSeeked());};
 const phase=()=>renderer.root.findAllByType('section').find(n=>n.props.className?.includes('ending-scene')).props['data-segment'];
 try{
  await act(async()=>{renderer=create(React.createElement(EndingScenes,{ref,scene:'ending',runKey:1,mode:'demo',handsRef:{current:[]},handRef:{current:null},onAdvance(){advanced++;}}),{createNodeMock:e=>e.type==='video'?video:e.type==='audio'?(e.props['aria-label'].includes('rabbit_ending')?voice:bgm):{style:{},animate(){}}});});
  assert.match(renderer.root.findByType('video').props.src,/^blob:/);
  assert.match(renderer.root.findByProps({'aria-label':'rabbit_ending 엔딩 나레이션'}).props.src,/^blob:/);
  voice.currentTime=15;
  await step(1);await settle(2);assert.equal(phase(),'idle');
  await act(async()=>ref.current.testSwing());assert.equal(phase(),'impact');assert.equal(video.currentTime,4);
  // An older loop seek reaches 6 after the newer hit has requested 4.
  await settle(6);clock+=100;const callbacks=[...raf.values()];raf.clear();await act(async()=>callbacks.forEach(cb=>cb(clock)));
  assert.equal(phase(),'impact');assert.equal(surface.dataset.pendingSeek,'4');
  await settle(4);await step(5);await settle(6);assert.equal(phase(),'idle');
  await act(async()=>ref.current.testSwing());await settle(4);await step(5);await settle(6);
  await act(async()=>ref.current.testSwing());assert.equal(phase(),'escape');assert.equal(video.currentTime,7);assert.equal(video.playbackRate,1);
  assert.equal(renderer.root.findByType('h1').children.join(''),'문이 열렸어요. 당신의 길로 나아가세요.');
  await settle(7);video.currentTime=14;await act(async()=>renderer.root.findByType('video').props.onTimeUpdate());
  assert.equal(advanced,0);voice.currentTime=17.99;voice.ended=true;
  await act(async()=>renderer.root.findByProps({'aria-label':'rabbit_ending 엔딩 나레이션'}).props.onEnded());
  await act(async()=>renderer.root.findByType('video').props.onEnded());assert.equal(advanced,1);assert.equal(video.currentTime,14);
 }finally{
  await act(async()=>renderer?.unmount());globalThis.fetch=original.fetch;globalThis.requestAnimationFrame=original.raf;globalThis.cancelAnimationFrame=original.caf;if(original.nowDescriptor)Object.defineProperty(original.performance,'now',original.nowDescriptor);else delete original.performance.now;
  if(original.act===undefined)delete globalThis.IS_REACT_ACT_ENVIRONMENT;else globalThis.IS_REACT_ACT_ENVIRONMENT=original.act;
 }
});
