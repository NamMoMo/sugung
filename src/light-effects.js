const TAU=Math.PI*2;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function contourPoints(mask,mirrored=true){
 if(!mask)return [];
 const {data,width:w,height:h}=mask,points=[];
 for(let y=2;y<h-2;y+=2)for(let x=2;x<w-2;x+=2){
  const i=y*w+x;if(data[i]<.53)continue;
  const dx=data[i-2]-data[i+2],dy=data[i-2*w]-data[i+2*w];
  if(Math.hypot(dx,dy)<.35)continue;
  const norm=Math.hypot(dx,dy)||1;
  points.push({x:mirrored?1-x/w:x/w,y:y/h,nx:(mirrored?-dx:dx)/norm,ny:dy/norm});
 }
 return points;
}
export function createLightEffects(){
 let edge=[],edgeMask=null;const cache=new Map();
 function updateContour(mask,mirrored){if(mask!==edgeMask){edgeMask=mask;edge=contourPoints(mask,mirrored);}}
 function dust(ctx,event,time,W,H){
  const age=(time-event.time)/1800;if(age<0||age>1)return;
  if(!cache.has(event)){
   const count=event.type==='transition'?760:event.type==='birth'?65:180;
   cache.set(event,Array.from({length:count},(_,i)=>{
    const a=noise(i+19)*TAU,r=Math.sqrt(noise(i+86));
    return {x:event.type==='transition'?(noise(i+7)-.5)*160:(noise(i+7)-.5)*(event.w||.11)*W,
     y:event.type==='transition'?(noise(i+33)-.5)*230:(noise(i+33)-.5)*(event.h||.07)*H,
     vx:Math.cos(a)*(event.type==='transition'?160+r*550:30+r*135),
     vy:Math.sin(a)*(event.type==='transition'?140+r*340:25+r*100)-50,
     size:.5+noise(i+37)*2.1,seed:noise(i+62)};
   }));
  }
  ctx.save();ctx.globalCompositeOperation='lighter';
  const birth=event.type==='birth',speed=birth?.35:1;
  for(const p of cache.get(event)){
   const x=event.x*W+p.x+age*p.vx*speed,y=event.y*H+p.y+age*p.vy*speed-age*age*35;
   const alpha=Math.pow(1-age,1.7)*(.4+.6*Math.pow(Math.sin(age*19+p.seed*13),2));
   ctx.globalAlpha=alpha;ctx.fillStyle=p.seed>.45?'#ffe6a3':'#a8e7ff';
   ctx.fillRect(x,y,p.size*(1-age*.5),p.size*(1-age*.5));
   if(p.seed>.94){ctx.globalAlpha=alpha*.4;ctx.fillRect(x-5,y,11,1);ctx.fillRect(x,y-5,1,11);}
  }
  ctx.restore();
 }
 function rays(ctx,time,center,W,H){
  const t=time/1000,x=center.x*W,y=center.y*H;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const glow=ctx.createRadialGradient(x,y,0,x,y,370);glow.addColorStop(0,'#ffe4a14d');glow.addColorStop(.25,'#e7c47825');glow.addColorStop(1,'#e5c77b00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  for(let i=0;i<34;i++){
   const angle=i*2.399+.025*Math.sin(t*.23+i),len=270+noise(i)*620;
   const ex=x+Math.cos(angle)*len,ey=y+Math.sin(angle)*len*.67;
   const g=ctx.createLinearGradient(x,y,ex,ey);g.addColorStop(0,'#fff2c7bb');g.addColorStop(.18,'#e3c57c66');g.addColorStop(.7,'#8bcdf42b');g.addColorStop(1,'#96ceee00');
   ctx.strokeStyle=g;ctx.lineWidth=i%5===0?1.2:.45;ctx.globalAlpha=.4+.25*Math.sin(t*.7+i);
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+(ex-x)*.45+Math.sin(i+t*.3)*20,y+(ey-y)*.45+Math.cos(i)*26,ex,ey);ctx.stroke();
   const u=(t*.09+noise(i+44))%1;ctx.globalAlpha=(1-u)*.7;ctx.fillStyle='#ffe4ab';ctx.fillRect(x+(ex-x)*u,y+(ey-y)*u,1.7,1.7);
  }
  ctx.restore();
 }
 function aura(ctx,time,center,W,H){
  const t=time/1000;ctx.save();ctx.globalCompositeOperation='lighter';
  const x=center.x*W,y=center.y*H;
  const glow=ctx.createRadialGradient(x,y,0,x,y,130);glow.addColorStop(0,'#fffdf1ef');glow.addColorStop(.06,'#fff1c8dd');glow.addColorStop(.25,'#f5d18d77');glow.addColorStop(1,'#ffd77a00');ctx.fillStyle=glow;ctx.globalAlpha=.8+.12*Math.sin(t*1.8);ctx.fillRect(x-140,y-140,280,280);
  for(let i=0;i<420&&edge.length;i++){
   const p=edge[Math.floor(noise(i+4)*edge.length)],age=(t*.42+noise(i+18))%1,drift=age*(10+noise(i+66)*44);
   const px=p.x*W+p.nx*drift+Math.sin(t+i)*age*6,py=p.y*H+p.ny*drift-age*13;
   ctx.globalAlpha=Math.sin(age*Math.PI)*(.45+noise(i+5)*.55);ctx.fillStyle=i%4?'#ffe4a4':'#b0eaff';
   const size=(.7+noise(i+15)*1.7)*1.3;ctx.fillRect(px,py,size,size);
   if(i%13===0){ctx.globalAlpha*=.45;ctx.fillRect(px-4,py,9,1);ctx.fillRect(px,py-4,1,9);}
  }
  ctx.restore();
 }
 return {updateContour,rays,aura,drawDust(ctx,events,time,W,H){for(const e of events)dust(ctx,e,time,W,H);for(const e of cache.keys())if(time-e.time>1900)cache.delete(e);}};
}
