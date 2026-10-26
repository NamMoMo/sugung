const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

// A soft density/velocity field: the hand displaces vapor, never cuts a canvas mask.
export class FogField {
  constructor(cols=72,rows=42){
    this.cols=cols;this.rows=rows;
    this.density=new Float32Array(cols*rows).fill(1);
    this.vx=new Float32Array(cols*rows);this.vy=new Float32Array(cols*rows);
    this.spare=new Float32Array(cols*rows);this.puffs=[];this.touched=new Set();this.progress=0;
  }
  push(from,to,aspect=16/9){
    const dx=to.x-from.x,dy=to.y-from.y;
    const distance=Math.hypot(dx*aspect,dy);
    // A stationary finger barely stirs the air; a sweep creates sustained momentum.
    const force=clamp(distance*16,.06,.85),radius=.18;
    const nx=distance ? dx/distance : .08,ny=distance ? dy/distance : -.12;
    const steps=Math.min(24,Math.max(1,Math.ceil(distance/.035)));
    for(let s=0;s<=steps;s++){
      const px=from.x+dx*s/steps,py=from.y+dy*s/steps;
      for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
        const i=y*this.cols+x,ox=((x+.5)/this.cols-px)*aspect,oy=(y+.5)/this.rows-py;
        const d=Math.hypot(ox,oy);
        if(d>=radius)continue;
        const weight=Math.pow(1-d/radius,2);
        this.density[i]=Math.max(.03,this.density[i]-weight*force*.6);
        this.vx[i]=clamp(this.vx[i]+(nx*.18+ox*.22)*weight*force,-.65,.65);
        this.vy[i]=clamp(this.vy[i]+(ny*.18+oy*.22)*weight*force,-.65,.65);
        if(d<.105 && distance>.002)this.touched.add(i);
      }
    }
    if(distance>.002){
      const count=Math.min(5,Math.max(1,Math.ceil(distance*24)));
      for(let k=0;k<count;k++){
        const phase=(this.puffs.length*2.399+k)*1.7;
        this.puffs.push({x:to.x,y:to.y,vx:nx*(.16+k*.025)+Math.cos(phase)*.035/aspect,vy:ny*(.16+k*.025)+Math.sin(phase)*.035,r:.1,life:1.35,age:0});
      }
      if(this.puffs.length>64)this.puffs.splice(0,this.puffs.length-64);
    }
    this.progress=Math.max(this.progress,Math.min(100,Math.round(this.touched.size/(this.cols*this.rows*.32)*100)));
    return this.progress;
  }
  step(dt,dispersing=false){
    dt=clamp(dt,0,.08);
    const {cols,rows,density,vx,vy,spare}=this;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=y*cols+x;
      const left=density[y*cols+Math.max(0,x-1)],right=density[y*cols+Math.min(cols-1,x+1)];
      const up=density[Math.max(0,y-1)*cols+x],down=density[Math.min(rows-1,y+1)*cols+x];
      // Edges keep softening and drifting after the finger is lifted.
      const diffusion=(left+right+up+down-density[i]*4)*dt*2.5;
      const advection=-((right-left)*vx[i]*cols+(down-up)*vy[i]*rows)*dt*.18;
      spare[i]=clamp(density[i]+diffusion+advection-(dispersing?dt*.9:Math.hypot(vx[i],vy[i])*dt*.45));
      vx[i]*=Math.exp(-dt*1.4);vy[i]*=Math.exp(-dt*1.4);
    }
    this.density=spare;this.spare=density;
    for(const p of this.puffs){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*.7);p.vy*=Math.exp(-dt*.7);p.r+=dt*.045;p.age+=dt;}
    this.puffs=this.puffs.filter(p=>p.age<p.life);
  }
  sample(array,u,v){
    const x=clamp(u)*(this.cols-1),y=clamp(v)*(this.rows-1),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const a=array[iy*this.cols+ix],b=array[iy*this.cols+Math.min(this.cols-1,ix+1)];
    const c=array[Math.min(this.rows-1,iy+1)*this.cols+ix],d=array[Math.min(this.rows-1,iy+1)*this.cols+Math.min(this.cols-1,ix+1)];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
}
