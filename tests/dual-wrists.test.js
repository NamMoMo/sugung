import test from 'node:test';
import assert from 'node:assert/strict';
import {DualWrists,cameraWrist} from '../src/dual-wrists.js';
import {activeGlitchRegions} from '../src/quadrant-glitch.js';
test('left and right wrists keep separate positions even when detection order changes',()=>{
 const t=new DualWrists();t.update([{id:'Left',x:.2,y:.2},{id:'Right',x:.8,y:.8}]);
 const hands=t.update([{id:'Right',x:.7,y:.8},{id:'Left',x:.2,y:.3}]);
 assert.ok(hands.find(h=>h.id==='Right').x>.7);assert.equal(hands.find(h=>h.id==='Left').x,.2);
 assert.deepEqual(activeGlitchRegions(0,hands),[4,2]);
 assert.equal(t.update([{id:'Left',x:.2,y:.3}]).length,1);assert.deepEqual(t.update([]),[]);
});
test('both wrists can select every shard and forced stages still accumulate without duplicates',()=>{
 const points=[{x:.8,y:.2},{x:.2,y:.2},{x:.2,y:.8},{x:.8,y:.8}];
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)assert.deepEqual(new Set(activeGlitchRegions(0,[points[i],points[j]])),new Set([i+1,j+1]));
 assert.deepEqual(activeGlitchRegions(26000,[points[0],points[3]]),[1,3,4]);
 assert.deepEqual(activeGlitchRegions(28000,[]),[1,3,2,4]);
});
test('quick wrist movement has little smoothing lag and camera crop stays aligned with the displayed video',()=>{
 const tracker=new DualWrists();tracker.update([{id:'Left',x:.2,y:.2}]);
 const p=tracker.update([{id:'Left',x:.8,y:.8}])[0];assert.ok(Math.abs(p.x-.8)<.02&&Math.abs(p.y-.8)<.02);
 const crop=cameraWrist({x:.25,y:.25},640,480);assert.equal(crop.x,.25);assert.ok(Math.abs(crop.y-1/6)<1e-8);
 assert.deepEqual(cameraWrist({x:.5,y:.5},1920,1080),{x:.5,y:.5});
});

