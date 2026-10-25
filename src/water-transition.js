export const WATER_IMPACT_MS=700;
export const WATER_DURATION_MS=2500;
export function waterTransitionState(elapsed){
 const impact=(elapsed-WATER_IMPACT_MS)/1000;
 return {fall:Math.min(1,Math.max(0,elapsed/WATER_IMPACT_MS)),impact,
  opacity:Math.min(1,Math.max(0,(WATER_DURATION_MS-elapsed)/450)),
  stage:elapsed<WATER_IMPACT_MS?'fall':elapsed<WATER_DURATION_MS?'ripple':'complete'};
}
export function drawWaterTransition(ctx,elapsed,W=1280,H=720){
 const {fall,impact,opacity}=waterTransitionState(elapsed),x=W*.5,y=H*.5;
 ctx.clearRect(0,0,W,H);if(!opacity)return;
 ctx.save();ctx.globalAlpha=opacity;
 // Darken softly while the pearl falls; the result appears beneath the impact.
 ctx.fillStyle=`rgba(1,7,19,${impact<0?.28*Math.sin(fall*Math.PI/2):.28*Math.exp(-impact*3)})`;ctx.fillRect(0,0,W,H);
 ctx.globalCompositeOperation='lighter';
 if(impact<0){
  const dy=30+(y-30)*fall*fall,stretch=1+fall*.6;
  const glow=ctx.createRadialGradient(x,dy,0,x,dy,65);glow.addColorStop(0,'#fff7dcaa');glow.addColorStop(.25,'#f3d59355');glow.addColorStop(1,'#bdeaff00');ctx.fillStyle=glow;ctx.fillRect(x-70,dy-70,140,140);
  const trail=ctx.createLinearGradient(x,dy-130,x,dy);trail.addColorStop(0,'#efcf8d00');trail.addColorStop(1,'#ffe8b5aa');ctx.strokeStyle=trail;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,dy-130);ctx.lineTo(x,dy);ctx.stroke();
  ctx.fillStyle='#fff7df';ctx.shadowColor='#ffe5a5';ctx.shadowBlur=18;
  ctx.beginPath();ctx.moveTo(x,dy-22*stretch);ctx.bezierCurveTo(x-3,dy-9,x-12,dy-2,x-10,dy+6);ctx.bezierCurveTo(x-7,dy+19,x+7,dy+19,x+10,dy+6);ctx.bezierCurveTo(x+12,dy-2,x+3,dy-9,x,dy-22*stretch);ctx.fill();
 }else{
  const glow=ctx.createRadialGradient(x,y,0,x,y,180+impact*100);glow.addColorStop(0,`rgba(255,249,225,${Math.exp(-impact*6)})`);glow.addColorStop(.25,`rgba(255,222,153,${.5*Math.exp(-impact*4)})`);glow.addColorStop(1,'#d4edff00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.shadowColor='#d9eaff';ctx.shadowBlur=12;
  for(let i=0;i<6;i++){
   const age=impact-i*.125;if(age<0)continue;
   const radius=12+age*(390-i*24),alpha=Math.max(0,1-age/1.65)*(.7-i*.07);
   ctx.globalAlpha=opacity*alpha;ctx.strokeStyle=i%2?'#a7dfff':'#ffe3a0';ctx.lineWidth=Math.max(.5,2.6-age*1.1);
   ctx.beginPath();ctx.ellipse(x,y,radius,radius*.29,0,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha*=.3;ctx.beginPath();ctx.ellipse(x,y+3,radius+5,radius*.29+2,0,0,Math.PI*2);ctx.stroke();
  }
  for(let i=0;i<28;i++){
   const a=i*2.399,speed=40+(i*37)%130,life=Math.max(0,1-impact/1.25);
   if(!life)break;const dx=Math.cos(a)*speed*impact,dy=Math.sin(a)*speed*.32*impact-135*impact+160*impact*impact;
   ctx.globalAlpha=opacity*life;ctx.fillStyle=i%3?'#ffe5a5':'#c4efff';ctx.beginPath();ctx.ellipse(x+dx,y+dy,1.2+life,2.2+life,0,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}
