export const GLITCH_DURATION_MS=30000;
export const GLITCH_AUDIO_FADE_MS=1000;
const hub=[.51,.49];
export const GLASS_CRACKS=[
 [hub,[.521,.455],[.487,.421],[.502,.408],[.466,.35],[.493,.313],[.484,.302],[.523,.255],[.499,.186],[.507,.154],[.482,.067],[.49,0]],
 [hub,[.56,.512],[.577,.488],[.624,.5],[.66,.455],[.67,.463],[.752,.508],[.811,.485],[.826,.501],[.91,.479],[1,.525]],
 [hub,[.49,.536],[.513,.578],[.501,.591],[.535,.654],[.51,.691],[.521,.71],[.494,.783],[.543,.855],[.521,.874],[.528,1]],
 [hub,[.451,.478],[.434,.499],[.393,.47],[.358,.483],[.347,.467],[.271,.498],[.209,.462],[.193,.481],[.117,.45],[.061,.468],[0,.459]],
];
const corners={1:[1,0],2:[0,0],3:[0,1],4:[1,1]};
const branches={1:[0,1],2:[3,0],3:[2,3],4:[1,2]};
export function shardPolygon(quadrant,width=1,height=1){
 const pair=branches[quadrant];if(!pair)return null;
 return [...GLASS_CRACKS[pair[0]],corners[quadrant],...GLASS_CRACKS[pair[1]].slice().reverse()].map(([x,y])=>({x:x*width,y:y*height}));
}
export function pointInShard(point,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
export function quadrantAt(point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1||point.y<0||point.y>1)return null;
 // Use the same glass polygons for hit testing and visual clipping.
 const p={x:Math.min(1-1e-9,point.x),y:Math.min(1-1e-9,point.y)};
 for(const q of [4,1,2,3])if(pointInShard(p,shardPolygon(q)))return q;
 return 4;
}
export function quadrantRect(quadrant,width=1280,height=720){
 const polygon=shardPolygon(quadrant,width,height);if(!polygon)return null;
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);
 return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
}
function polygonPath(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
export function drawGlassCracks(ctx,width,height,selected){
 ctx.save();ctx.lineJoin='miter';
 for(const line of GLASS_CRACKS){
  ctx.beginPath();line.forEach(([x,y],i)=>i?ctx.lineTo(x*width,y*height):ctx.moveTo(x*width,y*height));
  ctx.strokeStyle='#01020bdd';ctx.lineWidth=2.4;ctx.stroke();
  ctx.strokeStyle='#d6e9f59c';ctx.lineWidth=.85;ctx.stroke();
  for(let i=2;i<line.length-1;i+=2){const [x,y]=line[i],[nx,ny]=line[i+1];ctx.beginPath();ctx.moveTo(x*width,y*height);ctx.lineTo((x+(ny-y)*.36)*width,(y-(nx-x)*.36)*height);ctx.strokeStyle='#d8e5f14a';ctx.lineWidth=.65;ctx.stroke();}
 }
 for(const q of (Array.isArray(selected)?selected:selected?[selected]:[])){polygonPath(ctx,shardPolygon(q,width,height));ctx.strokeStyle='#ff372b66';ctx.shadowColor='#ff1e16';ctx.shadowBlur=5;ctx.lineWidth=1.2;ctx.stroke();}
 ctx.restore();
}
export function forcedGlitchRegions(elapsed){
 if(elapsed>=GLITCH_DURATION_MS-2000)return [1,3,2,4];
 if(elapsed>=GLITCH_DURATION_MS-3000)return [1,3,2];
 if(elapsed>=GLITCH_DURATION_MS-4000)return [1,3];
 if(elapsed>=GLITCH_DURATION_MS-5000)return [1];
 return [];
}
export function activeGlitchRegions(elapsed,hands){return [...new Set([...forcedGlitchRegions(elapsed),...hands.map(quadrantAt).filter(Boolean)])];}
export class GlitchTimeline{
 constructor(now){this.start=now;this.fired=false;}
 finish(now){this.start=Math.min(this.start,now-GLITCH_DURATION_MS+GLITCH_AUDIO_FADE_MS);}
 update(now){
  const elapsed=Math.max(0,now-this.start),fade=Math.min(1,Math.max(0,(elapsed-GLITCH_DURATION_MS+GLITCH_AUDIO_FADE_MS)/GLITCH_AUDIO_FADE_MS));
  const advance=elapsed>=GLITCH_DURATION_MS&&!this.fired;if(advance)this.fired=true;
  return {elapsed,fade,advance};
 }
}
const neutralPatches=new WeakMap();
export function drawGlitchRegion(ctx,source,patch,quadrant,time,bodyMask){
 const r=quadrantRect(quadrant,source.width,source.height);if(!r)return;
 const p=patch.getContext('2d'),t=time/1000;
 let neutral=neutralPatches.get(patch);if(!neutral){neutral=patch.ownerDocument.createElement('canvas');neutral.width=patch.width;neutral.height=patch.height;neutralPatches.set(patch,neutral);}
 const n=neutral.getContext('2d');n.clearRect(0,0,neutral.width,neutral.height);n.filter='grayscale(1) contrast(2.6) brightness(.8)';n.drawImage(source,r.x,r.y,r.w,r.h,0,0,neutral.width,neutral.height);n.filter='none';
 let seed=(Math.floor(time/85)+quadrant*991)|0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 function tint(color){
  p.clearRect(0,0,patch.width,patch.height);p.drawImage(neutral,0,0);
  p.globalCompositeOperation='multiply';p.fillStyle=color;p.fillRect(0,0,patch.width,patch.height);p.globalCompositeOperation='source-over';
 }
 ctx.save();polygonPath(ctx,shardPolygon(quadrant,source.width,source.height));ctx.clip();
 ctx.fillStyle='#04010b';ctx.fillRect(r.x,r.y,r.w,r.h);
 const passes=[['#ed1111',0,.9],['#ff1307',13,.65],['#9c0005',-11,.48],['#ffaf98',3,.45]];
 for(const [color,channel,alpha] of passes){
  tint(color);ctx.globalCompositeOperation=channel?'screen':'source-over';ctx.globalAlpha=alpha;
  for(let y=0;y<patch.height;y+=1.5){
   if(channel===3&&y%12>=3)continue;
   const tear=Math.sin(y*.17+t*19)>.78?Math.sin(y*2.7+t*8)*65:0;
   const shift=Math.sin(y*.075+t*8)*14+Math.sin(y*.29-t*17)*6+tear+channel;
   const h=Math.min(1.5,patch.height-y);
   ctx.drawImage(patch,0,y,patch.width,h,r.x+shift,r.y+y*r.h/patch.height,r.w,h*r.h/patch.height);
  }
 }
 ctx.globalCompositeOperation='source-over';
 if(bodyMask){
  for(let y=0;y<source.height;y+=3){ctx.globalAlpha=.58+.3*(.5+.5*Math.sin(y*.37+t*9));const shift=Math.sin(y*.21+t*7)*4;ctx.drawImage(bodyMask,0,y,source.width,3,shift,y,source.width,3);}
 }
 // Subdivided micro-tiles fracture the picture at different depths.
 for(let i=0;i<110;i++){
  const x=r.x+random()*r.w,y=r.y+random()*r.h,w=6+random()*32,h=1+random()*9;
  ctx.globalAlpha=.25+random()*.4;ctx.drawImage(patch,(x-r.x)/r.w*patch.width,(y-r.y)/r.h*patch.height,w/r.w*patch.width,h/r.h*patch.height,x+(random()-.5)*24,y+(random()-.5)*5,w,h);
 }
 const palette=['#ff001f','#d70c0c','#7b0004','#ff5c46','#ffe1d4','#a80c09','#030000'];
 for(let i=0;i<210;i++){
  const x=r.x+random()*r.w,y=r.y+random()*r.h,w=2+random()**3*65,h=random()<.85?1+random()*2:4+random()*10;
  ctx.fillStyle=palette[Math.floor(random()*palette.length)];ctx.globalAlpha=.2+random()*.65;ctx.fillRect(x,y,w,h);
  if(i%8===0){ctx.globalAlpha=.7;ctx.fillStyle='#030008';ctx.fillRect(x-14,y+3,w*1.7,3);}
 }
 ctx.globalAlpha=.3;ctx.fillStyle='#010008';for(let y=0;y<r.h;y+=4)ctx.fillRect(r.x,r.y+y,r.w,1);
 // Fine colored static remains local to the selected glass shard.
 for(let i=0;i<1000;i++){ctx.globalAlpha=.12+random()*.3;ctx.fillStyle=palette[i%6];ctx.fillRect(r.x+random()*r.w,r.y+random()*r.h,1+random()*2,1);}
 ctx.restore();
}
