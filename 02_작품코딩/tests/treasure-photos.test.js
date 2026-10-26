import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { treasurePhotos } from "../src/treasure-photos.js";
import { treasures } from "../src/treasure-data.js";

test("each of the thirty treasures has a distinct valid photo region",()=>{
 assert.deepEqual(Object.keys(treasurePhotos).sort(),Object.keys(treasures).sort());
 const regions=new Set();
 for(const photo of Object.values(treasurePhotos)){
  assert.ok(existsSync(`public${photo.src}`));assert.ok(photo.column>=0 && photo.column<3);assert.ok(photo.row>=0 && photo.row<2);
  assert.notEqual(`${photo.column},${photo.row}`,"2,1");regions.add(`${photo.src}:${photo.column},${photo.row}`);
 }
 assert.equal(regions.size,30);
});
