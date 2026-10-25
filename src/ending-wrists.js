const distance=(a,b)=>Math.hypot((a.x-b.x)*16/9,a.y-b.y);
export function poseWrists(points,sampleAt){
 return [[15,'Left'],[16,'Right']].flatMap(([index,id])=>{
  const p=points?.[index];
  return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.35&&(p.presence??1)>=.35
   ?[{id,x:1-p.x,y:p.y,sampleAt,source:'pose'}]:[];
 });
}
// Match by spatial position, since hand-classifier handedness can flip during a
// fast swing. Pose wrists keep a canonical anatomical identity across gaps.
export class EndingWristTracker{
 constructor(){this.previous=[];}
 update(hands,pose,now){
  const unused=hands.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({...p,sampleAt:now,source:'hand'})),result=[];
  for(const p of pose.filter(p=>now-p.sampleAt<=250)){
   let best=-1,nearest=.25;
   unused.forEach((h,i)=>{const d=distance(h,p);if(d<nearest){nearest=d;best=i;}});
   result.push(best<0?p:{...unused.splice(best,1)[0],id:p.id});
  }
  for(const p of unused){
   if(result.length>=2)break;
   const free=['Left','Right'].filter(id=>!result.some(h=>h.id===id));
   const old=this.previous.filter(h=>free.includes(h.id)&&now-h.sampleAt<=400).sort((a,b)=>distance(a,p)-distance(b,p))[0];
   result.push({...p,id:old&&distance(old,p)<.45?old.id:free.includes(p.id)?p.id:free[0]});
  }
  this.previous=result;return result;
 }
}
// Presentation only: held/faded cursor coordinates never enter the hit detector.
export class EndingCursorDisplay{
 constructor(){this.slots=new Map();this.last=null;}
 update(points,now){
  const dt=this.last===null?16:Math.max(0,Math.min(100,now-this.last));this.last=now;
  for(const p of points){
   const old=this.slots.get(p.id),stamp=p.sampleAt??now;
   if(old&&stamp<=old.seen)continue;
   this.slots.set(p.id,{...old,target:p,seen:stamp,x:old?.x??p.x,y:old?.y??p.y});
  }
  const display=[];
  for(const [id,s] of this.slots){
   const age=now-s.seen;if(age>850){this.slots.delete(id);continue;}
   const alpha=1-Math.exp(-dt/45);s.x+=(s.target.x-s.x)*alpha;s.y+=(s.target.y-s.y)*alpha;
   display.push({id,x:s.x,y:s.y,opacity:age<=500?1:Math.max(0,1-(age-500)/350)});
  }
  return display.slice(0,2);
 }
}
