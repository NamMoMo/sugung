import test from 'node:test';import assert from 'node:assert/strict';
import {StableLabelLayout,intersects} from '../src/layout.js';
import {dropOutcome} from '../src/interaction.js';
import {remapHand,foregroundMask,HandSearch} from '../src/vision.js';
test('anchors stay identical when the live silhouette or proposals move, and on add/remove',()=>{
 const layout=new StableLabelLayout();const labels=Array.from({length:7},(_,i)=>({id:String(i),slot:i}));
 const proposals=labels.map((l,i)=>({...l,x:i%2?.62:.4,y:.25+i*.07,side:i%2?1:-1}));
 const first=layout.update(labels,proposals);const old=new Map(first.map(p=>[p.id,[p.x,p.y]]));
 const shifted=proposals.map(p=>({...p,x:p.x+.2,y:p.y-.1}));
 for(let i=7;i<17;i++){labels.push({id:String(i),slot:i});shifted.push({...labels.at(-1),x:.5,y:.5});}
 const sizes=Object.fromEntries(labels.map((l,i)=>[l.id,{w:i<7?.1:.17,h:i<7?.075:.103}]));
 const added=layout.update(labels,shifted,sizes);
 for(const p of added)if(old.has(p.id))assert.deepEqual([p.x,p.y],old.get(p.id));
 for(let a=0;a<added.length;a++)for(let b=0;b<a;b++)assert.equal(intersects(added[a],added[b],0),false);
 const remaining=layout.update(labels.filter(l=>l.id!=='2'),shifted,sizes);
 for(const p of remaining){const prev=added.find(l=>l.id===p.id);assert.equal(p.x,prev.x);assert.equal(p.y,prev.y);}
});
test('opening the hand cannot move the drop position back onto the body',()=>{
 const data=new Float32Array(10000);for(let y=0;y<100;y++)for(let x=40;x<60;x++)data[y*100+x]=1;
 const mask={width:100,height:100,data};
 const held={origin:{x:.45,y:.5},point:{x:.8,y:.5}};
 const outcome=dropOutcome(held,mask,{x:.5,y:.5});assert.equal(outcome.discard,true);assert.equal(outcome.point.x,.8);
 assert.equal(dropOutcome({...held,point:{x:.5,y:.5}},mask,{x:.8,y:.5}).discard,false);
 assert.equal(dropOutcome({...held,point:held.origin},mask,{x:.8,y:.5}).discard,false);
});
test('cropped hand wrist is mapped back to the full mirrored frame',()=>{
 const hand={points:Array.from({length:21},()=>({x:.25,y:.5,z:0})),id:'Left'};
 const h=remapHand(hand,{x:.2,y:.3,w:.4,h:.5});assert.ok(Math.abs(h.x-.7)<1e-9);assert.equal(h.y,.55);
});
test('multiclass foreground is the inverse of background probability',()=>{
 const mask=foregroundMask({confidenceMasks:[{width:2,height:1,getAsFloat32Array:()=>new Float32Array([1,0])}]});
 assert.deepEqual([...mask.data],[0,1]);
});
test('far-hand recovery scans smaller crops, preserving source aspect ratio',()=>{
 const draws=[],canvas={getContext:()=>({drawImage:(...args)=>draws.push(args)})};
 const tracker=new HandSearch(canvas),empty={landmarks:[],gestures:[],handedness:[]};
 const vision={hands:{recognizeForVideo:()=>empty},detailHands:{recognize:()=>empty}};
 for(let now=200;now<=1800;now+=200)tracker.detect(vision,{videoWidth:1920,videoHeight:1080},now);
 assert.equal(draws.length,9);assert.ok(Math.abs(draws[0][3]-1920*.28)<.001);assert.ok(Math.abs(draws[0][4]-1080*.46)<.001);
 assert.equal(canvas.width,512);assert.equal(canvas.height,Math.round(512*(.46*1080)/(.28*1920)));
 assert.notEqual(draws[0][1],draws[1][1]);assert.notEqual(draws[0][2],draws[3][2]);
});
