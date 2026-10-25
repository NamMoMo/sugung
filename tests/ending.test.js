import test from 'node:test';
import assert from 'node:assert/strict';
import {CRACKS,CrackHits,EndingSegments,HIT_COOLDOWN_MS,ENDING_PRELUDE_MS,createCracks,endingCoverOpacity,endingVideoReady,endingAcceptsHit,CRACK_GAP} from '../src/ending.js';
const target=CRACKS[0];
const at=(x,y=target.y,id='Left')=>({x,y,id});
test('a held hand, first detection inside, and slow entry never count as impact',()=>{
 const c=new CrackHits();assert.equal(c.update([at(target.x)],0),null);
 for(let t=50;t<1000;t+=50)assert.equal(c.update([at(target.x)],t),null);
 const slow=new CrackHits();
 for(let i=0;i<=100;i++)assert.equal(slow.update([at(target.x-.12+i*.0012)],i*40),null);
});
test('fast entry hits once, removes the chosen crack, and accepts either hand in arbitrary order',()=>{
 const c=new CrackHits(),last=CRACKS[2];
 c.update([at(last.x-.14,last.y,'Right')],0);
 assert.equal(c.update([at(last.x,last.y,'Right')],100).id,last.id);
 assert.equal(c.update([at(last.x,last.y,'Right')],180),null);
 c.update([at(target.x-.13,target.y,'Left')],600);
 assert.equal(c.update([at(target.x,target.y,'Left')],700).count,2);
 c.update([at(last.x-.14,last.y,'Right')],1200);
 assert.equal(c.update([at(last.x,last.y,'Right')],1300),null);
});
test('global cooldown prevents a second hand from double-counting one swing',()=>{
 const c=new CrackHits(),b=CRACKS[1];
 c.update([at(target.x-.13),at(b.x-.13,b.y,'Right')],0);
 assert.equal(c.update([at(target.x),at(b.x,b.y,'Right')],100).count,1);
 assert.equal(c.hit.size,1);assert.equal(HIT_COOLDOWN_MS,400);
});
test('stale samples and long loss do not hit; a brief loss preserves a genuine moving wrist',()=>{
 const c=new CrackHits();c.update([{...at(target.x-.13),sampleAt:0}],0);
 assert.equal(c.update([{...at(target.x),sampleAt:0}],100),null);
 c.update([],120);assert.equal(c.update([at(target.x)],140)?.id,target.id);
 const lost=new CrackHits();lost.update([at(target.x-.13)],300);assert.equal(lost.update([at(target.x)],700),null);
 const swapped=new CrackHits();swapped.update([at(target.x-.13)],800);assert.equal(swapped.update([at(target.x,target.y,'Right')],900),null);
});
test('fast sweep through a target between camera frames is not missed; locked animation ignores hits',()=>{
 const c=new CrackHits();c.update([at(target.x-.2)],0);
 assert.equal(c.update([at(target.x+.2)],100).id,target.id);
 const locked=new CrackHits();locked.update([at(target.x-.13)],0);
 assert.equal(locked.update([at(target.x)],100,false),null);
 assert.equal(locked.update([at(target.x)],200,true),null);
});
test('video segments follow intro, loop 2–3, hits 4–5, loop 6–7, third hit 7–end',()=>{
 const s=new EndingSegments();assert.deepEqual(s.range,[0,1]);assert.equal(s.hit(),false);
 assert.equal(s.boundary(1),2);assert.deepEqual(s.range,[2,3]);
 assert.equal(s.boundary(3),2);assert.equal(s.hit(),true);assert.deepEqual(s.range,[4,5]);
 assert.equal(s.hit(),false);assert.equal(s.boundary(5),6);assert.deepEqual(s.range,[6,7]);
 assert.equal(s.boundary(7),6);assert.equal(s.hit(),true);assert.deepEqual(s.range,[4,5]);
 assert.equal(s.boundary(5),6);assert.equal(s.hit(),true);assert.deepEqual(s.range,[7,Infinity]);
 assert.equal(s.boundary(14),null);assert.equal(s.hit(),false);assert.equal(ENDING_PRELUDE_MS,3000);
});
test('operator advance plays the escape footage rather than jumping past it',()=>{
 const s=new EndingSegments();s.forceEscape();assert.equal(s.hits,3);assert.deepEqual(s.range,[7,Infinity]);
});


test('large cracks can occupy the whole stage and never overlap or leave its edges',()=>{
 const layouts=new Set();for(let seed=1;seed<=50;seed++){
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const cracks=createCracks(random);layouts.add(JSON.stringify(cracks));assert.equal(cracks.length,3);
  for(let i=0;i<3;i++){const c=cracks[i];
   assert.ok(c.r*4320>=960);assert.ok(c.x-c.r*9/16>=0&&c.x+c.r*9/16<=1);
   assert.ok(c.y-c.r>=0&&c.y+c.r<=1);
   for(let j=0;j<i;j++)assert.ok(Math.hypot((c.x-cracks[j].x)*16/9,c.y-cracks[j].y)>c.r+cracks[j].r+CRACK_GAP);
  }
 }
 assert.ok(layouts.size>40);assert.deepEqual(createCracks(()=>.05),CRACKS);
});
test('black cover appears only during the first wall-clock second and cannot return on a video seek',()=>{
 assert.equal(endingCoverOpacity(0,null),1);
 assert.equal(endingCoverOpacity(1000,1000),1);
 assert.equal(endingCoverOpacity(1875,1000),.5);
 assert.equal(endingCoverOpacity(2000,1000),0);
 assert.equal(endingCoverOpacity(5000,1000),0);
 assert.equal(endingCoverOpacity(25000,1000),0);
});



test('all three wrist hits survive impact seeks with no seeked-event bookkeeping',()=>{
 const c=new CrackHits(),s=new EndingSegments();s.boundary(1);
 const v={readyState:4,paused:false,seeking:false,currentTime:2};
 for(let i=0;i<3;i++){
  const t=1000+i*2000,circle=CRACKS[i];
  c.update([at(circle.x-.18,circle.y)],t,endingVideoReady(v,s)&&s.hittable);
  const hit=c.update([at(circle.x,circle.y)],t+100,endingVideoReady(v,s)&&s.hittable);
  assert.equal(hit?.count,i+1);assert.equal(s.hit(),true);
  if(i<2){
   v.currentTime=4;assert.equal(s.hittable,false);
   v.seeking=true;assert.equal(endingVideoReady(v,s),false);
   v.seeking=false;v.currentTime=5.1;assert.equal(s.boundary(v.currentTime),6);
   v.currentTime=6;assert.equal(endingVideoReady(v,s),true);assert.equal(s.hittable,true);
  }
 }
 assert.equal(s.phase,'escape');assert.equal(c.hit.size,3);assert.deepEqual(s.range,[7,Infinity]);
});




test('an idle loop seek never blocks the next hit, but impact playback still does',()=>{
 const s=new EndingSegments(),v={paused:false,seeking:true,readyState:1,currentTime:6};
 assert.equal(endingAcceptsHit(v,s),false);s.boundary(1);s.hit();s.boundary(5);
 assert.equal(endingVideoReady(v,s),false);assert.equal(endingAcceptsHit(v,s),true);
 s.hit();assert.equal(endingAcceptsHit(v,s),false);s.boundary(5);assert.equal(endingAcceptsHit(v,s),true);
 v.paused=true;assert.equal(endingAcceptsHit(v,s),false);
});
