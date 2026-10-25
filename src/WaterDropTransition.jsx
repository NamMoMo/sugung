import React,{useEffect,useRef} from 'react';
import {drawWaterTransition,WATER_DURATION_MS} from './water-transition.js';
export default function WaterDropTransition(){
 const ref=useRef(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas.getContext('2d');ctx.scale(3,3);
  const start=performance.now();let raf;
  function draw(now){drawWaterTransition(ctx,now-start);if(now-start<WATER_DURATION_MS)raf=requestAnimationFrame(draw);}
  raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
 },[]);
 return <canvas ref={ref} width="3840" height="2160" className="water-transition" data-testid="scene-flash" aria-label="빛나는 물방울과 수면 파동 전환"/>;
}
