import {splashRate} from './splash-game.js';

// Positions use mirrored screen coordinates; radii use screen-height units.
const diagonals=[[[.31,.41],[.69,.76]],[[.31,.76],[.69,.41]]];
export class SplashGuides{
 constructor(){this.reset();}
 reset(){this.pairs=0;this.hits=new Map();this.previous=new Map();this.strokeCount=0;}
 get targets(){return diagonals[this.pairs%2].map(([x,y],i)=>({id:`${this.pairs}-${i}`,x,y,r:.12,hit:this.hits.has(i)}));}
 get turns(){return Math.floor(this.pairs/2);}
 get rate(){return splashRate(this.turns);}
 update(points,now){
  const targets=this.targets,events=[];
  for(const p of points){
   if(!['Left','Right'].includes(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   const at=p.sampleAt??now,old=this.previous.get(p.id);
   if(now-at>250||at>now+20||old&&at<=old.at)continue;
   this.previous.set(p.id,{x:p.x,y:p.y,at});
   if([...this.hits.values()].includes(p.id))continue;
   const target=targets.find((t,i)=>{
    if(this.hits.has(i))return false;
    const dx=(p.x-t.x)*16/9,dy=p.y-t.y;
    if(Math.hypot(dx,dy)<=t.r)return true;
    if(!old||at-old.at>250)return false;
    const ax=(old.x-t.x)*16/9,ay=old.y-t.y,vx=dx-ax,vy=dy-ay;
    // Fast, continuous sweeps may cross a guide between camera samples.
    const u=Math.max(0,Math.min(1,-(ax*vx+ay*vy)/(vx*vx+vy*vy||1)));
    return Math.hypot(ax+u*vx,ay+u*vy)<=t.r;
   });
   if(!target)continue;
   this.hits.set(targets.indexOf(target),p.id);this.strokeCount++;
   events.push({id:p.id,x:target.x,y:target.y,target:target.id,at});
  }
  if(this.hits.size===2){this.pairs++;this.hits.clear();this.previous.clear();}
  return events;
 }
}

export function splashAudioFade(video,transition=0){
 const remaining=(video.duration-video.currentTime)/Math.max(.1,video.playbackRate||1);
 const tail=Number.isFinite(remaining)?Math.max(0,Math.min(1,1-remaining/3)):0;
 return Math.max(tail,Math.max(0,Math.min(1,transition)));
}
