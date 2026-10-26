import test from "node:test";
import assert from "node:assert/strict";
import { chests } from "../src/journey.js";
import { sceneRegions } from "../src/scene-regions.js";

test("every continuous scene has five distinct animal touch regions",()=>{
 for(const scene of chests.flatMap(chest=>chest.scenes)){
  const regions=sceneRegions[scene.id];assert.equal(regions.length,scene.options.length);
  for(const [i,r] of regions.entries()){
   assert.ok(r.x>=0 && r.y>=0 && r.x+r.w<=100 && r.y+r.h<=100);
   assert.ok(r.w>=12 && r.h>=15);
   const cx=r.x+r.w/2,cy=r.y+r.h/2;
   regions.forEach((other,j)=>{if(i!==j)assert.ok(!(cx>other.x && cx<other.x+other.w && cy>other.y && cy<other.y+other.h),`${scene.id}: animal ${i+1} overlaps animal ${j+1}`);});
  }
 }
});
