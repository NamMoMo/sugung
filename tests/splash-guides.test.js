import test from 'node:test';
import assert from 'node:assert/strict';
import {SplashGuides,splashAudioFade} from '../src/splash-guides.js';
const hand=(id,t,at)=>({id,x:t.x,y:t.y,sampleAt:at});
test('diagonal guides require two distinct hands, latch a touch and alternate fixed positions',()=>{
 const g=new SplashGuides(),first=g.targets;
 assert.deepEqual(first.map(t=>[t.x,t.y]),[[.35,.41],[.65,.76]]);
 assert.equal(g.update([hand('Left',first[0],1000)],1000).length,1);
 assert.equal(g.targets[0].hit,true);assert.equal(g.pairs,0);
 g.update([hand('Left',first[1],1100)],1100);assert.equal(g.pairs,0);
 assert.equal(g.update([hand('Right',first[1],1200)],1200).length,1);
 assert.equal(g.pairs,1);assert.equal(g.turns,0);
 assert.deepEqual(g.targets.map(t=>[t.x,t.y]),[[.35,.76],[.65,.41]]);
 g.update(g.targets.map((t,i)=>hand(i?'Left':'Right',t,1400)),1400);
 assert.equal(g.turns,1);assert.deepEqual(g.targets.map(t=>[t.x,t.y]),first.map(t=>[t.x,t.y]));
});
test('three complete diagonal round trips increase speed; one pair cannot trigger multiple rounds',()=>{
 const g=new SplashGuides();
 for(let pair=0;pair<80;pair++){
  const at=1000+pair*500,points=g.targets.map((t,i)=>hand(i?'Right':'Left',t,at));
  g.update(points,at);assert.equal(g.pairs,pair+1);
  assert.equal(g.rate,[.8,1,1.2,1.4,1.6,1.8,2][Math.min(6,Math.floor((pair+1)/6))]);
 }
 g.reset();assert.equal(g.rate,.8);assert.equal(g.pairs,0);
});
test('stale, invalid or single-hand samples cannot advance; continuous crossing is accepted',()=>{
 const g=new SplashGuides(),t=g.targets[0];
 assert.deepEqual(g.update([hand('Left',t,100)],1000),[]);
 assert.deepEqual(g.update([{id:'Left',x:NaN,y:t.y}],1000),[]);
 g.update([{id:'Left',x:t.x-.1,y:t.y,sampleAt:1100}],1100);
 assert.equal(g.update([{id:'Left',x:t.x+.1,y:t.y,sampleAt:1200}],1200).length,1);
 assert.equal(g.pairs,0);
});
test('fish audio fades in the last three real seconds at any video speed and during operator fade',()=>{
 assert.equal(splashAudioFade({duration:40,currentTime:20,playbackRate:2}),0);
 assert.equal(splashAudioFade({duration:40,currentTime:37,playbackRate:2}),.5);
 assert.ok(splashAudioFade({duration:40,currentTime:37.6,playbackRate:.8})<.00001);
 assert.ok(Math.abs(splashAudioFade({duration:40,currentTime:38.8,playbackRate:.8})-.5)<.00001);
 assert.equal(splashAudioFade({duration:40,currentTime:20,playbackRate:1},.7),.7);
 assert.equal(splashAudioFade({duration:40,currentTime:40,playbackRate:1}),1);
 assert.equal(splashAudioFade({duration:NaN,currentTime:0,playbackRate:1}),0);
});
