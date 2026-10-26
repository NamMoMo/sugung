import test from 'node:test';
import assert from 'node:assert/strict';
import { GripController,newSession,reduceSession,bodyOverlap,isTextEntry } from '../src/interaction.js';
import { labelPosition, OUTPUT_W, OUTPUT_H } from '../src/renderer.js';
const sample=(now,gesture='fist',target='initial-0',hand='Left',point={x:.5,y:.5})=>({now,gesture,target,hand,point});
test('fresh open palm + uninterrupted 2s fist required, then move and release',()=>{
 const g=new GripController();assert.equal(g.update(sample(0)),null);assert.equal(g.update(sample(3000)),null);
 g.update(sample(3100,'open'));g.update(sample(3200));assert.equal(g.update(sample(5199)),null);
 assert.equal(g.update(sample(5200)).type,'grab');assert.equal(g.update(sample(5300)).type,'move');
 assert.equal(g.update(sample(5400,'open')).type,'release');assert.equal(g.drag,null);
});
test('leaving target or changing hand resets dwell',()=>{
 const g=new GripController();g.update(sample(0,'open'));g.update(sample(100));g.update(sample(1900,'fist',null));g.update(sample(2000));assert.equal(g.update(sample(2200)),null);
 assert.equal(g.update(sample(5000,'fist','initial-0','Right')),null);assert.equal(g.drag,null);
});
test('lost tracking cancels a held label and never discards',()=>{
 const g=new GripController();g.update(sample(0,'open'));g.update(sample(100));g.update(sample(2100));
 assert.equal(g.update({...sample(2300),point:null}),null);assert.equal(g.update({...sample(3500),point:null}).type,'cancel');
});
test('confirmation requires 3s and cannot repeat while fist stays closed',()=>{
 const g=new GripController();const s=t=>({...sample(t,'fist','confirm'),duration:3000});
 g.update(sample(0,'open','confirm'));g.update(s(100));assert.equal(g.update(s(3099)),null);assert.equal(g.update(s(3100)).type,'confirm');assert.equal(g.update(s(7000)),null);
});
test('seven combined actions transition once, photo is immutable and reset restores words',()=>{
 let s={...newSession(),scene:'main'};assert.equal(s.labels.length,7);
 for(let i=0;i<4;i++)s=reduceSession(s,{type:'discard',id:`initial-${i}`});
 s=reduceSession(s,{type:'add',text:'   ',id:'blank'});assert.equal(s.count,4);
 s=reduceSession(s,{type:'discard',id:'missing'});assert.equal(s.count,4);
 for(let i=0;i<3;i++)s=reduceSession(s,{type:'add',text:'나의 기준',id:`own-${i}`});
 assert.equal(s.count,7);assert.equal(s.scene,'photo');assert.equal(s.labels.length,6);
 assert.equal(reduceSession(s,{type:'add',text:'ignored',id:'extra'}),s);
 s=reduceSession(s,{type:'reset'});assert.equal(s.scene,'standby');assert.equal(s.count,0);assert.equal(s.labels.length,7);
});
test('mirrored mask and full label footprint decide body overlap',()=>{
 const data=new Float32Array(10000);for(let y=20;y<90;y++)for(let x=30;x<70;x++)data[y*100+x]=1;
 const mask={data,width:100,height:100};assert.equal(bodyOverlap(mask,.5,.5),true);assert.equal(bodyOverlap(mask,.1,.5),false);assert.equal(bodyOverlap(null,.5,.5),false);
});
test('inputs and IME editable targets suppress admin shortcuts',()=>{
 assert.equal(isTextEntry({tagName:'INPUT'}),true);assert.equal(isTextEntry({tagName:'DIV',isContentEditable:true}),true);assert.equal(isTextEntry({tagName:'BUTTON'}),false);
});
test('new labels occupy unused anchors after a discard',()=>{
 let s={...newSession(),scene:'main'};s=reduceSession(s,{type:'discard',id:'initial-2'});s=reduceSession(s,{type:'add',id:'new',text:'나의 시간'});
 assert.equal(new Set(s.labels.map(l=>l.slot)).size,s.labels.length);
});
test('4K output and asymmetric contour labels follow mirrored silhouette edges',()=>{
 assert.equal(OUTPUT_W,3840);assert.equal(OUTPUT_H,2160);
 const data=new Float32Array(10000);for(let y=0;y<100;y++)for(let x=40;x<60;x++)data[y*100+x]=1;
 const mask={data,width:100,height:100},box={x:.3,y:.18,w:.4,h:.65};
 const left=labelPosition({slot:0},box,mask),right=labelPosition({slot:1},box,mask);
 assert.ok(left.x<.41);assert.ok(right.x>.6);assert.notEqual(left.y,right.y);assert.notEqual(left.angle,right.angle);
});
test('input submission can be followed by a fresh open-fist-release cycle',()=>{
 let session={...newSession(),scene:'main'};
 session=reduceSession(session,{type:'add',text:'나다움',id:'mine'});
 const grip=new GripController();grip.reset();
 grip.update(sample(0,'open'));grip.update(sample(100));assert.equal(grip.update(sample(2100)).type,'grab');
 const released=grip.update(sample(2200,'open'));assert.equal(released.type,'release');
 session=reduceSession(session,{type:'discard',id:released.id});assert.equal(session.count,2);assert.ok(session.labels.some(l=>l.id==='mine'));
});
