import test from 'node:test';import assert from 'node:assert/strict';
import {UpperBodyLayout,upperBodyFrame,upperContour,upperBodyOccluded} from '../src/upper-body.js';
import {intersects} from '../src/layout.js';
import {contourPoints} from '../src/light-effects.js';
import {waterTransitionState,WATER_IMPACT_MS,WATER_DURATION_MS} from '../src/water-transition.js';
const points=()=>Array.from({length:33},()=>({x:.5,y:.3,visibility:1}));
test('labels follow head and shoulders, independent of wrist locations',()=>{
 const p=points();p[11]={x:.4,y:.47,visibility:1};p[12]={x:.6,y:.47,visibility:1};
 const frame=upperBodyFrame(p);p[15]={x:0,y:0};p[16]={x:1,y:0};assert.deepEqual(upperBodyFrame(p),frame);
 const layout=new UpperBodyLayout(),labels=[{id:'a'},{id:'b'}];
 const first=layout.update(labels,{},frame,100);
 let moved;for(let i=0;i<20;i++)moved=layout.update(labels,{}, {...frame,x:frame.x+.05,headX:frame.headX+.05,headY:frame.headY+.04,shoulderY:frame.shoulderY+.04},16);
 assert.ok(moved[0].x-first[0].x>.035);assert.ok(moved[0].y-first[0].y>.025);
 const ids=moved.map(l=>layout.seats.get(l.id));layout.update([...labels,{id:'c'}],{},null);
 assert.deepEqual(labels.map(l=>layout.seats.get(l.id)),ids);
 const before={...layout.frame};assert.equal(upperBodyFrame(undefined),null);layout.update(labels,{},null);assert.deepEqual(layout.frame,before);
 p[11].visibility=.1;assert.equal(upperBodyFrame(p),null);
});
test('17 upper-body labels remain separate and along the body contour',()=>{
 const labels=Array.from({length:17},(_,i)=>({id:String(i),slot:i})),sizes=Object.fromEntries(labels.map((l,i)=>[l.id,{w:(i<7?340:650)/3840,h:150/2160}]));
 const layout=new UpperBodyLayout(),placed=layout.update(labels,sizes,null);
 for(let i=0;i<placed.length;i++)for(let j=0;j<i;j++)assert.equal(intersects(placed[i],placed[j],.002),false);
 assert.ok(placed.every(p=>p.y<.90&&p.y>.1));
 for(const p of placed){
  const s=layout.seats.get(p.id),dx=Math.max(0,Math.abs(p.anchorX-p.x)-s.w/2)*3840,dy=Math.max(0,Math.abs(p.anchorY-p.y)-s.h/2)*2160;
  assert.ok(Math.hypot(dx,dy)<(s.along?120:26),`${p.id} detached from silhouette`);
  assert.equal(s.lane,0);
 }
});
test('contour sparks originate at edges and mirror with the camera',()=>{
 const data=new Float32Array(400);for(let y=4;y<16;y++)for(let x=4;x<16;x++)data[y*20+x]=1;
 const mask={data,width:20,height:20},a=contourPoints(mask,false),b=contourPoints(mask,true);
 assert.ok(a.length>10);for(let i=0;i<a.length;i++){assert.equal(b[i].x,1-a[i].x);assert.equal(b[i].nx,-a[i].nx);assert.ok(Math.hypot(a[i].nx,a[i].ny)>.99);}
});
test('irregular label placement stays collision-free across mixed discards and additions',()=>{
 for(let scenario=0;scenario<50;scenario++){
  const layout=new UpperBodyLayout();let labels=Array.from({length:7},(_,i)=>({id:`base-${i}`,slot:i}));
  for(let step=0;step<=10;step++){
   const sizes=Object.fromEntries(labels.map(l=>[l.id,{w:(l.id.startsWith('base')?340:650)/3840,h:150/2160}]));
   const positions=layout.update(labels,sizes,null);
   const boxes=positions.map(p=>({...p,w:layout.seats.get(p.id).w,h:layout.seats.get(p.id).h}));
   for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++)assert.equal(intersects(boxes[i],boxes[j],.004),false);
   if(step===10)break;
   if((scenario*7+step*3)%5===0&&labels.length)labels=labels.filter((_,i)=>i!==(scenario+step)%labels.length);
   else labels.push({id:`own-${step}`,slot:7+step});
  }
 }
 const layout=new UpperBodyLayout(),labels=Array.from({length:7},(_,i)=>({id:String(i),slot:i}));
 const p=layout.update(labels,{},null);
 assert.ok(new Set(p.map(l=>l.x.toFixed(3))).size>=6);
 assert.ok(new Set(p.map(l=>l.y.toFixed(3))).size>=6);
});
test('water droplet falls before the result switches, then ripples fade out',()=>{
 assert.equal(waterTransitionState(0).stage,'fall');assert.equal(waterTransitionState(350).fall,.5);
 assert.equal(waterTransitionState(WATER_IMPACT_MS).stage,'ripple');
 assert.equal(waterTransitionState(WATER_DURATION_MS).stage,'complete');
 assert.equal(waterTransitionState(WATER_DURATION_MS).opacity,0);
});
test('labels stay outside the real upper silhouette, including rotated rectangle corners',()=>{
 const width=400,height=240,data=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const nx=x/width,ny=y/height;
  if(((nx-.5)/.04)**2+((ny-.31)/.08)**2<1||(ny>.37&&ny<.8&&Math.abs(nx-.5)<.04+(ny-.37)*.3))data[y*width+x]=1;
 }
 const bodyData=new Float32Array(data);
 // An isolated raised hand must not become a head/neck attachment point. It can
 // pass over a label to grab it without pushing that label to a different seat.
 for(let y=42;y<65;y++)for(let x=300;x<320;x++)data[y*width+x]=1;
 const mask={width,height,data},layout=new UpperBodyLayout();
 const labels=Array.from({length:17},(_,i)=>({id:String(i),slot:i}));
 const sizes=Object.fromEntries(labels.map((l,i)=>[l.id,{w:(i<7?340:650)/3840,h:150/2160}]));
 const positions=layout.update(labels,sizes,null,16,mask,false);assert.equal(positions.length,17);
 const rows=upperContour(mask,layout.frame,false);assert.ok(rows.every(r=>r.left>.3&&r.right<.7));
 for(const p of positions){
  const s=layout.seats.get(p.id);
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
   const x=Math.round((p.x+(i/8-.5)*s.w)*width),y=Math.round((p.y+(j/8-.5)*s.h)*height);
   assert.ok(x>=0&&x<width&&y>=0&&y<height);assert.equal(bodyData[y*width+x],0,`${p.id} enters the body`);
  }
 }
});

