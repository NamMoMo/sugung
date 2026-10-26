import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_ENTRY_SECONDS,GAME_SLOTS,LanePressure,JourneyCursor,seaSpriteBrightness,journeyCursorPoint,turtleFrame} from '../src/turtle-game.js';
test('jara descends from above and settles near the lower edge',()=>{
 const start=turtleFrame(0),end=turtleFrame(GAME_ENTRY_SECONDS);
 assert.ok(start.jara.y+GAME_SLOTS.jara.h/2<0);
 assert.ok(end.jara.y>1850&&end.jara.y<1910);
});
test('moving fish lane covers screen edges and jara follows with subtle motion',()=>{
 for(let t=4;t<120;t+=.13){const f=turtleFrame(t);
  assert.ok(f.right-f.left>=600-1e-6&&f.right-f.left<=2100);
  assert.ok(f.left>=0&&f.right<=3840);
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

test('lane starts wide and narrows with time; wrist direction pushes bubble boundaries inward smoothly',()=>{
 const start=turtleFrame(0),end=turtleFrame(20);assert.ok(start.right-start.left>end.right-end.left+700);
 const p=new LanePressure();p.update({id:'Left',y:.5,x:.5},1000);const left=p.update({id:'Left',y:.5,x:.4},1100);
 assert.ok(left.leftPressure>0&&left.leftPressure<90);assert.equal(left.rightPressure,0);
 const baseline=turtleFrame(10),pressed=turtleFrame(10,left);assert.ok(pressed.left>baseline.left);assert.ok(pressed.right<baseline.right);
 const right=p.update({id:'Left',y:.5,x:.5},1200);assert.ok(right.rightPressure>0);assert.ok(turtleFrame(10,right).right<baseline.right);
 const before=p.rightTarget;p.update({id:'Left',y:.5,x:.5},1300);assert.equal(p.rightTarget,before);
 for(let i=0;i<200;i++)p.update({id:'Left',y:.5,x:i%2?.6:.4},1400+i*50);
 assert.ok(p.leftTarget+p.rightTarget<=1000+1e-6);
 for(let t=0;t<25;t+=.1){const f=turtleFrame(t,{leftPressure:p.left,rightPressure:p.right});assert.ok(f.right-f.left>=600-1e-6);assert.ok(journeyCursorPoint({x:0,y:.5},f).x+180<f.right);}
 p.reset();assert.equal(p.left,0);assert.equal(p.right,0);
});

test('bubble lane closes much further with movement, including vertical movement, without crushing the cursor',()=>{
 const duration=20,wide=turtleFrame(0,{duration}),late=turtleFrame(20,{duration});
 assert.equal(wide.right-wide.left,2100);assert.ok(Math.abs(late.right-late.left-800)<1e-6);
 const p=new LanePressure();p.update({id:'Right',x:.5,y:.3},1000);p.update({id:'Right',x:.5,y:.4},1100);
 assert.ok(p.leftTarget>0&&p.rightTarget>0);
 let moving;
 for(let i=0;i<120;i++)moving=p.update({id:'Right',x:i%2?.6:.4,y:.5},1200+i*50);
 const closed=turtleFrame(10,{duration,...moving});assert.ok(closed.right-closed.left<=601);
 const c=new JourneyCursor();c.update({x:0,y:.5},1000,wide);
 const trapped=c.update(null,1100,closed);assert.ok(trapped.x-180>=closed.left&&trapped.x+180<=closed.right);
 const normal=turtleFrame(10,{duration});assert.ok(normal.right-normal.left>closed.right-closed.left+500);
});
