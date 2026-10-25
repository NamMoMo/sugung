export const GAME_ENTRY_SECONDS=3.2;
export const SEA_PLAYBACK_RATE=.8;
export const GAME_FADE_MS=2000;
export const KING_REVEAL_MS=650;
export const GAME_SLOTS={
 left:{x:0,y:0,w:1733,h:2161},right:{x:2293,y:0,w:1547,h:2160},jara:{w:550,h:428},
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export function seaSpriteBrightness(seconds,duration){
 const progress=clamp(seconds/(Number.isFinite(duration)&&duration>0?duration:19.958333),0,1);
 return 1-.38*ease(progress);
}
// Clamp the complete 360px glow inside the animated lane, including the 42px
// displacement filter's largest horizontal excursion.
export function journeyCursorPoint(point,frame=turtleFrame(0)){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 return {x:clamp(point.x*3840,frame.left+222,frame.right-222),y:clamp(point.y*2160,180,1980)};
}
export class JourneyCursor{
 constructor(){this.reset();}
 reset(){this.point=null;this.position=null;this.seen=-Infinity;this.last=null;}
 update(point,now,frame){
  const dt=this.last===null?16:Math.max(0,Math.min(100,now-this.last));this.last=now;
  if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)){this.point=point;this.seen=now;}
  const age=now-this.seen,opacity=age<=450?1:Math.max(0,1-(age-450)/250);
  if(!this.point||opacity===0){this.position=null;return null;}
  const target=journeyCursorPoint(this.point,frame),alpha=1-Math.exp(-dt/55);
  if(!this.position)this.position=target;
  else this.position={x:this.position.x+(target.x-this.position.x)*alpha,y:this.position.y+(target.y-this.position.y)*alpha};
  // The moving wall may catch a held cursor during a short tracking gap.
  this.position.x=clamp(this.position.x,frame.left+222,frame.right-222);
  return {...this.position,opacity};
 }
}
export function turtleFrame(seconds){
 const t=Math.max(0,seconds),entry=ease(t/GAME_ENTRY_SECONDS);
 const opening=ease(t/1.4);
 const offset=(220*Math.sin(t*.85)+100*Math.sin(t*1.7))*opening;
 // Walls travel outward, preserving coverage at either outer edge of the TV.
 const widening=(420+100*Math.sin(t*.65+.5))*opening;
 const leftOffset=offset-widening,rightOffset=offset+widening;
 const left=1733+leftOffset,right=2293+rightOffset,center=(left+right)/2;
 const jara={x:center+4*Math.sin(t*1.05)*entry,y:-428+(1880+428)*entry+9*Math.sin(t*1.4)*entry};
 return {entry,left,right,offset,leftOffset,rightOffset,jara};
}
