const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Only face and shoulder landmarks participate. Raised hands cannot shift this frame.
export function upperBodyFrame(points){
 if(!points?.[12])return null;
 const nose=points[0],a=points[11],b=points[12];
 if([nose,a,b].some(p=>(p.visibility??1)<.55||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
 const width=Math.abs(a.x-b.x),shoulderY=(a.y+b.y)/2;
 if(width<.045||shoulderY-nose.y<.035)return null;
 return {x:1-(a.x+b.x)/2,headX:1-nose.x,headY:nose.y,shoulderY,width};
}
// A connected hand is indistinguishable from the head in a person mask.
// Keep the last clear contour while either wrist is in this attachment area.
export function upperBodyOccluded(frame,wrists=[]){
 if(!frame)return false;
 return wrists.some(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&
  Math.abs(p.x-frame.headX)<frame.width*.75+.04&&
  p.y>frame.headY-.22&&p.y<frame.shoulderY+.06);
}
// Read the connected body crossing the head/torso centre, never an isolated hand.
export function upperContour(mask,frame,mirrored=true){
 if(!mask)return [];
 const {width:w,height:h,data}=mask,rows=[];
 const top=Math.max(0,Math.floor((frame.headY-.18)*h)),bottom=Math.min(h-1,Math.ceil((Math.max(frame.shoulderY+.25,.86))*h));
 for(let row=top;row<=bottom;row+=2){
  const y=row/h,mix=clamp((y-frame.headY)/Math.max(.04,frame.shoulderY-frame.headY),0,1),cx=frame.headX*(1-mix)+frame.x*mix;
  const mid=clamp(Math.round((mirrored?1-cx:cx)*w),0,w-1);
  if(data[row*w+mid]<.55)continue;
  let left=mid,right=mid;while(left>0&&data[row*w+left-1]>.55)left--;while(right<w-1&&data[row*w+right+1]>.55)right++;
  const a=mirrored?1-right/w:left/w,b=mirrored?1-left/w:right/w;
  if(cx-a>frame.width*.85+.025||b-cx>frame.width*.85+.025)continue;
  rows.push({y,left:a,right:b});
 }
 return rows;
}
export class UpperBodyLayout {
 constructor(){this.reset();}
 reset(){this.clearRows=[];this.clearFrame=null;this.occluded=false;this.seats=new Map();this.frame={x:.5,headX:.5,headY:.325,shoulderY:.465,width:.19};this.mask=null;this.rows=[];this.lastGood=[];this.warning=false;this.lastInputs=null;}
 update(labels,sizes,observed,dt=16,mask=null,mirrored=true,occluded=false){
  this.occluded=occluded;
  if(this.warning&&this.lastInputs?.labels===labels&&this.lastInputs.mask===mask&&this.lastInputs.observed===observed)return this.lastGood;
  this.lastInputs={labels,mask,observed};
  const snapshot=new Map([...this.seats].map(([id,seat])=>[id,{...seat}]));
  let result=this.plan(labels,sizes,observed,dt,mask,mirrored);
  if(!result){this.seats=new Map();result=this.plan(labels,sizes,null,0,mask,mirrored,true);}
  if(result){this.lastGood=result;this.warning=false;return result;}
  // A cropped/raised silhouette can have too little contour for all labels.
  // Keep the last valid layout without aborting the camera's animation frame.
  this.seats=snapshot;this.warning=true;
  const ids=new Set(labels.map(l=>l.id));
  if(!this.lastGood.length){
   const fallback=new UpperBodyLayout();
   this.lastGood=fallback.plan(labels,sizes,null,16,null,mirrored)||fallback.plan(labels,sizes,null,16,null,mirrored,true)||[];
  }
  this.lastGood=this.lastGood.filter(l=>ids.has(l.id));return this.lastGood;
 }
 plan(labels,sizes,observed,dt=16,mask=null,mirrored=true,repack=false){
  if(observed){const alpha=1-Math.exp(-Math.min(dt,100)/180);for(const k of Object.keys(this.frame))this.frame[k]+=(observed[k]-this.frame[k])*alpha;}
  const f=this.frame,cy=f.headY*.6+f.shoulderY*.4-.006;
  if(mask!==this.mask||observed){
   this.mask=mask;
   if(this.occluded){
    const base=this.clearFrame;
    const sx=base?clamp(f.width/base.width,.7,1.4):1;
    const sy=base?clamp((f.shoulderY-f.headY)/(base.shoulderY-base.headY),.7,1.4):1;
    this.rows=(this.clearRows||[]).map(r=>({y:f.headY+(r.y-base.headY)*sy,left:f.headX+(r.left-base.headX)*sx,right:f.headX+(r.right-base.headX)*sx}));
   }else{
    this.rows=upperContour(mask,f,mirrored);
    if(this.rows.length){this.clearRows=this.rows.map(r=>({...r}));this.clearFrame={...f};}
   }
  }
  const rows=this.rows,headTop=rows.length?rows[0].y:f.headY-.083;
  const ids=new Set(labels.map(l=>l.id));for(const id of this.seats.keys())if(!ids.has(id))this.seats.delete(id);
  const placed=[],occupied=[];
  const usedSlots=new Set([...this.seats.values()].map(s=>s.contourSlot).filter(Number.isInteger));
  function geometry(spec,size){
   const tiltLimit=Math.min(2,180/(size.w*3840));
   const angle=spec.side===0&&!spec.along?0:clamp(spec.angle,-tiltLimit,tiltLimit),r=angle*Math.PI/180;
   const w=size.w*Math.cos(r)+size.h*(2160/3840)*Math.abs(Math.sin(r));
   const h=size.h*Math.cos(r)+size.w*(3840/2160)*Math.abs(Math.sin(r));
   if(spec.side===0){
    if(spec.along){
     const rim=rows.length?rows.reduce((a,b)=>Math.abs(a.y-headTop-.03)<Math.abs(b.y-headTop-.03)?a:b):{left:f.headX-f.width*.23,right:f.headX+f.width*.23,y:headTop+.03};
     const crownWidth=sizes[labels[2]?.id]?.w??.09;
     const edge=spec.along<0?Math.min(rim.left,f.headX-crownWidth/2):Math.max(rim.right,f.headX+crownWidth/2);
     return {...spec,angle,x:edge+spec.along*(w/2+.008),y:headTop-h/2-.006,w,h,anchorX:spec.along<0?rim.left:rim.right,anchorY:rim.y};
    }
    return {...spec,angle,x:f.headX,y:headTop-h/2-.006,w,h,anchorX:f.headX,anchorY:headTop};
   }
   const desired=clamp(cy+spec.dy,headTop+.015,Math.min(.88,Math.max(f.shoulderY+.25,.86)));
   let anchor={y:desired,left:f.x-f.width*.5,right:f.x+f.width*.5};
   if(rows.length)anchor=rows.reduce((a,b)=>Math.abs(a.y-desired)<Math.abs(b.y-desired)?a:b);
   else if(desired<f.shoulderY-.045){const shape=Math.sqrt(Math.max(.1,1-((desired-f.headY)/.09)**2));anchor.left=f.headX-f.width*.23*shape;anchor.right=f.headX+f.width*.23*shape;}
   const band=rows.filter(p=>Math.abs(p.y-anchor.y)<h/2+.008);
   const edge=spec.side<0?anchor.left:anchor.right;
   const contact=band.length?band.reduce((a,b)=>spec.side<0?(a.left<b.left?a:b):(a.right>b.right?a:b)):anchor;
   const envelope=spec.side<0?contact.left:contact.right;
   return {...spec,angle,x:envelope+spec.side*(w/2+.002),y:anchor.y,w,h,anchorX:envelope,anchorY:contact.y};
  }
  const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+.005&&Math.abs(a.y-b.y)<(a.h+b.h)/2+.005;
  const safe=c=>c.x-c.w/2>.018&&c.x+c.w/2<.982&&c.y-c.h/2>.015&&c.y+c.h/2<.94&&!occupied.some(p=>overlaps(c,p));
  for(const label of labels){
   const rawSize=sizes[label.id]||{w:.11,h:.07},size={...rawSize,fontSize:Math.max(64,rawSize.fontSize||66),h:116/2160},old=this.seats.get(label.id),index=label.slot??placed.length;
   let contourSlot=old?.contourSlot;
   if(contourSlot===undefined){contourSlot=0;while(usedSlots.has(contourSlot))contourSlot++;usedSlots.add(contourSlot);}
   const row=Math.floor(Math.max(0,contourSlot-3)/2);
   const base={side:index===6?0:index%2?1:-1,dy:[-.09,-.055,.025,.075,.13,.18,-.1][index%7],lane:0,angle:[-5,4,3,-4,-3,5,1][index%7]};
   const preferred=old?{...old,lane:0}:repack?{...base,side:contourSlot<3?0:(contourSlot-3)%2?1:-1,along:contourSlot<2?(contourSlot===0?-1:1):0,dy:headTop+.055+row*.0645+(contourSlot%2?.019:0)+[0,.0005,-.0005,.0002][row%4]-cy}:base;
   let best=geometry(preferred,size),score=Infinity;
   if(!safe(best)){
    best=null;
    const deltas=[0,-.025,.025,-.05,.05,-.075,.075,-.10,.10,-.14,.14,-.18,.18,-.23,.23,.28,.33,.38,.43,.48];
    for(const side of [preferred.side,...[-1,1,0].filter(s=>s!==preferred.side)])for(const lane of [0])for(const delta of deltas)for(const along of side===0?[0]:[0]){
     if(side===0&&delta!==0)continue;
     const spec={side,dy:preferred.dy+delta,lane,along,angle:side===0?0:preferred.angle};
     const c=geometry(spec,size);if(!safe(c))continue;
     // Keep the title free when labels need an outer lane.

     const cost=Math.abs(delta)*2+lane*2+Math.abs(along)*1.5+(side===preferred.side?0:.22)+(old?Math.hypot(c.x-old.x,c.y-old.y)*3:0);
     if(cost<score){score=cost;best=c;}
    }
   }
   if(!best){
    // Dense words need finer offsets than the normal loose layout. Keep every
    // existing tag in place and search only outward/crown space for this tag.
    const consider=c=>{
     if(!safe(c))return;

     const cost=c.lane*2+Math.abs(c.dy-preferred.dy)+Math.abs(c.along||0);
     if(cost<score){score=cost;best=c;}
    };
    for(const side of [-1,1])for(const lane of [0])for(let dy=-.23;dy<=.48;dy+=.008)consider(geometry({side,lane,dy,angle:preferred.angle},size));
    for(const lane of [0])for(const along of [0])consider(geometry({side:0,lane,along,dy:0,angle:preferred.angle},size));
   }
   if(!best)return null;
   const seat=old||{};Object.assign(seat,best,{contourSlot});this.seats.set(label.id,seat);occupied.push(best);
   placed.push({...label,...size,x:best.x,y:best.y,angle:best.angle,side:best.side,anchorX:best.anchorX,anchorY:best.anchorY});
  }
  return placed;
 }
}





