import test from 'node:test';
import assert from 'node:assert/strict';
import {GlitchTimeline,quadrantAt,quadrantRect,shardPolygon,pointInShard,forcedGlitchRegions} from '../src/quadrant-glitch.js';
import {bodyMaskPixels} from '../src/glitch-mask.js';
test('screen-space mirrored wrists map to the mathematical four quadrants',()=>{
 for(const [point,q] of [[{x:.75,y:.25},1],[{x:.25,y:.25},2],[{x:.25,y:.75},3],[{x:.75,y:.75},4]])assert.equal(quadrantAt(point),q);
 for(const point of [null,{x:NaN,y:.5},{x:-.01,y:.5},{x:.5,y:1.1}])assert.equal(quadrantAt(point),null);
 
});
test('broken glass shards tile the whole screen and use the same polygons for hit testing',()=>{
 let total=0;
 for(const q of [1,2,3,4]){const p=shardPolygon(q);let area=0;for(let i=0;i<p.length;i++){const n=p[(i+1)%p.length];area+=p[i].x*n.y-n.x*p[i].y;}total+=Math.abs(area)/2;const r=quadrantRect(q);assert.ok(r.w>0&&r.h>0);}
 assert.ok(Math.abs(total-1)<1e-10);
 for(let x=.003;x<1;x+=.017)for(let y=.004;y<1;y+=.019){const point={x,y},matches=[1,2,3,4].filter(q=>pointInShard(point,shardPolygon(q)));assert.equal(matches.length,1);assert.equal(quadrantAt(point),matches[0]);}
 assert.equal(quadrantRect(null),null);
});
test('jagged visual boundaries change hit selection near the old straight cross',()=>{
 assert.notEqual(quadrantAt({x:.5,y:.25}),quadrantAt({x:.5,y:.3}));
});
test('scene lasts exactly 30 seconds, fades music over its last second and advances once',()=>{
 const t=new GlitchTimeline(5000);
 assert.deepEqual(t.update(34000),{elapsed:29000,fade:0,advance:false});
 assert.equal(t.update(34500).fade,.5);assert.equal(t.update(34999).advance,false);
 assert.deepEqual(t.update(35000),{elapsed:30000,fade:1,advance:true});assert.equal(t.update(40000).advance,false);
 assert.equal(new GlitchTimeline(40000).update(40000).fade,0);
});
test('last five seconds accumulate forced shards in the requested order without a hand',()=>{
 for(const [time,regions] of [[24999,[]],[25000,[1]],[26000,[1,3]],[27000,[1,3,2]],[28000,[1,3,2,4]],[29999,[1,3,2,4]]])assert.deepEqual(forcedGlitchRegions(time),regions);
});
test('administrator advance runs the closing second without restarting an existing transition',()=>{
 const t=new GlitchTimeline(1000);t.finish(3000);
 assert.equal(t.update(3000).elapsed,29000);assert.equal(t.update(3500).fade,.5);
 t.finish(3500);assert.equal(t.update(4000).advance,true);assert.equal(t.update(4100).advance,false);
});
test('body overlay is black only where foreground confidence identifies a person',()=>{
 const pixels=bodyMaskPixels({width:3,height:1,data:new Float32Array([0,.5,1])});
 assert.deepEqual([...pixels.slice(0,4)],[0,0,0,0]);assert.ok(pixels[7]>0&&pixels[7]<255);
 assert.deepEqual([...pixels.slice(8,12)],[0,0,0,255]);
});

