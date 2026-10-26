import test from 'node:test';
import assert from 'node:assert/strict';
import {EndingAudioFade,EndingNarration,narrationAllowsCracks} from '../src/ending-audio.js';
test('ending BGM fades through white interlude into final screen without a restart',()=>{
 const audio={volume:.42,paused:false,currentTime:32,pause(){this.paused=true;}},fade=new EndingAudioFade();
 fade.start(audio,1000);fade.tick(1000);assert.equal(audio.volume,.42);
 fade.tick(2000);const before=audio.volume;assert.ok(before>0&&before<.42);assert.equal(audio.paused,false);
 fade.start(audio,3000);fade.tick(3000);assert.ok(audio.volume>0&&audio.volume<before);assert.equal(audio.paused,false);
 fade.tick(4000);assert.equal(audio.volume,0);assert.equal(audio.paused,true);assert.equal(audio.currentTime,32);
});
test('reset cancels the old fade so a new experience is not muted later',()=>{
 const audio={volume:.42,paused:false,pause(){this.paused=true;}},fade=new EndingAudioFade();
 fade.start(audio,1000);fade.stop(audio);audio.volume=.42;audio.paused=false;
 fade.tick(10000);assert.equal(audio.volume,.42);assert.equal(audio.paused,false);
});

test('narration begins in 7.5 at 1.3x and preserves its playhead into 08',()=>{
 const a={paused:true,ended:false,currentTime:8,volume:0,playbackRate:1,plays:0,pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}};
 const n=new EndingNarration(a);n.enter('endingPrelude',1);
 assert.equal(a.currentTime,0);assert.equal(a.playbackRate,1.3);assert.equal(a.plays,1);
 a.currentTime=3.9;n.enter('ending',1);assert.equal(a.currentTime,3.9);assert.equal(a.plays,1);assert.equal(a.paused,false);
 n.enter('standby',1);assert.equal(a.paused,true);n.enter('endingPrelude',2);assert.equal(a.currentTime,0);assert.equal(a.plays,2);
});
test('cracks wait until three real seconds remain, and stay locked on blocked/unknown audio',()=>{
 const a={duration:17.99,currentTime:14,playbackRate:1.3,paused:false,ended:false,seeking:false};
 assert.equal(narrationAllowsCracks(a),false);a.currentTime=14.1;assert.equal(narrationAllowsCracks(a),true);
 a.currentTime=14.99;a.playbackRate=1;assert.equal(narrationAllowsCracks(a),true);
 a.paused=true;assert.equal(narrationAllowsCracks(a),false);
 a.paused=false;a.duration=NaN;assert.equal(narrationAllowsCracks(a),false);
 a.ended=true;assert.equal(narrationAllowsCracks(a),true);
});
