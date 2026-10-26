import {LIMIT} from './interaction.js';
import { smoothMask,maskAlpha } from './mask.js';
import {createLightEffects} from './light-effects.js';
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
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  const outlineCanvas=document.createElement('canvas'),outlineCtx=outlineCanvas.getContext('2d');
  const tintCanvas = document.createElement('canvas'); tintCanvas.width = W; tintCanvas.height = H;
  const tc = tintCanvas.getContext('2d');
  const stars = Array.from({length: 85}, (_,i) => ({ x: ((i * 7919) % 1280), y: ((i * 3571) % 720), s: .5 + (i % 4) / 2 }));
  let latestMask = null, box = {x: .31, y:.19,w:.38,h:.68};
  function updateMask(mask) {
    mask=smoothMask(mask,latestMask);
    latestMask = mask;
    maskCanvas.width = mask.width; maskCanvas.height = mask.height;
    const img = maskCtx.createImageData(mask.width, mask.height);
    outlineCanvas.width=mask.width;outlineCanvas.height=mask.height;const outline=outlineCtx.createImageData(mask.width,mask.height);
    let minX = mask.width, maxX = 0, minY = mask.height, maxY = 0, pixels = 0;
    for (let i = 0; i < mask.data.length; i++) {
      const alpha = maskAlpha(mask.data[i]);
      img.data[i*4] = img.data[i*4+1] = img.data[i*4+2] = 255;
      img.data[i*4+3] = alpha * 255;
      outline.data[i*4]=238;outline.data[i*4+1]=211;outline.data[i*4+2]=158;outline.data[i*4+3]=4*alpha*(1-alpha)*230;
      if (mask.data[i] > .7) { const x=i % mask.width, y=Math.floor(i / mask.width); minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);pixels++; }
    }
    maskCtx.putImageData(img,0,0);
    canvas.dataset.maskCoverage=String(pixels/mask.data.length);
    canvas.dataset.maskFrames=String(Number(canvas.dataset.maskFrames||0)+1);
    outlineCtx.putImageData(outline,0,0);
    if (pixels > mask.data.length * .025) {
      const next = {x:1-maxX/mask.width,y:minY/mask.height,w:(maxX-minX)/mask.width,h:(maxY-minY)/mask.height};
      for (const k of Object.keys(box)) box[k] += (next[k]-box[k]) * .1;
    }
  }
  function bodyPath(c) {
    c.beginPath();c.ellipse(640,239,47,61,0,0,Math.PI*2);c.fill();
    c.beginPath();c.moveTo(604,298);c.bezierCurveTo(568,308,548,330,536,375);c.lineTo(501,480);c.quadraticCurveTo(494,500,512,507);c.quadraticCurveTo(531,514,538,492);c.lineTo(581,393);c.lineTo(578,485);c.lineTo(573,627);c.quadraticCurveTo(589,647,610,632);c.lineTo(635,503);c.lineTo(650,503);c.lineTo(669,632);c.quadraticCurveTo(692,648,708,630);c.lineTo(704,483);c.lineTo(700,394);c.lineTo(744,492);c.quadraticCurveTo(754,516,773,505);c.quadraticCurveTo(789,495,776,477);c.lineTo(741,373);c.bezierCurveTo(729,331,709,306,674,298);c.closePath();c.fill();
  }
  function drawBodyShape(c, demo) {
    if (demo) bodyPath(c);
    else if (latestMask) { c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(W,0);c.scale(-1,1);c.drawImage(maskCanvas,0,0,W,H);c.restore(); }
  }
  const demoCanvas=document.createElement('canvas');demoCanvas.width=640;demoCanvas.height=360;
  const dc=demoCanvas.getContext('2d');dc.scale(.5,.5);dc.fillStyle='white';bodyPath(dc);
  const demoPixels=dc.getImageData(0,0,640,360).data;
  const demoData=new Float32Array(640*360);for(let i=0;i<demoData.length;i++)demoData[i]=demoPixels[i*4+3]/255;
  const demoMask={data:demoData,width:640,height:360};
  function draw({ time, count, demo, bursts, phase, bodyFrame }) {
    canvas.dataset.renderTime=String(time);
    const p = Math.min(1,count/LIMIT), t=time/1000;
    const final=phase==='photo',center=bodyFrame?{x:bodyFrame.x,y:bodyFrame.shoulderY+.105}:{x:.5,y:.565};
    ctx.clearRect(0,0,W,H);
    for (const s of stars) {ctx.globalAlpha=.15+.28*(.5+.5*Math.sin(t*.6+s.x));ctx.fillStyle=s.x%2?'#e8c987':'#75c9ee';ctx.beginPath();ctx.arc(s.x,(s.y-t*4+H*10)%H,s.s,0,7);ctx.fill();} ctx.globalAlpha=1;
    if(final)effects.rays(ctx,time,center,W,H);
    // Figma main_BG remains the original static image beneath this transparent layer.
    // Dark body gradually fills with warm light; glow uses a silhouette shadow only.
    tc.clearRect(0,0,W,H);tc.fillStyle='white';drawBodyShape(tc,demo);
    ctx.save();ctx.globalAlpha=.2+p*.65;ctx.shadowColor=p>.35?'#f5cf81':'#537d9a';ctx.shadowBlur=final?18:2+p*7;ctx.drawImage(tintCanvas,0,0);
    if(final){ctx.globalAlpha=.22;ctx.shadowBlur=36;ctx.drawImage(tintCanvas,0,0);}ctx.restore();
    tc.globalCompositeOperation='source-in';const fill=tc.createLinearGradient(0,170,0,650);const shade=Math.round(12+p*201);fill.addColorStop(0,`rgb(${shade+12},${shade+10},${Math.max(25,shade-10)})`);fill.addColorStop(.55,`rgb(${shade},${shade+5},${Math.max(23,shade-8)})`);fill.addColorStop(1,`rgb(${Math.max(8,shade-33)},${Math.max(16,shade-25)},${Math.max(22,shade-38)})`);tc.fillStyle=fill;tc.fillRect(0,0,W,H);
    tc.globalCompositeOperation='source-atop';
    for(let i=0;i<80*p;i++){const x=480+((i*193)%330),y=210+((i*97+t*16) % 420);tc.fillStyle=`rgba(255,219,143,${.2+p*.5})`;tc.beginPath();tc.arc(x,y,1+(i%3)*.5,0,7);tc.fill();}
    tc.globalCompositeOperation='source-over';ctx.drawImage(tintCanvas,0,0);
    if(!demo&&latestMask){ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.globalAlpha=.5+.5*p;ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(outlineCanvas,0,0,W,H);ctx.restore();}
    if(final){effects.updateContour(demo?demoMask:latestMask,!demo);effects.aura(ctx,time,center,W,H);}
    if (phase==='opening') {ctx.fillStyle='#03091766';ctx.fillRect(0,0,W,H);}
    effects.drawDust(ctx,bursts,time,W,H);
  }
  return {draw,updateMask,get box(){return box;},get mask(){return latestMask;},demoMask,reset(){latestMask=null;box={x:.31,y:.19,w:.38,h:.68};}};
}
