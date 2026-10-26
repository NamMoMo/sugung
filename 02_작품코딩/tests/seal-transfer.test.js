import test from "node:test";
import assert from "node:assert/strict";
import { chests, emptyAnswers } from "../src/journey.js";
import { earnedLights, placeLight, nearestSeal } from "../src/seal-transfer.js";

test("lights appear only when both missions in their chest are complete",()=>{
 const answers=emptyAnswers(); answers.outfit[0]="discover"; assert.equal(earnedLights(answers).length,0);
 answers.outfit[1]="explore"; assert.deepEqual(earnedLights(answers).map(x=>x.id),["outfit-0","outfit-1"]);
});
test("six distinct earned lights unlock six distinct seals in any chest or seal order",()=>{
 const answers=Object.fromEntries(chests.map(chest=>[chest.id,chest.scenes.map(s=>s.options[0][0])]));
 let placements={};
 for(const [i,light] of earnedLights(answers).reverse().entries())placements=placeLight(placements,light.id,i,answers);
 assert.equal(Object.keys(placements).length,6);assert.deepEqual(Object.values(placements),[0,1,2,3,4,5]);
 const same=placeLight(placements,"outfit-0",0,answers);assert.equal(same,placements);
});
test("drops cannot invent a light, reuse a light, reuse a seal, or target an invalid seal",()=>{
 const answers=emptyAnswers();answers.outfit=["discover","explore"];
 const one=placeLight({},"outfit-0",4,answers);
 for(const [id,target] of [["outfit-0",3],["outfit-1",4],["strength-0",2],["invented",2],["outfit-1",6],["outfit-1",-1],["outfit-1",1.5]])assert.equal(placeLight(one,id,target,answers),one);
});
test("nearby drops snap to the nearest eligible seal; distant drops return the light",()=>{
 const targets=[{index:0,x:50,y:30,radius:40},{index:2,x:90,y:30,radius:40}];
 assert.equal(nearestSeal({x:86,y:36},targets),2);assert.equal(nearestSeal({x:25,y:45},targets),0);
 assert.equal(nearestSeal({x:90,y:180},targets),null);assert.equal(nearestSeal({x:50,y:30},[]),null);
});
