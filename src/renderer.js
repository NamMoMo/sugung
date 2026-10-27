import {LIMIT} from './interaction.js';
import {FIXED_BUST_PATH,FIXED_BUST_FRAME,FIXED_BUST_BOUNDS,createFixedBustMask,drawFixedBust} from './fixed-silhouette.js';
import {createLightEffects} from './light-effects.js';
import {ResultSilhouette} from './result-silhouette.js';
import {maskAlpha} from './mask.js';
export const W = 1280, H = 720;
export const OUTPUT_W = 3840, OUTPUT_H = 2160;
const slots = [
  [-1,.18,.035,-8],[1,.30,.04,6],[-1,.43,.045,-4],[1,.53,.055,9],[-1,.65,.03,-7],[1,.76,.04,4],[-1,.86,.035,-5],
  [1,.12,.022,5],[-1,.31,.06,-10],[1,.42,.065,7],[-1,.54,.055,4],[1,.65,.065,-6],[-1,.75,.055,8],[1,.86,.055,6],
  [-1,.08,.025,-4],[1,.94,.05,-7],[0,.04,0,-4],
];
export function labelPosition(label, box, mask) {
  const [side, height, distance, angle] = slots[label.slot % slots.length];
  const y = Math.max(.23, Math.min(.79,box.y + box.h * height));
  let edge = box.x + box.w * (side<0?.17:.83);
  if (mask) {
    const row=Math.max(0,Math.min(mask.height-1,Math.round(y*mask.height)));
    const xs=[];
    for(let x=0;x<mask.width;x++)if(mask.data[row*mask.width+x]>.65)xs.push(1-x/mask.width);
    if(xs.length>4)edge=side<0?xs[xs.length-1]:xs[0];
  }
  const x=side===0?box.x+box.w*.5:Math.max(.27,Math.min(.76,edge+side*distance));
  return {x,y,angle,side,anchorX:edge};
}
export function createRenderer(canvas) {
  const effects=createLightEffects();
  canvas.width = OUTPUT_W; canvas.height = OUTPUT_H;
  const ctx = canvas.getContext('2d');
  ctx.scale(3,3);
  const tintCanvas = document.createElement('canvas'); tintCanvas.width = W; tintCanvas.height = H;
  const tc = tintCanvas.getContext('2d');
  const stars = Array.from({length: 85}, (_,i) => ({ x: ((i * 7919) % 1280), y: ((i * 3571) % 720), s: .5 + (i % 4) / 2 }));
  const fixedPath=new Path2D(FIXED_BUST_PATH),fixedMask=createFixedBustMask();
  const result=new ResultSilhouette(),liveCanvas=document.createElement('canvas'),outlineCanvas=document.createElement('canvas');
  const liveContext=liveCanvas.getContext('2d'),outlineContext=outlineCanvas.getContext('2d');
  function updateResultMask(mask,now){
    if(!result.update(mask,now))return;
    const m=result.mask;liveCanvas.width=outlineCanvas.width=m.width;liveCanvas.height=outlineCanvas.height=m.height;
    const pixels=liveContext.createImageData(m.width,m.height),outline=outlineContext.createImageData(m.width,m.height);
    for(let i=0;i<m.data.length;i++){
      const alpha=maskAlpha(m.data[i]);pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;pixels.data[i*4+3]=alpha*255;
      outline.data[i*4]=242;outline.data[i*4+1]=211;outline.data[i*4+2]=154;outline.data[i*4+3]=4*alpha*(1-alpha)*230;
    }
    liveContext.putImageData(pixels,0,0);outlineContext.putImageData(outline,0,0);
    canvas.dataset.resultMaskFrames=String(Number(canvas.dataset.resultMaskFrames||0)+1);
  }
  function drawLive(context,image=liveCanvas){context.save();context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.translate(W,0);context.scale(-1,1);context.drawImage(image,0,0,W,H);context.restore();}
  const box={x:FIXED_BUST_BOUNDS.x/W,y:FIXED_BUST_BOUNDS.y/H,w:FIXED_BUST_BOUNDS.width/W,h:FIXED_BUST_BOUNDS.height/H};
  canvas.dataset.silhouette='fixed-adult-bust';
  function draw({ time, count, bursts, phase, bodyFrame,liveResult=false }) {
    canvas.dataset.renderTime=String(time);
    const live=phase==='photo'&&liveResult,bodyReady=!live||!!result.mask;
    canvas.dataset.silhouette=live?(result.mask?'live-result':'waiting-for-person'):'fixed-adult-bust';
    const p = Math.min(1,count/LIMIT), t=time/1000;
    const final=phase==='photo',center=bodyFrame?{x:bodyFrame.x,y:bodyFrame.shoulderY+.105}:{x:.5,y:.565};
    ctx.clearRect(0,0,W,H);
    for (const s of stars) {ctx.globalAlpha=.15+.28*(.5+.5*Math.sin(t*.6+s.x));ctx.fillStyle=s.x%2?'#e8c987':'#75c9ee';ctx.beginPath();ctx.arc(s.x,(s.y-t*4+H*10)%H,s.s,0,7);ctx.fill();} ctx.globalAlpha=1;
    if(final&&bodyReady)effects.rays(ctx,time,center,W,H);
    // Figma main_BG remains the original static image beneath this transparent layer.
    // Dark body gradually fills with warm light; glow uses a silhouette shadow only.
    tc.clearRect(0,0,W,H);tc.fillStyle='white';if(live){if(result.mask)drawLive(tc);}else drawFixedBust(tc,fixedPath);
    ctx.save();ctx.globalAlpha=.2+p*.65;ctx.shadowColor=p>.35?'#f5cf81':'#537d9a';ctx.shadowBlur=final?18:2+p*7;ctx.drawImage(tintCanvas,0,0);
    if(final){ctx.globalAlpha=.22;ctx.shadowBlur=36;ctx.drawImage(tintCanvas,0,0);}ctx.restore();
    tc.globalCompositeOperation='source-in';const fill=tc.createLinearGradient(0,170,0,650);const shade=Math.round(12+p*201);fill.addColorStop(0,`rgb(${shade+12},${shade+10},${Math.max(25,shade-10)})`);fill.addColorStop(.55,`rgb(${shade},${shade+5},${Math.max(23,shade-8)})`);fill.addColorStop(1,`rgb(${Math.max(8,shade-33)},${Math.max(16,shade-25)},${Math.max(22,shade-38)})`);tc.fillStyle=fill;tc.fillRect(0,0,W,H);
    tc.globalCompositeOperation='source-atop';
    for(let i=0;i<80*p;i++){const x=480+((i*193)%330),y=210+((i*97+t*16) % 420);tc.fillStyle=`rgba(255,219,143,${.2+p*.5})`;tc.beginPath();tc.arc(x,y,1+(i%3)*.5,0,7);tc.fill();}
    tc.globalCompositeOperation='source-over';ctx.drawImage(tintCanvas,0,0);
    ctx.save();ctx.strokeStyle='#f2d39a';ctx.globalAlpha=.12+p*.6;ctx.lineWidth=1;ctx.shadowColor='#edcb85';ctx.shadowBlur=final?20:2+p*5;
    if(live){if(result.mask)drawLive(ctx,outlineCanvas);}else{ctx.translate(FIXED_BUST_BOUNDS.x,FIXED_BUST_BOUNDS.y);ctx.scale(FIXED_BUST_BOUNDS.width/425,FIXED_BUST_BOUNDS.height/400);ctx.stroke(fixedPath);}ctx.restore();
    if(final&&bodyReady){effects.updateContour(live?result.mask:fixedMask,live);effects.aura(ctx,time,center,W,H);}
    if (phase==='opening') {ctx.fillStyle='#03091766';ctx.fillRect(0,0,W,H);}
    effects.drawDust(ctx,bursts,time,W,H);
  }
  return {draw,updateResultMask,resetResult(){result.reset();},get resultMask(){return result.mask;},get resultFrame(){return result.frame;},resultFresh:now=>result.fresh(now),box,frame:FIXED_BUST_FRAME,mask:fixedMask,demoMask:fixedMask,reset(){result.reset();}};
}
