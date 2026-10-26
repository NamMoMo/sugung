import { createUnderwaterAudio } from "./underwater-audio.js";
import { createLightAudio } from "./light-audio.js";

export const MUSIC = {
  intro: { src: "/audio/intro.m4a", gain: .28 },
  room: { src: "/audio/room.mp3", gain: .25 },
  mission: { src: "/audio/mission.m4a", gain: .24 },
  escape: { src: "/audio/escape-user.mp3", gain: .28 },
  result: { src: "/audio/result-asmr.m4a", gain: .30 },
};
export function musicStage({ entered, page, storyEntering = false, escapeFree, shared }) {
  if (shared || page === "result") return "result";
  if (page === "escape") return "escape";
  if (page === "scene" || (page === "chest-light" && storyEntering)) return "mission";
  return entered ? "room" : "intro";
}

// Stream long recordings instead of decoding the entire soundtrack into RAM.
// Each voice has its own gain, so a new track begins only when play succeeds.
export function createExhibitionAudio({ onPlaying = () => {}, onError = () => {} } = {}) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error("이 화면에서는 배경음을 지원하지 않아요.");
  const context = new Context();
  const master = context.createGain(); master.gain.value = 0;
  const limiter=context.createDynamicsCompressor();limiter.threshold.value=-4;limiter.knee.value=6;limiter.ratio.value=4;limiter.attack.value=.004;limiter.release.value=.2;
  master.connect(limiter);limiter.connect(context.destination);
  const ambience=createUnderwaterAudio({context,destination:master,onError});
  const musicBus=context.createGain();musicBus.gain.value=1;musicBus.connect(master);
  let musicDuckTimer,musicDuckUntil=0,musicDuckFloor=1;
  const effects = context.createGain(); effects.gain.value = .55; effects.connect(master);
  const lights = createLightAudio({ context, destination: effects });
  const voices = new Set();
  const resumePositions = new Map();
  let desired = "intro", current = null, enabled = false, hidden = document.hidden, disposed = false;
  let generation = 0, tick = null, closeDoor = () => {}, closeGate = () => {};
  const cueBuffers = new Map(), activeCues = new Set();
  let cueEpoch = 0;
  const cueFiles = { button: "/audio/button.mp3", door: "/audio/door-impact.mp3", chest: "/audio/chest-open.mp3", gate: "/audio/gate-opening-user.mp3" };
  const failed = new Set();
  function ramp(param, value, seconds) {
    const now = context.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { const held = param.value; param.cancelScheduledValues(now); param.setValueAtTime(held, now); }
    param.linearRampToValueAtTime(value, now + seconds);
  }
  function retire(voice) {
    if (!voices.has(voice)) return;
    clearTimeout(voice.timer); voice.element.pause(); voice.element.removeAttribute("src"); voice.element.load();
    voice.element.remove(); voice.source.disconnect(); voice.gain.disconnect(); voices.delete(voice);
  }
  function fadeOut(voice, seconds) {
    if (["room", "mission"].includes(voice.track) && voice.element.dataset.audioState === "active") resumePositions.set(voice.track, voice.element.currentTime);
    voice.element.dataset.audioState = "fading";
    ramp(voice.gain.gain, 0, seconds);
    clearTimeout(voice.timer); voice.timer = setTimeout(() => retire(voice), seconds * 1000 + 100);
  }
  async function start(track, looping = false, quiet = false) {
    if (disposed || !enabled || hidden || (!looping && current?.track === track)) return;
    const token = ++generation;
    // Cancel a loading voice if the visitor changes scenes before it starts.
    for (const voice of voices) if (voice.element.dataset.audioState === "loading") retire(voice);
    // Continue chamber and mission recordings between visits; a genuine loop starts at zero.
    const outgoing = [...voices].reverse().find(v => v.track === track && v.element.dataset.audioState !== "loading");
    const resumeAt = ["room", "mission"].includes(track) && !looping ? (outgoing?.element.currentTime ?? resumePositions.get(track) ?? 0) : 0;
    const element = new Audio(MUSIC[track].src);
    if (resumeAt > 0) element.addEventListener("loadedmetadata", () => {
      element.currentTime = Number.isFinite(element.duration) && resumeAt >= element.duration - 4.5 ? 0 : resumeAt;
    }, { once: true });
    element.preload = "auto"; element.setAttribute("playsinline", ""); element.hidden = true;
    element.dataset.bgmTrack = track; element.dataset.audioState = "loading";
    document.body.append(element);
    const source = context.createMediaElementSource(element), gain = context.createGain();
    gain.gain.value = 0; source.connect(gain); gain.connect(musicBus);
    const voice = { track, element, source, gain, timer: null }; voices.add(voice);
    try {
      // Invoke play before awaiting anything: preserve the visitor's gesture.
      await element.play();
      if (disposed || token !== generation || !enabled || hidden || track !== desired) { retire(voice); return; }
      const old = current; current = voice; element.dataset.audioState = "active";
      const overlap = looping ? Math.min(4.5, Math.max(.3, old.element.duration - old.element.currentTime)) : 1.6;
      ramp(gain.gain, MUSIC[track].gain, old ? overlap : .9);
      // All old voices are retired, including interrupted crossfades.
      for (const other of voices) if (other !== voice) fadeOut(other, overlap);
      if(context.state==="running")ambience.setEnabled(true);
      onPlaying(track);
      return true;
    } catch (error) {
      retire(voice);
      if (disposed || token !== generation || error.name === "AbortError") return;
      if (quiet || error.name === "NotAllowedError") return false;
      if (!failed.has(track)) { failed.add(track); onError("배경음을 재생하지 못했어요."); }
    }
  }
  function setTrack(track) {
    if (!MUSIC[track]) return;
    desired = track;ambience.setStage(track);
    if (enabled && !hidden && current?.track !== desired) start(desired);
  }
  function setEnabled(value) {
    enabled = value;ambience.setEnabled(value);
    if (value) {
      context.resume().catch(() => {});
      ramp(master.gain, hidden ? 0 : .8, .25);
      if (!hidden) {
        for (const voice of voices) if (voice.element.dataset.audioState !== "loading") voice.element.play().catch(() => {});
        if ((current?.track !== desired || !current || !voices.has(current)) && ![...voices].some(v => v.element.dataset.audioState === "loading")) start(desired);
      }
    } else {
      generation++; stopCues(); closeDoor(); lights.close();
      for (const voice of voices) if (voice.element.dataset.audioState === "loading") retire(voice);
      ramp(master.gain, 0, .15);
      // Silence effect tails too; music resumes at the same position later.
      setTimeout(() => { if (!enabled && !disposed) for (const voice of voices) voice.element.pause(); }, 180);
    }
  }
  function visibility() {
    hidden = document.hidden;ambience.setHidden(hidden);
    if (hidden) {
      generation++;
      for (const voice of voices) { if (voice.element.dataset.audioState === "loading") retire(voice); else voice.element.pause(); }
      stopCues();
      context.suspend().catch(() => {});
    } else if (enabled) setEnabled(true);
  }
  document.addEventListener("visibilitychange", visibility);
  tick = setInterval(() => {
    if (!enabled || hidden || !current || !voices.has(current)) return;
    const el = current.element;
    if (Number.isFinite(el.duration) && el.duration > 4 && el.duration - el.currentTime < 4.5 && ![...voices].some(v => v.element.dataset.audioState === "loading" || v.element.dataset.audioState === "fading")) start(desired, true);
  }, 250);
  // Decode short user-supplied cues once; BGM continues to stream.
  const loads = Object.entries(cueFiles).map(([key, url]) => fetch(url)
    .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
    .then(b => context.decodeAudioData(b)).then(b => { if (!disposed) cueBuffers.set(key, b); }).catch(() => {}));
  function stopCues() { clearTimeout(musicDuckTimer);musicDuckUntil=0;musicDuckFloor=1;ramp(musicBus.gain,1,.15);cueEpoch++; for (const node of [...activeCues]) { try { node.stop(); } catch {} } }
  function cue(key, volume, offset = 0) {
    let stopped = false, source;
    const scheduled = context.currentTime, epoch = cueEpoch;
    const play = () => {
      if (stopped || epoch !== cueEpoch || !enabled || hidden || disposed || !cueBuffers.has(key)) return;
      // Never let a late download play a door impact after its visual event.
      if (context.currentTime - scheduled > .25) return;
      if (activeCues.size >= 8) { try { activeCues.values().next().value.stop(); } catch {} }
      const waterDucks={button:[.75,.18],door:[.25,1.8],chest:[.3,2.2],gate:[.3,1.6]};
      ambience.duck(...waterDucks[key]);
      if(key!=="button"){
        musicDuckFloor=Math.min(musicDuckFloor,key==="door"?.6:.75);musicDuckUntil=Math.max(musicDuckUntil,context.currentTime+waterDucks[key][1]);ramp(musicBus.gain,musicDuckFloor,.08);clearTimeout(musicDuckTimer);musicDuckTimer=setTimeout(()=>{musicDuckFloor=1;musicDuckUntil=0;ramp(musicBus.gain,1,.9);},(musicDuckUntil-context.currentTime)*1000);
      }
      source = context.createBufferSource(); const gain = context.createGain(); source.buffer = cueBuffers.get(key);
      gain.gain.value = volume; source.connect(gain); gain.connect(effects); activeCues.add(source);
      source.onended = () => { activeCues.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(0, offset);
    };
    if (cueBuffers.has(key)) play(); else Promise.all(loads).then(play);
    return () => { stopped = true; if (source) { try { source.stop(); } catch {} } };
  }
  return {
    setTrack, setEnabled,
    async tryAutoplay() {
      if (disposed || hidden || enabled) return false;
      enabled = true; context.resume().catch(() => {}); ramp(master.gain, .8, .25);
      const playing = start(desired, false, true), token = generation;
      const started = await playing;
      if (disposed || generation !== token) return false;
      if (started && context.state === "running") return true;
      setEnabled(false); current = null; for (const voice of [...voices]) retire(voice); onPlaying(""); return false;
    },
    resumeFromGesture() {
      if (!enabled || disposed) return;
      context.resume().catch(() => {});
      if (!current && ![...voices].some(v => v.element.dataset.audioState === "loading")) start(desired);
    },
    click() { cue("button", .32, .04); },
    door() { closeGate(); closeDoor(); closeDoor = cue("door", 1, 2.05); },
    chest() { return cue("chest", 1.5, .5); },
    gateOpen() { closeGate(); closeGate = cue("gate", .9); return closeGate; },
    pair(quick) { if(enabled)ambience.duck(.55,.8);return enabled ? lights.pair(quick) : () => {}; },
    bind(index, delay = 0) { if(enabled && !hidden && !disposed && Number.isInteger(index) && index>=0 && index<6) { ambience.duck(.55,.35); return lights.bind(index,delay); } return () => {}; },
    release() { if (enabled) {ambience.duck(.45,.65);lights.release();} },
    reset() { ambience.reset();resumePositions.clear(); generation++; closeDoor(); stopCues(); lights.close(); current = null; for (const voice of [...voices]) retire(voice); desired = "intro"; onPlaying(""); },
    destroy() { ambience.destroy();disposed = true; generation++; clearInterval(tick); document.removeEventListener("visibilitychange", visibility); closeDoor(); stopCues(); lights.close(); for (const voice of [...voices]) retire(voice); context.close().catch(() => {}); },
  };
}
