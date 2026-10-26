// Unlock audio from the door's user gesture, then score the room's entrance timeline.
export function playDoorClosing(options = {}) {
  let context;
  let timer;
  const owned = !options.context;
  const nodes = new Set();
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return () => {};
    context = options.context || new AudioContext();
    context.resume().catch(() => {});
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrival = reduced ? .1 : 1.8;
    const impact = context.currentTime + arrival + (reduced ? .15 : 1);
    function tone(frequency,volume,length,start,type="sine") {
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type=type;
      oscillator.frequency.setValueAtTime(frequency,start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*.55,start+length);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(volume,start+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,start+length);
      oscillator.connect(gain);gain.connect(options.destination || context.destination);
      nodes.add(oscillator); oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start(start);oscillator.stop(start+length+.05);
    }
    tone(72,.25,.8,impact); tone(136,.055,.5,impact);
    tone(57,.2,.9,impact+.23); tone(118,.045,.6,impact+.23);
    if (!reduced) {
      // A low rumble rolls out from each successive seal, with a restrained metallic tail.
      for(let i=0;i<6;i++) {
        const start=context.currentTime+arrival+1.5+i*.18;
        tone(118+i*14,.032,.45,start);tone(440+i*38,.012,.65,start);
      }
    }
    if (owned) timer=setTimeout(()=>context.close().catch(()=>{}),(arrival+4.1)*1000);
  } catch { if (owned) context?.close().catch(()=>{}); }
  return ()=>{clearTimeout(timer);for(const node of nodes){try{node.stop();}catch{}}if(owned&&context&&context.state!=="closed")context.close().catch(()=>{});};
}
