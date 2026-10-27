export const ENDING_BGM_FADE_MS=3000;
export const ENDING_VOICE_RATE=1.3;
export const CRACK_REVEAL_LEAD_SECONDS=3;
export function narrationAllowsCracks(audio){
 if(narrationHasFinished(audio))return true;
 if(!Number.isFinite(audio.duration)||audio.duration<=0||audio.paused||audio.seeking)return false;
 return (audio.duration-audio.currentTime)/(audio.playbackRate||ENDING_VOICE_RATE)<=CRACK_REVEAL_LEAD_SECONDS;
}
export function narrationHasFinished(audio){
 return !audio.seeking&&Number.isFinite(audio.duration)&&audio.duration>0&&audio.currentTime>=audio.duration-.08;
}
export class EndingNarration {
 constructor(audio){this.audio=audio;this.started=false;this.run=null;this.pending=false;this.lastAttempt=-Infinity;this.epoch=0;}
 enter(scene,run,onError=()=>{}){
  if(this.run!==run){this.stop();this.run=run;}
  if(!['endingPrelude','ending'].includes(scene)){this.stop();return;}
  const audio=this.audio;
  if(!this.started){audio.currentTime=0;this.started=true;}
  audio.playbackRate=ENDING_VOICE_RATE;audio.volume=.9;
  this.resume(performance.now(),onError);
 }
 resume(now,onError=()=>{},force=false){
  const a=this.audio;
  if(!this.started||narrationHasFinished(a)||!a.paused||this.pending||(!force&&now-this.lastAttempt<1000)||(a.readyState!==undefined&&a.readyState<2))return;
  const epoch=this.epoch;this.lastAttempt=now;this.pending=true;
  // Calling play after a fresh rewind is necessary even if `ended` still
  // reflects the previous run while the seek event is pending.
  Promise.resolve(a.play()).catch(e=>{if(epoch===this.epoch)onError(e);}).finally(()=>{if(epoch===this.epoch)this.pending=false;});
 }
 stop(){this.epoch++;this.pending=false;this.lastAttempt=-Infinity;this.audio.pause();this.started=false;}
}
// The fade survives the white interlude -> last screen scene change.
export class EndingAudioFade {
 constructor(){this.fade=null;}
 start(audio,now){if(!this.fade)this.fade={audio,at:now,from:audio.volume};}
 tick(now){
  if(!this.fade)return;
  const {audio,at,from}=this.fade,p=Math.min(1,Math.max(0,(now-at)/ENDING_BGM_FADE_MS));
  audio.volume=from*(1-p)*(1-p);
  if(p===1){audio.pause();this.fade=null;}
 }
 stop(audio){this.fade=null;if(audio){audio.pause();audio.volume=0;}}
}
