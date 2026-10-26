import { useI18n } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { nearestSeal } from "./seal-transfer.js";

export default function SealTransfer({ lights, placements, onRelease, locked = false, arrival = null }) {
  const { t } = useI18n();
  const [guide, setGuide] = useState(null);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [trail, setTrail] = useState([]);
  const trailKey = useRef(0);
  const trailTimer = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [breaking, setBreaking] = useState(null);
  const [message, setMessage] = useState(null);
  const announce = (key, ...values) => setMessage({ key, values });
  const layer = useRef(null);
  const targets = useRef([]);
  const gesture = useRef(null);
  const suppressedClick = useRef(null);
  const timer = useRef(null);
  const released = Object.values(placements);
  const available = lights.filter(light => placements[light.id] === undefined);
  const active = available.some(light => light.id === selected);
  useEffect(() => () => {clearTimeout(timer.current);clearTimeout(trailTimer.current);}, []);
  useEffect(() => {
    function cancel() { gesture.current = null; setDrag(null); setHovered(null); setTrail([]); }
    window.addEventListener("resize",cancel);
    return () => window.removeEventListener("resize",cancel);
  }, []);
  useEffect(() => {
    if (!arrival?.first) { setGuide(null); return; }
    const frame=requestAnimationFrame(()=>{
      const box=layer.current?.getBoundingClientRect();
      const target=targets.current.find((_,index)=>!released.includes(index));
      const source=lights.find(light=>light.chestId===arrival.chestId);
      if(!box||!target||!source)return;
      const end=target.getBoundingClientRect();
      const sx=([31.6,50.2,69][source.chestIndex]-3)*10,sy=440;
      const ex=(end.x+end.width/2-box.x)/box.width*1000,ey=(end.y+end.height/2-box.y)/box.height*1000;
      setGuide(`M ${sx} ${sy} Q ${sx} ${ey} ${ex} ${ey}`);
    });
    return ()=>cancelAnimationFrame(frame);
  }, [arrival]);
  function targetAt(point) {
    return nearestSeal(point, targets.current.flatMap((element,index) => {
      if (!element || released.includes(index)) return [];
      const box = element.getBoundingClientRect();
      return [{index, x:box.x+box.width/2, y:box.y+box.height/2, radius:Math.max(36,box.width*1.15)}];
    }));
  }
  function release(id, seal) {
    if (locked || !available.some(light => light.id === id) || released.includes(seal)) return;
    onRelease(id, seal);
    setBreaking(seal); setSelected(null); setHovered(null);
    announce("봉인 하나가 풀렸어요. {0} / 6", released.length+1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBreaking(null), 1800);
  }
  function start(event,id) {
    if (locked || gesture.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id, pointerId:event.pointerId, x:event.clientX, y:event.clientY, moved:false };
    clearTimeout(trailTimer.current);setTrail([]);
    setSelected(id); announce("빛을 위쪽 보랏빛 봉인으로 옮겨 주세요.");
  }
  function move(event) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX-current.x,event.clientY-current.y)>8) current.moved=true;
    if (!current.moved) return;
    const box=layer.current.getBoundingClientRect();
    setDrag({id:current.id,x:Math.max(0,Math.min(100,(event.clientX-box.x)/box.width*100)),y:Math.max(0,Math.min(100,(event.clientY-box.y)/box.height*100))});
    setTrail(old=>[...old.slice(-9),{key:++trailKey.current,x:(event.clientX-box.x)/box.width*1000,y:(event.clientY-box.y)/box.height*1000}]);
    setHovered(targetAt({x:event.clientX,y:event.clientY}));
  }
  function stop(event,cancelled=false) {
    const current=gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current=null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved && !cancelled) {
      suppressedClick.current=current.id;
      const seal=targetAt({x:event.clientX,y:event.clientY});
      if (seal!==null) release(current.id,seal);
      else announce("빛이 상자로 돌아왔어요. 보랏빛 봉인 가까이에 놓아 주세요.");
    }
    if (cancelled) { setSelected(null); announce("빛이 상자로 돌아왔어요. 다시 옮겨 주세요."); }
    setDrag(null); setHovered(null);
    trailTimer.current=setTimeout(()=>setTrail([]),500);
  }
  return <div ref={layer} className={`seal-transfer-layer ${active ? "light-is-selected" : ""}`}>
    {trail.length>0 && <svg className="light-drag-trail" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{trail.map(p=><circle key={p.key} cx={p.x} cy={p.y} r="5"/>)}</svg>}
    <div className="door-seals" role="group" aria-label={t("풀어낸 봉인 {0} / 6", released.length)} data-testid="door-seals">
      <div className="door-seal-runes">{Array.from({length:6},(_,index) => <button key={index} ref={element=>{targets.current[index]=element;}} type="button" className={`seal-rune seal-drop-target ${released.includes(index) ? "rune-released" : ""} ${breaking===index ? "rune-breaking" : ""} ${hovered===index ? "seal-nearby" : ""}`} data-testid={`seal-target-${index}`} aria-label={t("{0}번째 봉인{1}", index+1, released.includes(index) ? t(", 해제 완료") : active ? t(", 선택한 빛으로 풀기") : t(", 빛을 먼저 선택하세요"))} disabled={locked || released.includes(index) || !active} onClick={()=>release(selected,index)} style={{"--seal-delay":"0ms"}}><svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><circle className="rune-ring" cx="30" cy="30" r="25"/><path className="rune-symbol" d="M30 12 45 30 30 48 15 30Z M30 20V40 M21 30H39"/><path className="rune-crack" d="m32 3-9 17 12 9-13 15 7 13"/><path className="rune-check" d="m19 30 8 8 16-18"/></svg><span className="seal-absorption" aria-hidden="true"/><i/><i/><i/><i/></button>)}</div>
      {hovered!==null && <span className="seal-drop-hint">{t("여기에 빛을 놓아 주세요")}</span>}
      <span className="door-seal-caption">{t("풀어낸 봉인")} <strong>{released.length} / 6</strong></span>
    </div>
    {guide && <svg className="light-transfer-demo" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path d={guide}/><circle r="8"><animateMotion dur="1.15s" begin="1.8s" path={guide} fill="freeze"/></circle></svg>}
    {available.map((light) => {
      const moving=drag?.id===light.id;
      const x=moving ? drag.x : [31.6,50.2,69][light.chestIndex]+(light.index===0 ? -3 : 3);
      const y=moving ? drag.y : 44;
      const arriving=arrival?.chestId===light.chestId;
      return <button key={light.id} type="button" className={`treasure-light ${selected===light.id ? "treasure-light-active" : ""} ${moving ? "treasure-light-dragging" : ""} ${arriving ? `light-arriving light-arriving-${light.index} ${arrival.first ? "arrival-first" : "arrival-quick"}` : ""}`} style={{left:`${x}%`,top:`${y}%`,"--light-delay":`${light.index===0 ? (arrival?.first ? 150 : 0) : (arrival?.first ? 800 : 450)}ms`}} disabled={locked} data-testid={`treasure-light-${light.id}`} aria-label={t("{0}번 상자에서 찾은 {1}번째 보물의 빛", light.chestIndex+1, light.index+1)} aria-describedby="light-transfer-instruction" aria-pressed={selected===light.id} onPointerDown={event=>start(event,light.id)} onPointerMove={move} onPointerUp={event=>stop(event)} onPointerCancel={event=>stop(event,true)} onLostPointerCapture={event=>{if(gesture.current?.pointerId===event.pointerId)stop(event,true);}} onClick={()=>{if(locked)return;if(suppressedClick.current===light.id){suppressedClick.current=null;return;}setSelected(light.id);announce("문 위 보랏빛 봉인을 터치해도 빛을 옮길 수 있어요.");}} onKeyDown={event=>{if(event.key==="Escape"){setSelected(null);setDrag(null);gesture.current=null;}}}><span className="light-flight-tail" aria-hidden="true"/><span className="light-core" aria-hidden="true"/><span className="light-orbit" aria-hidden="true"/><span className="light-spark" aria-hidden="true">✦</span></button>;
    })}
    <p className="sr-only" role="status" aria-live="polite">{message && t(message.key, ...message.values)}</p>
  </div>;
}
