// Prime once from the door touch, so later award chimes can follow the visual timeline.
export function createLightAudio(options = {}) {
  let context;
  const active = new Set();
  try {
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(AudioContext){context=options.context || new AudioContext();context.resume().catch(()=>{});}
  } catch {}
  function note(frequency,delay=0,volume=.07,length=.7,partials=[[1,1],[2,.22],[3,.07]]) {
    if(!context || context.state==="closed")return ()=>{};
    const nodes=[];
    for(const [ratio,strength] of partials){
      const oscillator=context.createOscillator(),gain=context.createGain();
      const start=context.currentTime+delay;
      oscillator.frequency.value=frequency*ratio;
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume*strength,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+length);
      oscillator.connect(gain);gain.connect(options.destination || context.destination);oscillator.start(start);oscillator.stop(start+length+.02);
      active.add(oscillator);nodes.push(oscillator);oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    }
    return ()=>nodes.forEach(node=>{try{node.stop();}catch{}});
  }
  return {
    pair(quick=false){const first=note(784,quick ? .3 : .55),second=note(1046.5,quick ? .85 : 1.2);return ()=>{first();second();};},
    release(){note(523.25,0,.045,.5);note(1046.5,.09,.025,.6);},
    bind(index,delay=0){return note([523.25,493.88,440,392,349.23,329.63][index],delay,.14,.48,[[1,1],[1.48,.28],[2.76,.10]]);},
    close(){for(const node of active){try{node.stop();}catch{}}active.clear();if(!options.context) context?.close().catch(()=>{});},
  };
}
