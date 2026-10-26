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
// Keep the complete breathing glow safely inside the visible bubble corridor.
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
export class LanePressure {
 constructor(){this.reset();}
 reset(){this.previous=null;this.last=null;this.left=0;this.right=0;this.leftTarget=0;this.rightTarget=0;}
 update(point,now){
  const dt=this.last===null?16:clamp(now-this.last,0,100);this.last=now;
  if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)){
   const previous=this.previous;
   if(previous&&now-previous.time<350&&previous.id===point.id){
    const dx=point.x-previous.x,dy=point.y-previous.y,movement=Math.hypot(dx*16/9,dy);
    if(movement>.004&&movement<.4){
     const room=Math.max(0,1000-this.leftTarget-this.rightTarget),push=Math.min(room,movement*1700);
     const share=movement?Math.abs(dx*16/9)/movement:0;
     this.leftTarget+=push*(dx<0?(1+share)/2:(1-share)/2);this.rightTarget+=push*(dx<0?(1-share)/2:(1+share)/2);
    }
   }
   this.previous={x:point.x,y:point.y,time:now,id:point.id};
  }else if(this.previous&&now-this.previous.time>350)this.previous=null;
  const alpha=1-Math.exp(-dt/450);this.left+=(this.leftTarget-this.left)*alpha;this.right+=(this.rightTarget-this.right)*alpha;
  return {leftPressure:this.left,rightPressure:this.right};
 }
}
export function turtleFrame(seconds,{duration=19.958333,leftPressure=0,rightPressure=0}={}){
 const t=Math.max(0,seconds),entry=ease(t/GAME_ENTRY_SECONDS),progress=Math.pow(clamp(t/(Number.isFinite(duration)&&duration>0?duration:19.958333),0,1),.8);
 const offset=(48*Math.sin(t*.85)+20*Math.sin(t*1.7))*ease(t/1.4);
 const pressure=clamp(leftPressure+rightPressure,0,1000);
 const width=Math.max(600,2100-1300*progress-pressure);
 const center=1920+offset+clamp((leftPressure-rightPressure)*.12,-100,100);
 const left=center-width/2,right=center+width/2;
 const jara={x:(left+right)/2+4*Math.sin(t*1.05)*entry,y:-428+(1880+428)*entry+9*Math.sin(t*1.4)*entry};
 return {entry,left,right,offset,leftOffset:left-1733,rightOffset:right-2293,jara};
}
