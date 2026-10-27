export const SPLASH_AMPLITUDE=.075;
export const SPLASH_TURNS_PER_STEP=2;
export function splashRate(turns){return Math.min(2,(8+2*Math.floor(Math.max(0,turns)/SPLASH_TURNS_PER_STEP))/10);}
// A complete excursion and return counts as one stroke. Two alternating
// anatomical arms make one turn; held hands and simultaneous lifts do not.
export class SplashGame {
 constructor(){this.reset();}
 reset(){this.arms=new Map();this.pending=null;this.turns=0;this.strokeCount=0;}
 update(points,now){
  const events=[];
  for(const p of points){
   if(!['Left','Right'].includes(p.id)||!Number.isFinite(p.y))continue;
   const at=p.sampleAt??now;
   if(now-at>300)continue;
   let arm=this.arms.get(p.id);
   if(arm&&at<=arm.at)continue;
   if(!arm||at-arm.at>500){arm={at,origin:p.y,extreme:p.y,direction:0,lastStroke:-Infinity};this.arms.set(p.id,arm);continue;}
   arm.at=at;
   if(!arm.direction){
    const displacement=p.y-arm.origin;
    if(Math.abs(displacement)>=SPLASH_AMPLITUDE){arm.direction=Math.sign(displacement);arm.extreme=p.y;}
   }else{
    if((p.y-arm.extreme)*arm.direction>0)arm.extreme=p.y;
    if((arm.extreme-p.y)*arm.direction>=SPLASH_AMPLITUDE&&at-arm.lastStroke>=350){
     arm.lastStroke=at;arm.origin=p.y;arm.extreme=p.y;arm.direction=0;
     if(this.pending&&at-this.pending.at>6000)this.pending=null;
     this.strokeCount++;
     let turn=false;
     if(this.pending&&this.pending.id!==p.id&&at-this.pending.at>=180){this.turns++;this.pending=null;turn=true;}
     else if(!this.pending||this.pending.id===p.id)this.pending={id:p.id,at};
     events.push({id:p.id,turn,turns:this.turns,rate:splashRate(this.turns),at});
    }
   }
  }
  return events;
 }
 get rate(){return splashRate(this.turns);}
}

