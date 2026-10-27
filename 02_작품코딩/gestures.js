(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.WaveGestures=value;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const mean=points=>({x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
  function describe(landmarks){
    if(!Array.isArray(landmarks)||landmarks.length!==21||landmarks.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
    const palm=mean([0,5,9,13,17].map(i=>landmarks[i]));
    const scale=Math.max(.025,distance(landmarks[5],landmarks[17]));
    const folded=[8,12,16,20].filter(tip=>distance(landmarks[tip],landmarks[0])<distance(landmarks[tip-2],landmarks[0])*1.12).length;
    const fist=folded>=3;
    return {palm,scale,fist,point:fist?palm:landmarks[8]};
  }
  class Tracker{
    constructor(){this.reset();}
    reset(){this.tracks=[];this.nextId=0;this.clapArmed=false;this.previousSeparation=null;this.lastClap=-Infinity;this.lastTime=null;}
    update(hands,now){
      if(this.lastTime!==null&&(now-this.lastTime>400||now<this.lastTime))this.reset();
      this.lastTime=now;
      const previous=this.tracks.slice(),used=new Set(),events=[];
      this.tracks=(hands||[]).slice(0,2).map(describe).filter(Boolean).map(hand=>{
        let match=-1,best=.24;
        previous.forEach((old,i)=>{const d=distance(old.palm,hand.palm);if(!used.has(i)&&d<best){best=d;match=i;}});
        const old=match<0?null:previous[match];if(match>=0)used.add(match);
        const track={...hand,id:old?.id??this.nextId++,candidateSince:hand.fist?(old?.fist?old.candidateSince:now):null,armed:old?.armed??false,lastFist:old?.lastFist??-Infinity};
        // A closed hand appearing in view is not a click: show an open hand to arm it.
        if(!hand.fist)track.armed=true;
        if(hand.fist&&track.armed&&now-track.candidateSince>=90&&now-track.lastFist>=550){events.push({type:'fist',...hand.point,id:track.id});track.armed=false;track.lastFist=now;}
        return track;
      });
      if(this.tracks.length===2){
        const [a,b]=this.tracks,sep=distance(a.palm,b.palm)/((a.scale+b.scale)/2);
        if(sep>2.5)this.clapArmed=true;
        if(this.clapArmed&&sep<1.45&&this.previousSeparation!==null&&this.previousSeparation>sep+.08&&now-this.lastClap>=800){events.length=0;events.push({type:'clap',...mean([a.palm,b.palm])});this.lastClap=now;this.clapArmed=false;}
        this.previousSeparation=sep;
      }else{this.previousSeparation=null;this.clapArmed=false;}
      return {hands:this.tracks.map(h=>({id:h.id,x:1-h.point.x,y:h.point.y,fist:h.fist})),events:events.map(e=>({...e,x:1-e.x}))};
    }
  }
  return {Tracker,describe};
});
