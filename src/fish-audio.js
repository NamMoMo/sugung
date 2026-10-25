export const FISH_VOLUME=.85;
export const FISH_FADE_MS=850;
export class FishAudioController{
 constructor(audio,onError=()=>{},{volume=FISH_VOLUME,loop=false,limit=25}={}){this.audio=audio;this.onError=onError;this.volume=volume;this.limit=limit;this.generation=0;this.active=false;this.fade=null;audio.volume=0;audio.loop=loop;}
 prime(){
  if(this.active)return;const version=this.generation;this.audio.volume=0;
  this.audio.play()?.then(()=>{if(version===this.generation&&!this.active){this.audio.pause();this.audio.currentTime=0;}}).catch(()=>{});
 }
 async start(){
  const version=++this.generation;this.active=true;this.fade=null;this.audio.currentTime=0;this.audio.volume=this.volume;
  try{await this.audio.play();return true;}catch(e){if(version===this.generation){this.active=false;this.audio.volume=0;this.onError(e);}return false;}
 }
 fadeOut(now){if(this.active&&!this.fade)this.fade={at:now,from:this.audio.volume};}
 transition(progress){if(!this.active)return;this.audio.volume=Math.min(this.audio.volume,this.volume*(1-Math.min(1,Math.max(0,progress))));if(progress>=1)this.stop();}
 tick(now){
  if(this.active&&this.audio.currentTime>=this.limit){this.stop();return;}
  if(this.active&&this.audio.currentTime>this.limit-.35)this.audio.volume=Math.min(this.audio.volume,this.volume*(this.limit-this.audio.currentTime)/.35);
  if(!this.fade)return;const p=Math.min(1,Math.max(0,(now-this.fade.at)/FISH_FADE_MS));this.audio.volume=Math.min(this.audio.volume,this.fade.from*(1-p));if(p>=1)this.stop();
 }
 stop(){this.generation++;this.active=false;this.fade=null;this.audio.pause();this.audio.currentTime=0;this.audio.volume=0;}
}
