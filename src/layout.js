export function intersects(a,b,gap=.012){return Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;}
// Search near each contour anchor, then use a second lane when a side gets crowded.
export function separateLabels(labels,sizes={}){
 const placed=[];
 for(const label of labels){
  const {w=.10,h=.075}=sizes[label.id]||{};
  const side=label.side|| (label.x<.5?-1:1);
  let best=null,bestScore=Infinity;
  for(const dx of [0,side*.095,-side*.07,side*.18,-side*.15])for(const dy of [0,-.085,.085,-.17,.17,-.255,.255,-.34,.34]){
   const x=Math.max(.26+w/2,Math.min(.81-w/2,label.x+dx));
   const y=Math.max(.20+h/2,Math.min(.81-h/2,label.y+dy));
   const c={...label,x,y,w,h};
   const hits=placed.filter(p=>intersects(c,p)).length;
   const score=hits*1000+Math.abs(x-label.x)*1.2+Math.abs(y-label.y);
   if(score<bestScore){best=c;bestScore=score;}
  }
  placed.push(best);
 }
 const hasOverlap=placed.some((a,i)=>placed.slice(0,i).some(b=>intersects(a,b,0)));
 if(!hasOverlap)return placed;
 // A crowded contour needs extra lanes. Reserve non-overlapping cells, assigning
 // the nearest free cell to each original anchor instead of stacking tags.
 const maxW=Math.max(...placed.map(l=>l.w)),maxH=Math.max(...placed.map(l=>l.h));
 const columns=Math.max(1,Math.min(4,Math.floor(.70/(maxW+.012))));
 const rows=Math.ceil(labels.length/columns),cellW=.70/columns,cellH=Math.max(maxH+.008,.69/rows);
 const cells=[];for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)cells.push({x:.24+cellW*(col+.5),y:.13+cellH*(row+.5)});
 return placed.map(label=>{
  cells.sort((a,b)=>Math.hypot(a.x-label.x,(a.y-label.y)*1.1)-Math.hypot(b.x-label.x,(b.y-label.y)*1.1));
  return {...label,...cells.shift(),angle:0,packed:true};
 });
}
// Prefer the current dwell target while it remains under the hand; otherwise nearest centre.
export function pickLabel(point,labels,preferred){
 const candidates=labels.filter(l=>Math.abs(point.x-l.x)<=l.w/2+.006&&Math.abs(point.y-l.y)<=l.h/2+.009);
 const locked=candidates.find(l=>l.id===preferred);if(locked)return locked.id;
 candidates.sort((a,b)=>Math.hypot((point.x-a.x)/a.w,(point.y-a.y)/a.h)-Math.hypot((point.x-b.x)/b.w,(point.y-b.y)/b.h));
 return candidates[0]?.id||null;
}
// Session anchors never depend on the live mask. Existing tags never reflow.
export class StableLabelLayout {
 constructor(){this.positions=new Map();}
 reset(){this.positions.clear();}
 update(labels,proposals,sizes={}){
  const ids=new Set(labels.map(l=>l.id));for(const id of this.positions.keys())if(!ids.has(id))this.positions.delete(id);
  for(const label of labels){
   if(this.positions.has(label.id))continue;
   const proposal=proposals.find(p=>p.id===label.id)||{x:.5,y:.4,angle:0,side:1};
   const {w=.11,h=.08}=sizes[label.id]||{};
   let best=null,score=Infinity;
   // Reserve enough room for the maximum 12-character label even when today's
   // label is short. Adding long words cannot fragment space or displace others.
   const occupied=new Set([...this.positions.values()].map(p=>p.seat));
   const candidates=[];for(let row=0;row<6;row++)for(let col=0;col<3;col++){
    const seat=row*3+col;if(!occupied.has(seat))candidates.push({x:[.36,.56,.76][col]+(row%2?.006:-.004),y:.19+row*.115,seat});
   }
   for(const c of candidates){
    const item={...proposal,...label,...c,w,h,angle:0};
    if([...this.positions.values()].some(p=>intersects(item,p,.009)))continue;
    const distance=Math.hypot(c.x-proposal.x,(c.y-proposal.y)*1.25);
    if(distance<score){score=distance;best=item;}
   }
   // With at most 17 two-line labels the reserved region has ample capacity.
   if(!best)throw new Error('키워드 배치 공간이 부족합니다.');
   this.positions.set(label.id,best);
  }
  return labels.map(l=>({...l,...this.positions.get(l.id)}));
 }
}
