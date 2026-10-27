(()=>{'use strict';
const FILES=['underwater_bed','bubble_pop','word_catch','water_touch','descent','gather','move_left','move_right','light_path'];
class WaveSound{
  constructor(videos){
    this.videos=videos;this.scene='intro';this.result=null;this.volume=.65;this.enabled=true;this.ready=false;this.sources=new Set();this.lastAt={};this.played={};this.error='';
    this.downloads=Promise.all(FILES.map(async name=>{try{const r=await fetch(`assets/audio/${name}.wav`);if(!r.ok)throw Error(name);return[name,await r.arrayBuffer()];}catch{this.error='일부 효과음 파일을 읽지 못했습니다.';return[name,null];}}));
  }
  async unlock(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this.error='이 브라우저는 효과음 재생을 지원하지 않습니다.';return;}
      const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=this.enabled?this.volume:0;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.005;limiter.release.value=.18;
      this.master.connect(limiter);limiter.connect(c.destination);this.ambientGain=c.createGain();this.ambientGain.gain.value=0;this.ambientGain.connect(this.master);
      for(const v of this.videos){const source=c.createMediaElementSource(v),gain=c.createGain();gain.gain.value=v.id==='opening'?.75:.95;source.connect(gain);gain.connect(this.master);v.muted=false;}
      this.loading=this.downloads.then(async entries=>{this.buffers={};for(const [name,data]of entries)if(data){try{this.buffers[name]=await c.decodeAudioData(data);}catch{this.error='효과음 형식을 확인해 주세요.';}}
        this.ready=true;if(this.buffers.underwater_bed){this.bed=c.createBufferSource();this.bed.buffer=this.buffers.underwater_bed;this.bed.loop=true;this.bed.connect(this.ambientGain);this.bed.start();}this.setScene(this.scene,this.result);
      });
    }
    try{await this.ctx.resume();await this.loading;}catch{this.error='소리 설정에서 다시 소리를 켜 주세요.';}
  }
  setVolume(value){this.volume=Math.max(0,Math.min(1,+value));this.applyMaster();}
  setEnabled(value){this.enabled=!!value;this.applyMaster();if(value)this.unlock();}
  applyMaster(){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.035);}
  stopCues(){if(!this.ctx)return;const at=this.ctx.currentTime;for(const item of this.sources){item.gain.gain.cancelScheduledValues(at);item.gain.gain.setTargetAtTime(0,at,.035);try{item.source.stop(at+.2);}catch{}}this.sources.clear();}
  play(name,{pan=0,volume=1}={}){
    if(!this.ready||!this.buffers[name]||document.hidden)return;
    const at=this.ctx.currentTime;if(at-(this.lastAt[name]??-Infinity)<(name==='water_touch'?.13:.045))return;this.lastAt[name]=at;
    if(this.sources.size>=16){const first=this.sources.values().next().value;first.source.stop();this.sources.delete(first);}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),panner=this.ctx.createStereoPanner();source.buffer=this.buffers[name];gain.gain.value=volume;panner.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(panner);panner.connect(gain);gain.connect(this.master);
    const item={source,gain};this.sources.add(item);source.onended=()=>{this.sources.delete(item);source.disconnect();panner.disconnect();gain.disconnect();};source.start();this.played[name]=(this.played[name]||0)+1;
  }
  setScene(scene,result){
    this.scene=scene;this.result=result;if(!this.ready)return;this.stopCues();
    const levels={intro:0,opening:0,select:.65,descent:.8,rain:.7,gather:.55,branch:.4,lightpath:.3,ending:0,complete:0};
    this.ambientGain.gain.setTargetAtTime(levels[scene]||0,this.ctx.currentTime,.3);
    const cue={descent:'descent',gather:'gather',branch:result?.side==='left'?'move_left':'move_right',lightpath:'light_path'}[scene];if(cue)this.play(cue,{volume:scene==='branch'?.7:.85});
  }
  pause(){if(this.ctx?.state==='running')this.ctx.suspend();}
  resume(){if(this.ctx&&this.ctx.state!=='closed')this.ctx.resume().catch(()=>{});}
  get status(){return{ready:this.ready,context:this.ctx?.state||'locked',enabled:this.enabled,volume:this.volume,scene:this.scene,played:{...this.played},voices:this.sources.size,error:this.error};}
}
window.WaveSound=WaveSound;
})();
