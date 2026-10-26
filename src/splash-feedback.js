// A short, quiet water whoosh generated locally; no new audio download.
export function createWaterWhoosh(){
 let context=null,active=new Set();
 return {
  arm(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context??=new Audio();context.resume()?.catch(()=>{});}catch{}},
  play(){
   if(context?.state!=='running')return;
   const t=context.currentTime,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.65),context.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(1100,t);filter.frequency.exponentialRampToValueAtTime(180,t+.62);
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.11,t+.08);gain.gain.exponentialRampToValueAtTime(.001,t+.64);
   source.connect(filter);filter.connect(gain);gain.connect(context.destination);active.add(source);
   source.onended=()=>{active.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);source.stop(t+.65);
  },
  stop(){for(const source of active){try{source.stop();}catch{}}active.clear();},
  close(){this.stop();context?.close()?.catch(()=>{});context=null;},
 };
}
