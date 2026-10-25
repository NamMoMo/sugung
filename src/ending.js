export const PHOTO_FADE_MS=900;
export const ENDING_PRELUDE_MS=3000;
export const ENDING_WHITE_MS=2000;
export const HIT_COOLDOWN_MS=400;
// Speed uses screen heights/second, correcting x for the 16:9 stage.
export const HIT_MIN_SPEED=.55;
export const CRACKS=[
 {id:'upper',x:.19,y:.36,r:480/2160},
 {id:'right',x:.81,y:.40,r:480/2160},
 {id:'lower',x:.5,y:.77,r:480/2160},
];
export const CRACK_GAP=240/2160;
const distance=(a,b)=>Math.hypot((a.x-b.x)*16/9,a.y-b.y);
export function createCracks(random=Math.random){
 for(let attempt=0;attempt<30;attempt++){
 const placed=[];
 for(const base of CRACKS){
  let found=null;
  for(let i=0;i<100;i++){
   const c={...base,x:.145+random()*.71,y:.36+random()*.41};
   if(placed.every(p=>distance(p,c)>p.r+c.r+CRACK_GAP)){found=c;break;}
  }
  if(!found)break;
  placed.push(found);
 }
 if(placed.length===3)return placed;
 }
 return CRACKS.map(c=>({...c}));
}
// This clock never follows a looping/seeked video timestamp back to zero.
export function endingCoverOpacity(now,startedAt){
 if(startedAt===null)return 1;
 return Math.max(0,Math.min(1,(1000-(now-startedAt))/250));
}
function crosses(a,b,c){
 const dx=(b.x-a.x)*16/9,dy=b.y-a.y;
 const t=Math.max(0,Math.min(1,(((c.x-a.x)*16/9)*dx+(c.y-a.y)*dy)/(dx*dx+dy*dy||1)));
 return distance({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},c)<=c.r;
}
export class CrackHits{
 constructor(cracks=CRACKS){this.cracks=cracks;this.previous=new Map();this.hit=new Set();this.lastHit=-Infinity;}
 update(points,now,enabled=true){
  let success=null;
  for(const p of points){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   const id=p.id??'wrist',at=p.sampleAt??now,old=this.previous.get(id);
   if(now-at>300)continue;
   if(old&&at<=old.at)continue; // Rendering the same inference twice is not movement.
   const continuous=old&&at-old.at<=350;
   const trail=continuous?[...(old.trail||[]),old].filter(s=>at-s.at<=180):[];
   this.previous.set(id,{x:p.x,y:p.y,at,trail:trail.map(({x,y,at})=>({x,y,at}))});
   if(!enabled||success||!continuous||at-old.at<8||now-this.lastHit<HIT_COOLDOWN_MS)continue;
   const anchor=trail[0]||old,movement=distance(anchor,p),speed=movement/((at-anchor.at)/1000);
   // Ignore implausible jumps after a tracking swap; reacquisition needs a new entry.
   if(movement<.035||speed<HIT_MIN_SPEED||speed>12)continue;
   // Large targets can already contain the wrist. A real fast stroke inside
   // them is valid too; an unmoving/slowly resting wrist still cannot hit.
   const target=this.cracks.find(c=>!this.hit.has(c.id)&&crosses(anchor,p,c));
   if(target){this.hit.add(target.id);this.lastHit=now;success={id:target.id,hand:id,speed,count:this.hit.size};}
  }
  for(const [id,p] of this.previous)if(now-p.at>350)this.previous.delete(id);
  return success;
 }
}
export class EndingSegments{
 constructor(){this.phase='intro';this.hits=0;this.revision=0;}
 get range(){
  if(this.phase==='intro')return [0,1];
  if(this.phase==='impact')return [4,5];
  if(this.phase==='escape')return [7,Infinity];
  return this.hits===0?[2,3]:[6,7];
 }
 get hittable(){return this.phase==='idle';}
 hit(){if(!this.hittable)return false;this.hits++;this.phase=this.hits===3?'escape':'impact';this.revision++;return true;}
 forceEscape(){if(this.phase==='escape')return;this.hits=3;this.phase='escape';this.revision++;}
 boundary(time){
  if(time<this.range[1]-.025||this.phase==='escape')return null;
  if(this.phase==='intro'||this.phase==='impact')this.phase='idle';
  this.revision++;return this.range[0];
 }
}
// Read actual media readiness; a missed seeked event must never lock out hits.
export function endingVideoReady(video,segments){
 const [from,to]=segments.range;
 return video.readyState>=2&&!video.paused&&!video.seeking&&video.currentTime>=from-.08&&video.currentTime<=to+.08;
}
export function endingAcceptsHit(video,segments){
 // Loop seeks are presentation work. Do not discard a real swing during them.
 return segments.hittable&&!video.paused;
}
