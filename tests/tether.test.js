import test from 'node:test';
import assert from 'node:assert/strict';
import {shortTether,MAX_TETHER_PX} from '../src/tether.js';
test('label connectors never exceed the short maximum even for distant silhouette anchors',()=>{
 for(const angle of [-35,0,25])for(const anchorX of [0,.2,.8,1]){
  const line=shortTether({x:.5,y:.5,w:.1,h:.07,angle,anchorX,anchorY:.1});
  assert.ok(Math.hypot(line.x2-line.x1,line.y2-line.y1)<=MAX_TETHER_PX+1e-8);
 }
});
test('nearby anchors are reached without extending the line beyond the silhouette',()=>{
 const line=shortTether({x:.5,y:.5,w:.1,h:.07,anchorX:.56,anchorY:.5});
 assert.ok(Math.abs(line.x2-.56*3840)<1e-8);
 assert.equal(line.y1,line.y2);
});
