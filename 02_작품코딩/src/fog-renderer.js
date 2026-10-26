import { FogField } from "./fog-field.js";

function makeNoise(){
  const size=128,map=new Float32Array(size*size);
  let seed=73421;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const [grid,amplitude] of [[4,.48],[8,.27],[16,.15],[32,.07],[64,.03]]){
    const points=Float32Array.from({length:grid*grid},rand);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const gx=x/size*grid,gy=y/size*grid,ix=Math.floor(gx),iy=Math.floor(gy);
      const tx=gx-ix,ty=gy-iy,fx=tx*tx*(3-2*tx),fy=ty*ty*(3-2*ty);
      const a=points[iy*grid+ix],b=points[iy*grid+(ix+1)%grid],c=points[((iy+1)%grid)*grid+ix],d=points[((iy+1)%grid)*grid+(ix+1)%grid];
      map[y*size+x]+=((a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy)*amplitude;
    }
  }
  return map;
}
const noise=makeNoise();
const grain=(x,y)=>noise[(((Math.floor(y)%128)+128)%128)*128+((Math.floor(x)%128+128)%128)];

export function createFogRenderer(canvas,{variant="entrance",reduced=false,onError=()=>{}}={}){
  const ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)return null;
  const field=new FogField();
  const texture=document.createElement("canvas"),paint=texture.getContext("2d");
  if(!paint)return null;
  let image,width=1,height=1,rw=1,rh=1,frame,last=0,time=0,disposed=false,dispersing=false,failed=false;
  const purple=variant==="escape";
  const puff=document.createElement("canvas");puff.width=puff.height=128;
  const puffCtx=puff.getContext("2d");
  if(!puffCtx)return null;
  const gradient=puffCtx.createRadialGradient(64,64,0,64,64,64);
  const rgb=purple?"178,146,207":"163,178,188";
  gradient.addColorStop(0,`rgba(${rgb},.28)`);gradient.addColorStop(.35,`rgba(${rgb},.15)`);gradient.addColorStop(1,`rgba(${rgb},0)`);
  puffCtx.fillStyle=gradient;puffCtx.fillRect(0,0,128,128);
  function drawFrame(){
    const data=image.data;
    for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
      const u=x/(rw-1),v=y/(rh-1),i=(y*rw+x)*4;
      const den=field.sample(field.density,u,v),vx=field.sample(field.vx,u,v),vy=field.sample(field.vy,u,v);
      // Two large, quiet layers: no surf crests, ground smoke or hard circular holes.
      const n=grain(u*150+time*1.1+vx*70,v*105+time*.4+vy*70);
      const fine=grain(u*310-time*.65+vx*90,v*220+time*.3+vy*90);
      const light=Math.exp(-((u-.5)**2*10+v*v*4));
      const shade=(n-.5)*35+(fine-.5)*9;
      data[i]=(purple?118:118)+shade+light*19;
      data[i+1]=(purple?86:137)+shade+light*17;
      data[i+2]=(purple?151:151)+shade+light*12;
      data[i+3]=Math.round(Math.min(.99,(.87+n*.17)*Math.pow(den,.85))*255);
    }
    paint.putImageData(image,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(texture,0,0,canvas.width,canvas.height);
    if(!reduced)for(const p of field.puffs){
      const r=p.r*Math.min(width,height),fade=Math.sin(Math.PI*p.age/p.life);
      ctx.globalAlpha=Math.max(0,fade*.8);
      ctx.drawImage(puff,p.x*canvas.width-r,p.y*canvas.height-r,r*2,r*2);
    }
    ctx.globalAlpha=1;
  }
  function render(){ try { drawFrame(); } catch(error) { failed=true; onError(error); } }
  function resize(){
    const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);
    // Fog is inherently soft; bounded fill resolution keeps the kiosk's touch response light.
    rw=Math.min(420,Math.max(180,Math.round(width*.25)));rh=Math.max(100,Math.round(rw*height/width));
    if(rh>300){rw=Math.round(rw*300/rh);rh=300;}
    texture.width=rw;texture.height=rh;image=paint.createImageData(rw,rh);
    canvas.width=Math.round(width);canvas.height=Math.round(height);render();
  }
  function tick(now){
    if(disposed || failed)return;
    if(now-last>=40){const dt=last?Math.min(.06,(now-last)/1000):.04;last=now;
      if(!reduced){time+=dt;field.step(dt,dispersing);}render();
    }
    frame=requestAnimationFrame(tick);
  }
  resize();if(failed)return null;if(!reduced)frame=requestAnimationFrame(tick);
  const visibility=()=>{last=0;};document.addEventListener("visibilitychange",visibility);
  return {
    push(from,to){const progress=field.push(from,to,width/height);if(reduced){field.puffs=[];render();}return progress;},
    disperse(){dispersing=true;},resize,
    dispose(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener("visibilitychange",visibility);},
  };
}
