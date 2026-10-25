export const INITIAL_WORDS = ['실력', '자유', '연봉', '명예', '봉사', '성장', '안정'];
export const LIMIT = 10;
export const GRAB_MS = 2000;
export const CONFIRM_MS = 3000;
// Confirmation is independent from grab arming: entering with an existing fist is valid.
export class ConfirmController {
 constructor(){this.reset();}
 reset(){this.elapsed=0;this.progress=0;this.last=0;this.valid=false;this.badSince=null;this.hand=null;this.fired=false;}
 update({now,inside,gesture,hand}){
  const dt=this.last?Math.min(150,now-this.last):0;this.last=now;
  if(gesture==='open'||(this.hand&&hand&&this.hand!==hand)){this.elapsed=0;this.progress=0;this.valid=false;this.fired=false;}
  if(!inside||gesture!=='fist'){
   this.valid=false;
   if(this.badSince===null)this.badSince=now;
   if(now-this.badSince>220){this.elapsed=0;this.progress=0;this.fired=false;this.hand=null;}
   return false;
  }
  this.badSince=null;this.hand=hand;
  if(this.valid)this.elapsed+=dt;
  this.valid=true;this.progress=Math.min(1,this.elapsed/CONFIRM_MS);
  if(this.progress===1&&!this.fired){this.fired=true;return true;}
  return false;
 }
}
export function newSession() {
  return { scene: 'standby', count: 0, labels: INITIAL_WORDS.map((text, i) => ({ id: `initial-${i}`, text, slot: i, own: false })) };
}
export function reduceSession(state, action) {
  if (action.type === 'reset') return newSession();
  if (action.type === 'next') {
    const scenes = ['standby', 'intro', 'minigame', 'king', 'glitch', 'rabbitPause', 'rabbit', 'mainReady', 'main', 'photo', 'endingPrelude', 'ending', 'endingWhite', 'escaped'];
    return { ...state, scene: scenes[Math.min(scenes.indexOf(state.scene) + 1, scenes.length-1)] };
  }
  if (state.scene !== 'main' || state.count >= LIMIT) return state;
  if (action.type === 'discard') {
    if (!state.labels.some(l => l.id === action.id)) return state;
    const count = state.count + 1;
    return { ...state, count, scene: count === LIMIT ? 'photo' : 'main', labels: state.labels.filter(l => l.id !== action.id) };
  }
  if (action.type === 'add') {
    const text = action.text.trim().slice(0, 12);
    if (!text) return state;
    const count = state.count + 1;
    const occupied = new Set(state.labels.map(l => l.slot));
    let slot = 0;
    while (occupied.has(slot)) slot++;
    return { ...state, count, scene: count === LIMIT ? 'photo' : 'main', labels: [...state.labels, { id: action.id, text, slot, own: true }] };
  }
  return state;
}
// Stateful dwell controller. A fresh open palm is required before every grab.
export class GripController {
  constructor() { this.reset(); }
  reset() { this.armed = false; this.target = null; this.since = 0; this.drag = null; this.lastSeen = 0; this.progress = 0; this.hand = null; this.ambiguousSince=null; }
  update({ now, point, gesture, hand, target, duration = GRAB_MS }) {
    if (!point) {
      if(this.target&&now-this.lastSeen<250)return null;
      this.target = null; this.progress = 0; this.armed = false;
      if (this.drag && now - this.lastSeen > 1200) { const id = this.drag; this.reset(); return { type: 'cancel', id }; }
      return null;
    }
    if (this.hand && this.hand !== hand) {
      if (this.drag) return null;
      this.armed = false; this.target = null; this.progress = 0;
    }
    this.hand = hand;
    this.lastSeen = now;
    if (this.drag) {
      if (gesture === 'open') { const id = this.drag; this.drag = null; this.armed = true; this.progress = 0; this.target = null; return { type: 'release', id, point }; }
      return { type: 'move', id: this.drag, point };
    }
    if (gesture === 'open') { this.armed = true; this.target = null; this.progress = 0; return null; }
    if(gesture==='unknown'&&this.target===target&&target){if(this.ambiguousSince===null)this.ambiguousSince=now;if(now-this.ambiguousSince<250)return null;}
    else this.ambiguousSince=null;
    if (!this.armed || gesture !== 'fist' || !target) { this.target = null; this.progress = 0; return null; }
    if (this.target !== target) { this.target = target; this.since = now; }
    this.progress = Math.min(1, (now - this.since) / duration);
    if (this.progress === 1) {
      this.armed = false; this.target = null; this.progress = 0;
      if (target === 'confirm') return { type: 'confirm' };
      this.drag = target;
      return { type: 'grab', id: target, point };
    }
    return null;
  }
}
export function isTextEntry(target) { return !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || !!target.isContentEditable); }
// A label must overlap the body, rather than a single hand pixel, to count as inside.
export function bodyOverlap(mask, x, y, width = .11, height = .065) {
  if (!mask) return false;
  let inside = 0, total = 0;
  for (let a = -4; a <= 4; a++) for (let b = -3; b <= 3; b++) {
    const px = x + a * width / 8, py = y + b * height / 6;
    total++;
    if (px >= 0 && px < 1 && py >= 0 && py < 1 && mask.data[Math.floor(py * mask.height) * mask.width + Math.floor((1 - px) * mask.width)] > .6) inside++;
  }
  return inside / total >= .3;
}
export function dropOutcome(held,mask,openingPoint){
 const point=held?.point||openingPoint,origin=held?.origin||point;
 const moved=Math.hypot(point.x-origin.x,point.y-origin.y)>.025;
 return {point,discard:!!mask&&moved&&!bodyOverlap(mask,point.x,point.y)};
}
