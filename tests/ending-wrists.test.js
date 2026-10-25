import test from 'node:test';
import assert from 'node:assert/strict';
import {poseWrists,EndingWristTracker,EndingCursorDisplay} from '../src/ending-wrists.js';
import {CrackHits,CRACKS} from '../src/ending.js';
function pose(left,right){const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:0,presence:0}));for(const [i,p] of [[15,left],[16,right]])if(p)points[i]={x:1-p.x,y:p.y,visibility:.9,presence:.9};return points;}
test('body pose supplies both wrists when fast swings hide the fingers',()=>{
 const tracker=new EndingWristTracker();const p=poseWrists(pose({x:.3,y:.5},{x:.7,y:.6}),1000);
 const hands=tracker.update([],p,1000);assert.equal(hands.length,2);assert.ok(hands.every(h=>h.source==='pose'));
 assert.deepEqual(hands.map(h=>h.id),['Left','Right']);assert.equal(tracker.update([],p,1300).length,0);
});
test('spatial matching preserves wrist identity when the hand classifier flips its label',()=>{
 const tracker=new EndingWristTracker();const p=poseWrists(pose({x:.3,y:.5},{x:.7,y:.6}),1000);
 const hands=tracker.update([{id:'Right',x:.3,y:.5},{id:'Left',x:.7,y:.6}],p,1000);
 assert.equal(hands.find(h=>h.x===.3).id,'Left');assert.equal(hands.find(h=>h.x===.7).id,'Right');
 assert.ok(hands.every(h=>h.source==='hand'));
});
test('cursor stays visible across intermittent missing frames, then fades without feeding held points to hits',()=>{
 const c=new EndingCursorDisplay();c.update([{id:'Left',x:.3,y:.5,sampleAt:1000}],1000);
 assert.equal(c.update([],1050)[0].opacity,1);assert.equal(c.update([],1400)[0].opacity,1);
 assert.ok(Math.abs(c.update([],1700)[0].opacity-(850-700)/350)<1e-10);
 assert.equal(c.update([],1900).length,0);
 const hit=new CrackHits();assert.equal(hit.update([],1900),null);
});
test('three real-shaped fast strokes inside large cracks work across hand-detector dropouts',()=>{
 const tracker=new EndingWristTracker(),hits=new CrackHits();
 for(let i=0;i<3;i++){
  const c=CRACKS[i],time=2000+i*2000;
  const first=poseWrists(pose({x:c.x-.045,y:c.y},null),time);
  assert.equal(hits.update(tracker.update([],first,time),time),null);
  hits.update([],time+40); // A missed inference must not erase the previous wrist.
  const second=poseWrists(pose({x:c.x+.045,y:c.y},null),time+100);
  const hit=hits.update(tracker.update([],second,time+100),time+100);
  assert.equal(hit?.id,c.id);assert.equal(hit.count,i+1);
  assert.equal(hits.update(tracker.update([],second,time+150),time+150),null);
 }
 assert.equal(hits.hit.size,3);
});

