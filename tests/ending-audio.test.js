import test from 'node:test';
import assert from 'node:assert/strict';
import {EndingAudioFade} from '../src/ending-audio.js';
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
