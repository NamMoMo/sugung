import {maskAlpha} from './mask.js';
// Black pixels with foreground alpha; camera mirroring is applied when drawn.
export function bodyMaskPixels(mask){
 const rgba=new Uint8ClampedArray(mask.width*mask.height*4);
 for(let i=0;i<mask.data.length;i++)rgba[i*4+3]=Math.round(maskAlpha(mask.data[i])*255);
 return rgba;
}
