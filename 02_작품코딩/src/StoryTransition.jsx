import { useI18n } from "./i18n";
import { sceneArt } from "./scene-art.js";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Shell } from "./icons";
import OceanWindows from "./OceanWindows";
import UnderwaterExit from "./UnderwaterExit";
import FogEntrance from "./FogEntrance";
import ChestDive from "./ChestDive";

export function TrapTransition({ onComplete, onImpact, onSeal }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("arrival");
  const heading = useRef(null);
  const ready = phase === "instructions";
  const soundedSeals = useRef(new Set());
  const soundSeal = (index,delay=0) => {
    if (soundedSeals.current.has(index)) return;
    soundedSeals.current.add(index); onSeal?.(index,delay);
  };
  useEffect(() => {
    if (ready && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let index=0;index<6;index++) {
        if (soundedSeals.current.has(index)) continue;
        soundedSeals.current.add(index); onSeal?.(index,index*.07);
      }
    }
  }, [ready,onSeal]);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = reduced ? [setTimeout(() => setPhase("instructions"), 200)] : [
      setTimeout(() => setPhase("impact"), 1000),
      setTimeout(() => setPhase("blocked"), 3000),
      setTimeout(() => setPhase("instructions"), 4700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (phase === "impact" || (phase === "instructions" && matchMedia("(prefers-reduced-motion: reduce)").matches)) onImpact?.();
  }, [phase, onImpact]);
  useEffect(() => { if (ready) heading.current?.focus({ preventScroll: true }); }, [ready]);
  return <main className={`room-entrapment entrapment-${phase} ${ready ? "entrapment-ready" : ""}`} data-testid="trap-transition" data-phase={phase}>
    <div className="entrapment-world" aria-hidden="true"><img className="entrapment-room" src="/art/palace-room.webp" alt="" /><OceanWindows /><div className="entrapment-shadow" /><div className="entry-door-binding" />
      <div className="entry-seals">{Array.from({ length: 6 }, (_, i) => <span key={i} data-seal-index={i} onAnimationStart={event=>{if(event.target===event.currentTarget && event.animationName==="seal-strikes")soundSeal(i);}} style={{ "--entry-delay": `${1500 + i * 180}ms` }}>◇<i /></span>)}</div>
      <div className="entry-impact-wave" /><div className="entry-edge-mist" />
    </div>
    <div className="entry-arrival-caption" aria-hidden="true">{t("고요한 보물의 방, 그런데…")}</div>
    <div className="entry-blocked-message" role="status">{phase === "blocked" && <><small>THE WAY BACK IS SEALED</small><strong>{t("문이… 열리지 않아요.")}</strong><span>{t("보랏빛 봉인이 돌아갈 길을 막았어요.")}</span></>}</div>
    <div className="entrapment-copy" aria-hidden={!ready} inert={!ready}><span className="eyebrow">THE SEALED CHAMBER</span><h1 ref={heading} tabIndex={-1}>{t("문이 닫히고,")}<br />{t("여섯 개의 봉인이 걸렸어요.")}</h1><p>{t("이 방을 나가려면 세 상자에 숨겨진 보물을 찾아야 해요.")}<br />{t("상자마다 두 장면이 기다리고 있어요.")}<br />{t("그 안에서 나를 닮은 행동을 고르면 보물을 얻을 수 있어요.")}</p><button className="button button-gold" disabled={!ready} onClick={onComplete}>{t("보물을 찾아 탈출하기")}<ArrowRight size={20} /></button></div>
  </main>;
}

