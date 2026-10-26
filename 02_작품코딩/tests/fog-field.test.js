import test from "node:test";
import assert from "node:assert/strict";
import { FogField } from "../src/fog-field.js";

test("dense fog fills the space, while a stationary touch never completes the entrance",()=>{
 const fog=new FogField();assert.ok(fog.density.every(d=>d===1));
 for(let i=0;i<30;i++)fog.push({x:.5,y:.5},{x:.5,y:.5});
 assert.equal(fog.progress,0);assert.equal(fog.puffs.length,0);
});
test("a hand sweep carries vapor in its direction and keeps moving after release",()=>{
 const fog=new FogField();fog.push({x:.2,y:.5},{x:.4,y:.5});
 assert.ok(fog.puffs.length>0);const p=fog.puffs[0],x=p.x;
 assert.ok(p.vx>0);assert.ok(fog.vx.some(v=>v>0));
 fog.step(.05);assert.ok(p.x>x);assert.ok(fog.density.some(d=>d<.9));
 const reverse=new FogField();reverse.push({x:.8,y:.5},{x:.6,y:.5});assert.ok(reverse.puffs[0].vx<0);
});
test("sweeps retain progress, soften their edge and bound all rendering particles",()=>{
 const fog=new FogField();
 for(let i=0;i<200;i++)fog.push({x:.2,y:.4},{x:.3,y:.4});
 assert.ok(fog.puffs.length<=64);const progress=fog.progress;
 for(let i=0;i<100;i++)fog.step(.05);
 assert.equal(fog.progress,progress);assert.ok(fog.density.every(d=>d>=0&&d<=1));
 for(const [a,b] of [[{x:.03,y:.25},{x:.97,y:.25}],[{x:.97,y:.25},{x:.03,y:.5}],[{x:.03,y:.5},{x:.97,y:.8}]])fog.push(a,b);
 assert.equal(fog.progress,100);
 for(let i=0;i<100;i++)fog.step(.05,true);
 assert.ok(fog.density.every(d=>d<.05));
});
