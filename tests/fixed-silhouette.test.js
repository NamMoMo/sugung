import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixedBustMask,FIXED_BUST_FRAME} from '../src/fixed-silhouette.js';
import {UpperBodyLayout} from '../src/upper-body.js';
import {bodyOverlap,dropOutcome} from '../src/interaction.js';
import {contourPoints} from '../src/light-effects.js';
import {intersects} from '../src/layout.js';
const mask=createFixedBustMask();
const sample=(x,y)=>mask.data[Math.floor(y*mask.height)*mask.width+Math.floor(x*mask.width)];

test('fixed bust contains head, neck and chest but no legs or live-hand extensions',()=>{
 assert.equal(mask.mirrored,false);
 for(const point of [[.5,.25],[.5,.48],[.5,.75],[.35,.8],[.65,.8]])assert.ok(sample(...point)>.9);
 for(const point of [[.5,.1],[.5,.92],[.25,.5],[.75,.5]])assert.equal(sample(...point),0);
 const sparks=contourPoints(mask,false);assert.ok(sparks.length>200);
 assert.ok(sparks.every(p=>p.y>.18&&p.y<.9));
});
test('fixed contour returns inside drops and discards outside drops in screen coordinates',()=>{
 const origin={x:.4,y:.3};
 assert.equal(dropOutcome({origin,point:{x:.5,y:.65}},mask,{}).discard,false);
 assert.equal(dropOutcome({origin,point:{x:.15,y:.65}},mask,{}).discard,true);
 const asymmetric={width:20,height:20,data:new Float32Array(400),mirrored:false};
 for(let y=0;y<20;y++)for(let x=0;x<10;x++)asymmetric.data[y*20+x]=1;
 assert.equal(bodyOverlap(asymmetric,.25,.5),true);assert.equal(bodyOverlap(asymmetric,.75,.5),false);
});
test('seven initial tags and seven additions stay readable, separate and attached to fixed bust',()=>{
 const layout=new UpperBodyLayout(FIXED_BUST_FRAME);
 let labels=Array.from({length:7},(_,i)=>({id:`base${i}`,slot:i})),first;
 for(let count=0;count<=7;count++){
  const sizes=Object.fromEntries(labels.map(l=>[l.id,{w:(l.slot<7?340:650)/3840,h:116/2160,fontSize:66}]));
  const placed=layout.update(labels,sizes,null,16,mask,false,false);
  assert.equal(placed.length,labels.length);assert.equal(layout.warning,false);
  const boxes=placed.map(p=>({...p,w:layout.seats.get(p.id).w,h:layout.seats.get(p.id).h}));
  for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++)assert.equal(intersects(boxes[i],boxes[j],.002),false);
  if(!first)first=placed.map(p=>({id:p.id,x:p.x,y:p.y}));
  assert.deepEqual(placed.slice(0,7).map(p=>({id:p.id,x:p.x,y:p.y})),first);
  assert.ok(placed.every(p=>p.fontSize>=64&&p.y<.9));
  labels.push({id:`added${count}`,slot:7+count});
 }
 layout.reset();assert.deepEqual(layout.frame,FIXED_BUST_FRAME);
});
