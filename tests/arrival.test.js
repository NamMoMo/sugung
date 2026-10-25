import test from 'node:test';
import assert from 'node:assert/strict';
import {ArrivalController,HAND_TARGET,insideHandTarget} from '../src/arrival.js';
import {newSession,reduceSession} from '../src/interaction.js';
const center={x:HAND_TARGET.x+HAND_TARGET.w/2,y:HAND_TARGET.y+HAND_TARGET.h/2};
test('standby stays until an enabled wrist enters the Figma hand bounds',()=>{
 const c=new ArrivalController();
 for(const point of [null,{x:0,y:0},{x:NaN,y:.5}])assert.equal(c.update({scene:'standby',enabled:true,point}),false);
 assert.equal(c.update({scene:'standby',enabled:false,point:center}),false);
 assert.equal(c.update({scene:'standby',enabled:true,point:center}),true);
 assert.equal(c.update({scene:'standby',enabled:true,point:center}),false);
 c.reset();assert.equal(c.update({scene:'intro',enabled:true,point:center}),false);
 assert.equal(c.update({scene:'standby',enabled:true,point:{...center,id:'Right'}}),true);
});
test('target includes both edges but excludes outside',()=>{
 assert.equal(insideHandTarget({x:HAND_TARGET.x,y:HAND_TARGET.y}),true);
 assert.equal(insideHandTarget({x:HAND_TARGET.x+HAND_TARGET.w,y:HAND_TARGET.y+HAND_TARGET.h}),true);
 assert.equal(insideHandTarget({x:HAND_TARGET.x-.001,y:center.y}),false);
});
test('operator sequence includes intro, main, photo, ending and resets to standby',()=>{
 let s=newSession();assert.equal(s.scene,'standby');
 for(const scene of ['intro','minigame','king','glitch','rabbitPause','rabbit','mainReady','main','photo','endingPrelude','ending','endingWhite','escaped','escaped']){s=reduceSession(s,{type:'next'});assert.equal(s.scene,scene);}
 assert.equal(reduceSession(s,{type:'reset'}).scene,'standby');
});


