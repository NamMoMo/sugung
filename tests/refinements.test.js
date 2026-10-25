import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfirmController } from '../src/interaction.js';
import { separateLabels,intersects,pickLabel } from '../src/layout.js';
import { labelPosition } from '../src/renderer.js';
import { smoothMask,maskAlpha } from '../src/mask.js';
import { landmarkGesture } from '../src/vision.js';
test('confirmation works when entering with fist already closed, without open arming',()=>{
 const c=new ConfirmController();let fired=0;
 for(let now=100;now<=3400;now+=50)if(c.update({now,inside:true,gesture:'fist',hand:'Left'}))fired++;
 assert.equal(fired,1);assert.equal(c.progress,1);
});
test('brief ambiguous classification pauses confirm, sustained loss resets it',()=>{
 const c=new ConfirmController();for(let now=100;now<=1500;now+=50)c.update({now,inside:true,gesture:'fist',hand:'Left'});
 const before=c.progress;c.update({now:1550,inside:true,gesture:'unknown',hand:'Left'});c.update({now:1600,inside:true,gesture:'unknown',hand:'Left'});assert.equal(c.progress,before);
 c.update({now:1650,inside:true,gesture:'fist',hand:'Left'});assert.equal(c.progress,before);
 for(let now=1700;now<=2000;now+=50)c.update({now,inside:false,gesture:'fist',hand:'Left'});assert.equal(c.progress,0);
});
test('crowded large labels occupy separate cells; selection favours nearest or locked tag',()=>{
 const labels=Array.from({length:17},(_,slot)=>({id:String(slot),...labelPosition({slot},{x:.31,y:.19,w:.38,h:.68})}));
 const sizes=Object.fromEntries(labels.map(l=>[l.id,{w:.17,h:.08}]));const result=separateLabels(labels,sizes);
 for(let i=0;i<result.length;i++)for(let j=0;j<i;j++)assert.equal(intersects(result[i],result[j],0),false);
 const overlap=[{id:'a',x:.5,y:.5,w:.15,h:.1},{id:'b',x:.55,y:.5,w:.15,h:.1}];
 assert.equal(pickLabel({x:.55,y:.5},overlap),'b');assert.equal(pickLabel({x:.55,y:.5},overlap,'a'),'a');
});
test('spatial mask smoothing removes isolated spikes; temporal smoothing dampens shimmer',()=>{
 const data=new Float32Array(25);data[12]=1;const smooth=smoothMask({width:5,height:5,data});assert.ok(smooth.data[12]<.1);
 const solid={width:5,height:5,data:new Float32Array(25).fill(.6)};
 const next=smoothMask(solid,{width:5,height:5,data:new Float32Array(25).fill(.4)});assert.ok(next.data[12]>.4&&next.data[12]<.6);
 assert.equal(maskAlpha(.2),0);assert.equal(maskAlpha(.9),1);
});
test('uncertain gesture model can fall back to finger geometry',()=>{
 const points=Array.from({length:21},()=>({x:0,y:0,z:0}));
 for(const [tip,pip]of [[8,6],[12,10],[16,14],[20,18]]){points[pip]={x:0,y:1,z:0};points[tip]={x:0,y:.7,z:0};}
 assert.equal(landmarkGesture(points),'fist');for(const tip of [8,12,16,20])points[tip]={x:0,y:1.8,z:0};assert.equal(landmarkGesture(points),'open');
});
