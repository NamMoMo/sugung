// A separate stereo bed survives scene changes. Only its level changes.
export const UNDERWATER = {
  src: '/audio/underwater-ambience.m4a',
  levels: { intro: .30, room: .30, mission: .24, escape: .26, result: .14 },
  overlap: 4.5,
};
export function createUnderwaterAudio({context,destination,onError=()=>{}}) {
  const bus=context.createGain();bus.gain.value=0;
  const highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=65;highpass.Q.value=.5;
  const lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=5000;lowpass.Q.value=.5;
  highpass.connect(lowpass);lowpass.connect(bus);bus.connect(destination);
  const voices=new Set();let current=null,enabled=false,hidden=document.hidden,disposed=false,pending=false,epoch=0,stage='intro',reported=false;
  let pauseTimer,duckTimer,duckUntil=0,duckFloor=1;
  function ramp(param,value,seconds) {const now=context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{const held=param.value;param.cancelScheduledValues(now);param.setValueAtTime(held,now);}param.linearRampToValueAtTime(value,now+seconds);}
  function level(seconds=.7){ramp(bus.gain,enabled&&!hidden?UNDERWATER.levels[stage]*duckFloor:0,seconds);}
  function retire(voice){if(!voices.has(voice))return;clearTimeout(voice.timer);voice.element.pause();voice.element.removeAttribute('src');voice.element.load();voice.element.remove();voice.source.disconnect();voice.gain.disconnect();voices.delete(voice);}
  async function start(looping=false){
    if(disposed||!enabled||hidden||pending||(!looping&&current&&voices.has(current)))return;
    pending=true;const token=++epoch;
    const element=new Audio(UNDERWATER.src);element.preload='auto';element.hidden=true;element.setAttribute('playsinline','');element.dataset.audioLayer='ambience';element.dataset.ambienceState='loading';document.body.append(element);
    const source=context.createMediaElementSource(element),gain=context.createGain();gain.gain.value=0;source.connect(gain);gain.connect(highpass);
    const voice={element,source,gain,timer:null};voices.add(voice);
    try {
      await element.play();
      if(disposed||token!==epoch||!enabled||hidden){retire(voice);return;}
      const old=current;current=voice;element.dataset.ambienceState='active';
      const fade=old&&voices.has(old)?Math.min(UNDERWATER.overlap,Math.max(.3,old.element.duration-old.element.currentTime)):1.5;
      ramp(gain.gain,1,fade);
      for(const other of voices)if(other!==voice){other.element.dataset.ambienceState='fading';ramp(other.gain.gain,0,fade);other.timer=setTimeout(()=>retire(other),fade*1000+100);}
    } catch(error) {retire(voice);if(token===epoch&&!disposed&&error.name!=='AbortError'&&error.name!=='NotAllowedError'&&!reported){reported=true;onError('물소리를 불러오지 못했어요. 기존 음악은 계속 재생돼요.');}}
    finally {if(token===epoch)pending=false;}
  }
  function cancelLoading(){epoch++;pending=false;for(const voice of voices)if(voice.element.dataset.ambienceState==='loading')retire(voice);}
  function setEnabled(value){
    if(disposed)return;enabled=value;clearTimeout(pauseTimer);
    if(value&&!hidden){level();for(const voice of voices)if(voice.element.dataset.ambienceState!=='loading')voice.element.play().catch(()=>{});start();}
    else {cancelLoading();level(.15);pauseTimer=setTimeout(()=>{if(!enabled||hidden)for(const voice of voices)voice.element.pause();},180);}
  }
  const tick=setInterval(()=>{if(!enabled||hidden||!current||!voices.has(current)||pending)return;const el=current.element;if(Number.isFinite(el.duration)&&el.duration-el.currentTime<UNDERWATER.overlap&&![...voices].some(v=>v.element.dataset.ambienceState==='fading'))start(true);},250);
  return {
    setEnabled,
    setStage(value){if(value in UNDERWATER.levels){stage=value;level(1.2);}},
    setHidden(value){hidden=value;if(value){cancelLoading();for(const voice of voices)voice.element.pause();}else if(enabled)setEnabled(true);},
    duck(amount,seconds){if(!enabled||hidden||disposed)return;duckFloor=Math.min(duckFloor,amount);duckUntil=Math.max(duckUntil,context.currentTime+seconds);level(.08);clearTimeout(duckTimer);duckTimer=setTimeout(()=>{duckFloor=1;duckUntil=0;level(.9);},Math.max(0,(duckUntil-context.currentTime)*1000));},
    reset(){cancelLoading();clearTimeout(pauseTimer);clearTimeout(duckTimer);duckFloor=1;duckUntil=0;enabled=false;for(const voice of [...voices])retire(voice);current=null;stage='intro';bus.gain.cancelScheduledValues(context.currentTime);bus.gain.value=0;},
    destroy(){disposed=true;this.reset();clearInterval(tick);bus.disconnect();highpass.disconnect();lowpass.disconnect();},
  };
}
