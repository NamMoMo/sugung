import test from 'node:test';
import assert from 'node:assert/strict';
import {displayLabel,isLanguageScene,translate} from '../src/language.js';
import {newSession,reduceSession,ConfirmController} from '../src/interaction.js';
test('English displays built-in labels without modifying session data',()=>{
 const state=newSession();
 assert.deepEqual(state.labels.map(l=>displayLabel(l,'en')),['Ability','Freedom','Salary','Recognition','Service','Growth','Stability']);
 assert.deepEqual(state.labels.map(l=>displayLabel(l,'ko')),['실력','자유','연봉','명예','봉사','성장','안정']);
 assert.equal(state.labels[0].text,'실력');
});
test('English mode preserves user input, including words matching built-in labels',()=>{
 let state={...newSession(),scene:'main'};
 for(const [i,text] of ['실력','나의 행복','My dream'].entries())state=reduceSession(state,{type:'add',text,id:`own-${i}`});
 assert.deepEqual(state.labels.filter(l=>l.own).map(l=>displayLabel(l,'en')),['실력','나의 행복','My dream']);
 assert.equal(state.count,3);
});
test('translation is limited to 5.5, 06 and 07',()=>{
 for(const scene of ['mainReady','main','photo'])assert.equal(isLanguageScene(scene),true);
 for(const scene of ['standby','rabbit','endingPrelude','ending','escaped'])assert.equal(isLanguageScene(scene),false);
 assert.equal(translate('확인','en'),'Confirm');assert.equal(translate('확인','ko'),'확인');
});
test('language toggle requires 3s fist, fires once and rearms after leaving',()=>{
 const hold=new ConfirmController();let fired=0;
 for(let now=100;now<=7000;now+=100)if(hold.update({now,inside:true,gesture:'fist',hand:'Left'}))fired++;
 assert.equal(fired,1);
 for(let now=7100;now<=7500;now+=100)hold.update({now,inside:false,gesture:'open',hand:'Left'});
 for(let now=7600;now<=11000;now+=100)if(hold.update({now,inside:true,gesture:'fist',hand:'Left'}))fired++;
 assert.equal(fired,2);
});