export function ChestTransition({ chest, first, initialScene = 0, onStart, onReveal, onComplete }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("briefing");
  const [showIntro] = useState(first);
  const starting = useRef(false);
  const chestIndex = ["outfit", "strength", "aura"].indexOf(chest.id);
  const focusX = ["calc(50% - max(18.4vw,41.124svh))", "calc(50% + max(.2vw,.447svh))", "calc(50% + max(19vw,42.465svh))"][chestIndex];
  useEffect(() => {
    const image = new Image(); image.src = sceneArt(chest.scenes[initialScene].id);
    import("./DualScenes").catch(() => {});
  }, [chest.id, initialScene]);
  return <main className={`chest-mission-opening chest-opening-${chest.id} chest-phase-${phase}`} data-phase={phase} data-first={showIntro} data-testid="chest-mission-opening" style={{"--pull-x":focusX,"--pull-y":"calc(50% + max(8.501vw,19svh))"}}>
    <div className="chest-pull-world" data-testid="chest-pull-world"><img src="/art/palace-room.webp" alt={t("보물 방")} /><OceanWindows />
    </div>
    <div className="chest-selection-halo" aria-hidden="true" />
    <ChestDive index={chestIndex} image={sceneArt(chest.scenes[initialScene].id)} active={phase === "portal"} onReveal={onReveal} onComplete={onComplete} />
    <div className="chest-mission-copy" inert={phase !== "briefing"} aria-hidden={phase !== "briefing"}>
      <Shell size={32}/><span className="eyebrow">CHEST {Number(chest.number)}</span>
      <h1>{showIntro ? t("상자 안에, 당신의 이야기가 펼쳐져요.") : t("다음 이야기가 기다리고 있어요.")}</h1>
      <p>{showIntro ? <>{t("두 장면에서 나를 닮은 행동을 골라")}<br/>{t("숨겨진 보물을 찾아보세요.")}</> : t("이번에도 두 장면에서 나를 닮은 행동을 골라 주세요.")}</p>
      <button className="button button-gold" data-testid="enter-chest-story" disabled={phase !== "briefing"} onClick={() => { if(starting.current) return; starting.current = true; onStart(); setPhase("portal"); }}>{t("이야기 속으로 들어가기")}<ArrowRight size={22}/></button>
    </div>
  </main>;
}

export function Escape({ onResult, onEngage, onRevealed }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("forming");
  const heading = useRef(null);
  const [showCopy, setShowCopy] = useState(false);
  useEffect(() => {
    const image = new Image(); image.src = "/art/palace-exit-open.webp";
    const timer = setTimeout(() => setPhase("fog"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1100);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (phase !== "free") return;
    onRevealed?.();
    const timer=setTimeout(()=>setShowCopy(true),matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1600);
    return ()=>clearTimeout(timer);
  }, [phase, onRevealed]);
  useEffect(()=>{if(showCopy)heading.current?.focus();},[showCopy]);
  return <main className={`escape-scene escape-${phase}`} data-testid="escape-scene">
    <div className="escape-world"><img className="escape-palace" src="/art/palace-exit-open.webp" alt={t("활짝 열린 용궁문 너머로 밝은 바닷길이 이어지는 탈출구")} /><UnderwaterExit /></div>
    <div className="escape-rays" aria-hidden="true" />
    {phase === "forming" && <div className="escape-forming" role="status"><Shell size={40} /><h1>{t("여섯 보물을 모두 찾았어요.")}<br />{t("여섯 봉인이 모두 풀리고, 문 앞에 안개가 피어올라요.")}</h1></div>}
    {phase === "fog" && <FogEntrance variant="escape" onInteract={onEngage} onEnter={() => setPhase("free")} />}
    {phase === "free" && showCopy && <div className="escape-copy-dock"><div className="escape-success"><span className="eyebrow">THE SEALS ARE RELEASED</span><h1 ref={heading} tabIndex={-1}>{t("봉인이 풀렸어요.")}</h1><p>{t("보물의 방을 무사히 빠져나왔어요.")}<br />{t("이제 당신이 찾아낸 여섯 보물을 만나 보세요.")}</p><button className="button button-gold" onClick={onResult}>{t("획득한 여섯 보물 확인하기")}<ArrowRight size={22} /></button></div></div>}
  </main>;
}
