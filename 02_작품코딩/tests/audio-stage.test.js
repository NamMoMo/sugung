import test from 'node:test';
import assert from 'node:assert/strict';
import {musicStage,MUSIC} from '../src/exhibition-audio.js';
import {existsSync} from 'node:fs';
test('each narrative boundary selects the proper soundtrack, including fog before the escape reveal',()=>{
 assert.equal(musicStage({entered:false,page:'home'}),'intro');
 for(const page of ['trap','home','chest-light'])assert.equal(musicStage({entered:true,page}),'room');
 assert.equal(musicStage({entered:true,page:'scene'}),'mission');
 assert.equal(musicStage({entered:true,page:'chest-light',storyEntering:true}),'mission');
 assert.equal(musicStage({entered:true,page:'escape',escapeFree:false}),'escape');
 assert.equal(musicStage({entered:true,page:'escape',escapeFree:true}),'escape');
 assert.equal(musicStage({entered:true,page:'result'}),'result');
 assert.equal(musicStage({shared:true}),'result');
 for(const track of Object.values(MUSIC))assert.ok(existsSync('public'+track.src),track.src);
});
