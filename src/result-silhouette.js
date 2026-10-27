import {smoothMask} from './mask.js';

// 07 owns a separate live mask. It can never replace the fixed artwork in 06.
export class ResultSilhouette {
 constructor(){this.reset();}
 reset(){this.mask=null;this.at=-Infinity;this.frame=null;}
 update(source,now){
  if(!source?.width||!source?.height||source.data?.length!==source.width*source.height)return false;
  let minX=source.width,maxX=0,minY=source.height,maxY=0,count=0;
  for(let i=0;i<source.data.length;i++)if(source.data[i]>.65){
   const x=i%source.width,y=Math.floor(i/source.width);count++;
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  if(count<source.data.length*.01)return false;
  this.mask={...smoothMask(source,this.mask),mirrored:true};this.at=now;
  const x=1-(minX+maxX)/(2*source.width),y=minY/source.height,h=(maxY-minY)/source.height,w=(maxX-minX)/source.width;
  this.frame={x,headX:x,headY:y+h*.16,shoulderY:y+h*.34,width:w*.85};
  return true;
 }
 fresh(now){return !!this.mask&&now-this.at<1500;}
}