test('cropped contour cannot stop live tracking; last valid layout survives and recovers',()=>{
 const labels=Array.from({length:7},(_,i)=>({id:String(i),slot:i}));
 const sizes=Object.fromEntries(labels.map(l=>[l.id,{w:340/3840,h:150/2160}]));
 const layout=new UpperBodyLayout(),first=layout.update(labels,sizes,null);
 const data=new Float32Array(160*90);for(let y=64;y<67;y++)for(let x=0;x<10;x++)data[y*160+x]=1;
 const mask={width:160,height:90,data};
 for(let i=0;i<30;i++){
  const result=layout.update(labels,sizes,{x:.025,headX:.025,headY:.72,shoulderY:.81,width:.1},100,mask,false);
  assert.equal(result.length,7);assert.ok(result.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
 assert.equal(layout.warning,true);
 let recovered;for(let i=0;i<30;i++)recovered=layout.update(labels,sizes,{x:.5,headX:.5,headY:.325,shoulderY:.465,width:.19},100,null);
 assert.equal(layout.warning,false);assert.equal(recovered.length,first.length);
});

test('adding many labels preserves readable type and irregular seats instead of switching to a small grid',()=>{
 const layout=new UpperBodyLayout(),labels=Array.from({length:17},(_,i)=>({id:`read-${i}`,slot:i}));
 const sizes=Object.fromEntries(labels.map(l=>[l.id,{w:340/3840,h:132/2160,fontSize:66}]));
 const initial=layout.update(labels.slice(0,8),sizes,null).map(p=>({...p}));
 const nine=layout.update(labels.slice(0,9),sizes,null);
 for(let i=0;i<8;i++){assert.equal(nine[i].fontSize,initial[i].fontSize);assert.equal(nine[i].angle,initial[i].angle);}
 const all=layout.update(labels,sizes,null);assert.equal(all.length,17);
 assert.ok(all.every(p=>p.fontSize>=64&&p.h*2160>=116));
 assert.ok(new Set(all.map(p=>p.angle)).size>=3);
 for(let i=0;i<all.length;i++)for(let j=0;j<i;j++)assert.equal(intersects({...all[i],w:layout.seats.get(all[i].id).w,h:layout.seats.get(all[i].id).h},{...all[j],w:layout.seats.get(all[j].id).w,h:layout.seats.get(all[j].id).h},.002),false);
});




test('a hand connected to the head cannot repack established label seats',()=>{
 const width=400,height=240,data=new Float32Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const nx=x/width,ny=y/height;
  if(((nx-.5)/.04)**2+((ny-.31)/.08)**2<1||(ny>.37&&ny<.8&&Math.abs(nx-.5)<.04+(ny-.37)*.3))data[y*width+x]=1;
 }
 const layout=new UpperBodyLayout(),labels=Array.from({length:7},(_,i)=>({id:String(i),slot:i}));
 const mask={width,height,data},first=layout.update(labels,{},null,16,mask,false).map(p=>({...p}));
 const seats=first.map(p=>({...layout.seats.get(p.id)}));
 const connected=new Float32Array(data);
 for(let y=38;y<93;y++)for(let x=165;x<245;x++)connected[y*width+x]=1;
 for(let n=0;n<30;n++){
  const after=layout.update(labels,{},null,16,{width,height,data:connected},false,true);
  assert.deepEqual(after.map(p=>[p.id,p.x,p.y,p.angle,p.side]),first.map(p=>[p.id,p.x,p.y,p.angle,p.side]));
  assert.deepEqual(after.map(p=>layout.seats.get(p.id)),seats);
 }
 assert.equal(upperBodyOccluded(layout.frame,[{x:.52,y:.28}]),true);
 assert.equal(upperBodyOccluded(layout.frame,[{x:.9,y:.8}]),false);
 const before=layout.frame.headX;
 for(let n=0;n<15;n++)layout.update(labels,{}, {...layout.frame,headX:.55,x:.55},16,{width,height,data:connected},false,true);
 assert.ok(layout.frame.headX>before+.02);
});
