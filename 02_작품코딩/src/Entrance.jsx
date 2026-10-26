import { useI18n } from "./i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "./icons";
import FogEntrance from "./FogEntrance";

export default function Entrance({ onEnter, onEngage, onDoorOpen }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("fog");
  const doorRef = useRef(null);
  const opening = useRef(false);
  const entered = useRef(false);
  const finishEntry = useCallback(() => {
    if (!opening.current || entered.current) return;
    entered.current=true;onEnter();
  }, [onEnter]);
  useEffect(() => { const image=new Image();image.src="/art/palace-room.webp";image.decode().catch(()=>{}); }, []);
  useEffect(() => {
    if (phase === "door") doorRef.current?.focus({ preventScroll: true });
    if (phase !== "opening") return;
    const timer = setTimeout(finishEntry, matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 2900);
    return () => clearTimeout(timer);
  }, [phase, finishEntry]);
  function openDoor() {
    if (phase !== "door" || opening.current) return;
    opening.current = true; onEngage(); onDoorOpen?.(); setPhase("opening");
  }
  return <main className={`royal-entrance entrance-${phase}`}>
    <div className="gate-world" onAnimationEnd={event => { if(event.target===event.currentTarget && event.animationName==="gate-forward-passage")finishEntry(); }} inert={phase === "fog"} aria-hidden={phase === "fog" ? true : undefined}>
      <img className="gate-plate" src="/art/palace-entrance-exterior.webp" alt={t("용 문양의 금빛 양문과 수문장이 지키는 깊은 바닷속 용궁")} fetchPriority="high" />
      <div className="gate-surround-shadow" aria-hidden="true" />
      <div className="gate-gap" aria-hidden="true" />
      <button className="royal-door" ref={doorRef} data-testid="palace-door" aria-label={t("보물 방 문 열기")} disabled={phase !== "door"} onClick={openDoor}>
        {["left", "right"].map(side => <span className={`royal-door-leaf royal-door-${side}`} key={side} aria-hidden="true"><img src="/art/palace-entrance-exterior.webp" alt="" /></span>)}
        <span className="royal-door-touch">{t("문을 터치해 열어 보세요")}</span>
      </button>
    </div>
    <div className="royal-entrance-brand"><Shell size={27} /><span>{t("수궁야행")}<small>SUGUNG NIGHT JOURNEY</small></span></div>
    {phase !== "fog" && <div className="royal-door-invitation" role="status"><span className="eyebrow">BEYOND THE GOLDEN GATE</span><h1>{phase === "opening" ? t("용궁의 문이 열립니다") : t("안개 속에 낯선 문이 나타났어요.")}</h1><p>{phase === "opening" ? t("문 너머, 낯선 공간으로 들어갑니다.") : t("이 문은 어디로 이어질까요?")}</p></div>}
    {phase === "fog" && <FogEntrance onInteract={onEngage} onEnter={() => setPhase("door")} />}
  </main>;
}
