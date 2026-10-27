import test from 'node:test';
import assert from 'node:assert/strict';
import {ResultSilhouette} from '../src/result-silhouette.js';
const body=x=>{const width=120,height=80,data=new Float32Array(width*height);for(let y=8;y<74;y++)for(let a=x;a<x+22;a++)data[y*width+a]=1;return {width,height,data};};
test('result uses each new mirrored live mask and body frame, and resets between visitors',()=>{
 const result=new ResultSilhouette();assert.equal(result.mask,null);
 assert.equal(result.update(body(20),1000),true);const first=result.frame.x,mask=result.mask;
 assert.equal(result.mask.mirrored,true);assert.equal(result.fresh(1200),true);
 result.update(body(65),1300);assert.ok(first-result.frame.x>.3);assert.notEqual(result.mask,mask);
 assert.equal(result.fresh(2900),false);result.reset();assert.equal(result.mask,null);assert.equal(result.frame,null);
});
test('empty frames never become a full screen silhouette or falsely renew live tracking',()=>{
 const result=new ResultSilhouette();assert.equal(result.update(body(30),1000),true);
 const previous=result.mask;assert.equal(result.update({width:120,height:80,data:new Float32Array(9600)},2000),false);
 assert.equal(result.mask,previous);assert.equal(result.fresh(3000),false);
});
