// Small spatial filter removes pixel steps; adaptive temporal filtering reduces edge shimmer.
export function smoothMask(mask,previous){
 const {width:w,height:h,data}=mask,tmp=new Float32Array(data.length),out=new Float32Array(data.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let sum=0;for(let d=-2;d<=2;d++)sum+=data[y*w+Math.max(0,Math.min(w-1,x+d))];tmp[y*w+x]=sum/5;
 }
 const usePrevious=previous?.width===w&&previous?.height===h;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let sum=0;for(let d=-2;d<=2;d++)sum+=tmp[Math.max(0,Math.min(h-1,y+d))*w+x];
  const i=y*w+x,value=sum/5,old=usePrevious?previous.data[i]:value;
  const alpha=Math.abs(value-old)>.35?.9:.28;
  out[i]=old+(value-old)*alpha;
 }
 return {width:w,height:h,data:out};
}
export function maskAlpha(confidence){const t=Math.max(0,Math.min(1,(confidence-.46)/.08));return t*t*(3-2*t);}
