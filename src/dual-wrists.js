export function cameraWrist(point,width,height){
 if(!width||!height)return point;
 const cropWidth=Math.min(width,height*16/9),cropHeight=cropWidth*9/16;
 return {...point,x:(point.x*width-(width-cropWidth)/2)/cropWidth,y:(point.y*height-(height-cropHeight)/2)/cropHeight};
}
export class DualWrists{
 constructor(){this.hands=[];}
 update(detected){
  const previous=this.hands;
  this.hands=detected.filter(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)).slice(0,2).map((h,i)=>{
   const id=h.id??`wrist-${i}`,old=previous.find(p=>p.id===id);
   const alpha=old&&Math.hypot(h.x-old.x,h.y-old.y)<.06?.85:.98;
   return {...h,id,x:old?old.x+(h.x-old.x)*alpha:h.x,y:old?old.y+(h.y-old.y)*alpha:h.y};
  });return this.hands;
 }
}
