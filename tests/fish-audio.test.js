import test from 'node:test';
import assert from 'node:assert/strict';
import {FishAudioController,FISH_VOLUME,FISH_FADE_MS} from '../src/fish-audio.js';
function audio(){return {volume:0,paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};}
test('fish sound starts from zero and fades with the black scene transition, then stops',async()=>{
 const a=audio(),c=new FishAudioController(a);await c.start();assert.equal(a.paused,false);assert.equal(a.volume,FISH_VOLUME);
 c.transition(.5);assert.equal(a.volume,FISH_VOLUME/2);c.transition(1);
 assert.equal(a.volume,0);assert.equal(a.paused,true);assert.equal(a.currentTime,0);
});
test('operator scene advance also fades audio; reset stops immediately and replay restores volume',async()=>{
 const a=audio(),c=new FishAudioController(a);await c.start();a.currentTime=5;
 c.fadeOut(1000);c.tick(1000+FISH_FADE_MS/2);assert.ok(a.volume>0&&a.volume<FISH_VOLUME);assert.equal(a.paused,false);
 c.tick(1000+FISH_FADE_MS);assert.equal(a.paused,true);
 await c.start();assert.equal(a.volume,FISH_VOLUME);c.stop();assert.equal(a.paused,true);assert.equal(a.volume,0);
});
test('fish_A fades at the end of its 25-second limit and cannot resume on later scene transition',async()=>{
 const a=audio(),c=new FishAudioController(a);await c.start();a.currentTime=24.8;c.tick(1000);
 assert.ok(a.volume>0&&a.volume<FISH_VOLUME);a.currentTime=25;c.tick(1200);
 assert.equal(a.paused,true);assert.equal(a.volume,0);c.transition(.2);assert.equal(a.volume,0);
});
test('quiet looping ambience has no 25-second cap and fades when the scene changes',async()=>{
 const a=audio(),c=new FishAudioController(a,()=>{},{volume:.18,loop:true,limit:Infinity});
 await c.start();a.currentTime=40;c.tick(1000);assert.equal(a.loop,true);assert.equal(a.volume,.18);assert.equal(a.paused,false);
 c.transition(.5);assert.equal(a.volume,.09);c.transition(1);assert.equal(a.paused,true);
});

