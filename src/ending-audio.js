export const ENDING_BGM_FADE_MS=3000;
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
