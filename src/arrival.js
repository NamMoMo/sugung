export const HAND_TARGET={x:1620/3840,y:698/2160,w:600/3840,h:600/2160};
export const STANDBY_HANDOFF_MS=180;
export function insideHandTarget(point){
 return !!point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=HAND_TARGET.x&&point.x<=HAND_TARGET.x+HAND_TARGET.w&&point.y>=HAND_TARGET.y&&point.y<=HAND_TARGET.y+HAND_TARGET.h;
}
export class ArrivalController{
 constructor(){this.reset();}
 reset(){this.fired=false;}
 update({scene,enabled,point}){
  if(scene!=='standby'){return false;}
  if(!enabled||this.fired||!insideHandTarget(point))return false;
  this.fired=true;return true;
 }
}
