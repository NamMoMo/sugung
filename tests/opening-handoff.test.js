import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';

const source=await readFile(new URL('../src/scenes/ArrivalScene.jsx',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'jsx',format:'esm'});
const code=compiled.code.replace(/from "react"/g,`from ${JSON.stringify(import.meta.resolve('react'))}`);
const {default:ArrivalScene}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('opening end hides its standby first frame before advancing and never rewinds on exit',async()=>{
 const original=globalThis.IS_REACT_ACT_ENVIRONMENT;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const video={style:{},currentTime:0,paused:true,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
 let renderer,advance=0;const ref=React.createRef();
 const props={ref,scene:'intro',mode:'demo',onEnded(){advance++;assert.equal(video.style.visibility,'hidden');assert.equal(video.currentTime,16.92);}};
 try{
  await act(async()=>{renderer=create(React.createElement(ArrivalScene,props),{createNodeMock:e=>e.type==='video'?video:null});});
  video.currentTime=16.92;
  await act(async()=>renderer.root.findByType('video').props.onEnded());
  assert.equal(advance,1);
  await act(async()=>renderer.update(React.createElement(ArrivalScene,{...props,scene:'minigame'})));
  assert.equal(video.currentTime,16.92);assert.equal(video.style.visibility,'hidden');assert.equal(video.paused,true);
  await act(async()=>renderer.update(React.createElement(ArrivalScene,props)));
  assert.equal(video.currentTime,0);assert.equal(video.style.visibility,'visible');assert.equal(video.paused,false);
 }finally{await act(async()=>renderer?.unmount());if(original===undefined)delete globalThis.IS_REACT_ACT_ENVIRONMENT;else globalThis.IS_REACT_ACT_ENVIRONMENT=original;}
});
