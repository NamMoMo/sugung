export const MAX_TETHER_PX=120;
export function shortTether(label){
 const cx=label.x*3840,cy=label.y*2160,ax=label.anchorX*3840,ay=label.anchorY*2160;
 const dx=ax-cx,dy=ay-cy,length=Math.hypot(dx,dy);if(!length)return {x1:cx,y1:cy,x2:cx,y2:cy};
 const angle=-(label.angle||0)*Math.PI/180,localX=dx*Math.cos(angle)-dy*Math.sin(angle),localY=dx*Math.sin(angle)+dy*Math.cos(angle);
 const edge=Math.min(Math.abs((label.w*3840/2)/(localX||1e-10)),Math.abs((label.h*2160/2)/(localY||1e-10)),1);
 const x1=cx+dx*edge,y1=cy+dy*edge,remaining=Math.max(0,length*(1-edge)),travel=Math.min(MAX_TETHER_PX,remaining);
 return {x1,y1,x2:x1+dx/length*travel,y2:y1+dy/length*travel};
}
