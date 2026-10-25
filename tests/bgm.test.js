import test from 'node:test';import assert from 'node:assert/strict';
import {BgmController,bgmVolume,BGM_VOLUME} from '../src/bgm.js';
test('music fades in, stays continuous across main/photo, ducks with confirmation and recovers',async()=>{
 const a={paused:true,volume:1,currentTime:0,plays:0,play(){this.paused=false;this.plays++;return Promise.resolve();},pause(){this.paused=true;}};
 const c=new BgmController(a);c.arm();await Promise.resolve();
 assert.equal(a.loop,true);assert.equal(a.volume,0);
 for(let now=0;now<=4500;now+=50)c.update({now,scene:'main'});
 assert.ok(a.volume>.64);a.currentTime=42;
 c.update({now:4550,scene:'photo'});assert.equal(a.currentTime,42);assert.equal(a.plays,1);
 for(let now=4600;now<=7550;now+=50)c.update({now,scene:'photo',holding:true,progress:(now-4550)/3000});
 assert.ok(a.volume<.04);
 for(let now=7600;now<=8550;now+=50)c.update({now,scene:'photo'});
 assert.ok(a.volume>.64);
 for(let now=8600;now<=10000;now+=50)c.update({now,scene:'ending'});
 assert.equal(a.paused,true);assert.equal(a.currentTime,0);assert.equal(a.volume,0);
 assert.equal(bgmVolume('opening',99999),0);assert.equal(bgmVolume('photo',9000,1,true),0);assert.equal(bgmVolume('main',2000),BGM_VOLUME/2);
});
