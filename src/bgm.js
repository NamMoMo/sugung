export const BGM_VOLUME=.65;
export const BGM_FADE_IN_MS=4000;
export function bgmVolume(scene,elapsed,progress=0,holding=false){
 if(scene!=='main'&&scene!=='photo')return 0;
 return BGM_VOLUME*Math.min(1,Math.max(0,elapsed/BGM_FADE_IN_MS))*(holding?1-Math.min(1,Math.max(0,progress)):1);
}
// One media element survives both scenes. arm() runs in the visitor's click/key
// event so playback is permitted before asynchronous camera setup finishes.
export class BgmController{
 constructor(audio,onError=()=>{}){this.audio=audio;this.onError=onError;audio.loop=true;audio.volume=0;this.active=false;this.armed=false;this.start=null;this.last=null;this.pending=false;}
 arm(){
  this.armed=true;
  if(!this.audio.paused||this.pending)return;
  this.pending=true;
  try{Promise.resolve(this.audio.play()).catch(()=>{this.armed=false;this.onError('음악 재생을 위해 화면을 한 번 클릭해 주세요.');}).finally(()=>{this.pending=false;});}
  catch{this.pending=false;this.armed=false;this.onError('음악을 재생하지 못했습니다.');}
 }
 update({now,scene,progress=0,holding=false}){
  const active=scene==='main'||scene==='photo',dt=this.last===null?16:Math.max(0,Math.min(100,now-this.last));this.last=now;
  if(active&&!this.active){this.start=now;this.audio.currentTime=0;if(this.armed)this.arm();}
  const target=this.armed?bgmVolume(scene,now-(this.start??now),progress,holding):0;
  this.audio.volume=Math.max(0,Math.min(1,this.audio.volume+(target-this.audio.volume)*(1-Math.exp(-dt/150))));
  if(!active&&this.active)this.stopping=true;
  if(active)this.stopping=false;
  if(this.stopping&&this.audio.volume<.002){this.stop();}
  this.active=active;
 }
 stop(){this.audio.pause();this.audio.currentTime=0;this.audio.volume=0;this.active=false;this.armed=false;this.start=null;this.stopping=false;}
}
