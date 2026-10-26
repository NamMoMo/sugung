import test from 'node:test';
import assert from 'node:assert/strict';
import {SplashGame,splashRate} from '../src/splash-game.js';
function stroke(game,id,time){let events=[];for(const [dt,y] of [[0,.5],[120,.38],[240,.5]])events.push(...game.update([{id,x:id==='Left'?.3:.7,y,sampleAt:time+dt}],time+dt));return events;}
test('starts at 0.8 and three alternating left-right turns increase by 0.2, capped at 2',()=>{
 const game=new SplashGame();assert.equal(game.rate,.8);
 for(let turn=0;turn<40;turn++){
  const time=1000+turn*1400;
  stroke(game,'Left',time);assert.equal(game.turns,turn);
  stroke(game,'Right',time+500);assert.equal(game.turns,turn+1);
  assert.equal(game.rate,[.8,1,1.2,1.4,1.6,1.8,2][Math.min(6,Math.floor((turn+1)/3))]);
 }
 assert.equal(splashRate(1000),2);game.reset();assert.equal(game.rate,.8);assert.equal(game.turns,0);
});
test('one arm alone, held hands and tiny jitter cannot count turns',()=>{
 const game=new SplashGame();
 for(let i=0;i<8;i++)stroke(game,'Left',1000+i*600);
 assert.equal(game.turns,0);
 for(let t=6000;t<8000;t+=85)game.update([{id:'Right',x:.7,y:.5+.008*Math.sin(t),sampleAt:t}],t);
 assert.equal(game.turns,0);
});
test('simultaneous lifts do not count as alternating and lost tracking cannot manufacture a stroke',()=>{
 const game=new SplashGame();
 for(let n=0;n<5;n++)for(const [dt,y] of [[0,.5],[120,.38],[240,.5]]){
  const t=1000+n*800+dt;game.update([{id:'Left',y,sampleAt:t},{id:'Right',y,sampleAt:t}],t);
 }
 assert.equal(game.turns,0);
 const lost=new SplashGame();lost.update([{id:'Left',y:.5}],1000);lost.update([{id:'Left',y:.35}],1100);lost.update([{id:'Left',y:.5}],2000);assert.equal(lost.strokeCount,0);
 assert.deepEqual(lost.update([{id:'Right',y:.2,sampleAt:500}],2500),[]);
});
