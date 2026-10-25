import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_ENTRY_SECONDS,GAME_SLOTS,JourneyCursor,seaSpriteBrightness,journeyCursorPoint,turtleFrame} from '../src/turtle-game.js';
test('jara descends from above and settles near the lower edge',()=>{
 const start=turtleFrame(0),end=turtleFrame(GAME_ENTRY_SECONDS);
 assert.ok(start.jara.y+GAME_SLOTS.jara.h/2<0);
 assert.ok(end.jara.y>1850&&end.jara.y<1910);
});
test('moving fish lane covers screen edges and jara follows with subtle motion',()=>{
 for(let t=4;t<120;t+=.13){const f=turtleFrame(t);
  assert.ok(f.right-f.left>=1200&&f.right-f.left<=1600);
  assert.ok(f.leftOffset<=0&&f.rightOffset>=0);
  assert.ok(f.jara.x-275>=f.left&&f.jara.x+275<=f.right);
  assert.ok(Math.abs(f.jara.y-1880)<=9);
 }
 assert.notEqual(turtleFrame(5).offset,turtleFrame(10).offset);
});

test('complete light halo stays between moving fish walls for either wrist',()=>{
 for(let t=0;t<30;t+=.3){const f=turtleFrame(t);
  for(const x of [-1,0,.5,1,2])for(const y of [-1,0,.5,1,2]){
   const p=journeyCursorPoint({x,y},f);
   assert.ok(p.x-180>=f.left+42-1e-6);assert.ok(p.x+180<=f.right-42+1e-6);
   assert.ok(p.y>=180&&p.y<=1980);
  }
 }
 assert.equal(journeyCursorPoint(null),null);assert.equal(journeyCursorPoint({x:NaN,y:0}),null);
});


test('short wrist tracking gaps preserve a visible constrained cursor instead of blinking',()=>{
 const c=new JourneyCursor(),f=turtleFrame(5),p=c.update({x:.5,y:.5},1000,f);
 assert.equal(c.update(null,1100,f).opacity,1);assert.equal(c.update(null,1400,f).opacity,1);
 const faded=c.update(null,1600,f);assert.ok(faded.opacity>0&&faded.opacity<1);
 assert.equal(c.update(null,1750,f),null);
 assert.equal(c.update({x:1,y:.5},1800,f).opacity,1);
 c.reset();assert.equal(c.update(null,2000,f),null);
 assert.ok(p.x>=f.left+222&&p.x<=f.right-222);
});


test('fish and turtle brightness decreases gently to 62 percent without reaching black',()=>{
 assert.equal(seaSpriteBrightness(0,20),1);assert.equal(seaSpriteBrightness(20,20),.62);
 let previous=1;for(let t=0;t<=25;t+=.25){const value=seaSpriteBrightness(t,20);assert.ok(value<=previous+1e-8&&value>=.62);previous=value;}
 assert.equal(seaSpriteBrightness(30,NaN),.62);assert.ok(seaSpriteBrightness(10,20)>.62);
});
