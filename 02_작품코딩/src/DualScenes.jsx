import { useI18n } from "./i18n";
import { sceneArt } from "./scene-art.js";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Shell } from "./icons";
import PeopleScene from "./PeopleScene";
import { actionCues as rawCues, species as rawSpecies } from "./action-cues";

export default function DualScenes({ chest, answers, choose, goHome, initialScene = 0 }) {
  const { t, localize } = useI18n();
  const actionCues = localize(rawCues);
  const species = localize(rawSpecies);
  const [index, setIndex] = useState(initialScene);
  const [arriving, setArriving] = useState(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [pending, setPending] = useState(null);
  const titleRef = useRef(null);
  const chooseRef = useRef(choose);
  const confirmed = answers[chest.id];
  const scene = chest.scenes[index];
  const selected = pending || confirmed[index];
  const optionIndex = scene.options.findIndex(([id]) => id === selected);
  const candidate = scene.options[optionIndex];
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setArriving(false); return; }
    setArriving(true);
    const timer = setTimeout(() => setArriving(false), 650);
    return () => clearTimeout(timer);
  }, [index]);
  useEffect(() => { chooseRef.current = choose; }, [choose]);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [index]);
  useEffect(() => {
    const image = new Image();
    image.src = sceneArt(chest.scenes[1 - index].id);
    const room = new Image(); room.src = "/art/palace-room-open.webp";
  }, [chest, index]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      chooseRef.current(index, pending);
      setPending(null);
      setIndex(1 - index);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : 1500);
    return () => clearTimeout(timer);
  }, [pending, index]);
  return <section className={`dual-scenes-page immersive-scenes touch-journey ${chest.theme} ${pending ? "choice-departing" : ""} ${arriving ? "scene-arriving" : "scene-settled"}`}>
    <header className="kiosk-scene-heading">
      <button className="text-button" onClick={goHome}><ArrowLeft size={22} />{t("보물의 방으로")}</button>
      <div className="current-situation"><span className="eyebrow">CHEST {Number(chest.number)}{t("· 상황 0")}{index + 1} / 02</span><h1 ref={titleRef} tabIndex={-1} id="current-scene-title">{scene.name}</h1><p>{chest.prompt}</p></div>
      <span className="kiosk-scene-instruction"><Shell size={25} />{t("바다 친구를 터치하면 이어져요")}</span>
    </header>
    <nav className="scene-moments" aria-label={t("이어지는 두 장면")}>{chest.scenes.map((moment, i) => <button key={moment.id} disabled={Boolean(pending) || arriving} aria-current={index === i ? "step" : undefined} onClick={() => setIndex(i)}><span>{confirmed[i] ? <Check size={19} /> : `0${i + 1}`}</span>{moment.name}{i === 0 && <ArrowRight size={18} />}</button>)}</nav>
    <section className="immersive-stage everyday-panel" aria-labelledby="current-scene-title">
      <PeopleScene key={scene.id} scene={scene} candidate={selected} confirmed={confirmed[index]} pending={Boolean(pending)} arriving={arriving} onPick={setPending} />
      <aside className="scene-context">
        <small>{scene.location}</small><h2>{t("지금 이 순간, 나라면?")}</h2><p className="scene-story">{scene.summary || scene.story}</p>
        <ol className="action-at-a-glance" aria-label={t("바다 친구들이 하는 일")}>{scene.options.map(([id], i) => <li key={id} className={selected === id ? "action-highlighted" : ""}><span>{selected === id ? <Check size={15} /> : i + 1}</span><div><small>{species[i]}</small><strong>{actionCues[scene.id][i]}</strong></div></li>)}</ol>
        <div className={`choice-feedback ${pending ? "feedback-active" : ""}`} role="status" aria-live="polite"><Shell size={20} /><span>{pending ? t("{0}의 행동을 골랐어요", species[optionIndex]) : t("나와 닮은 행동을 하는 친구를 터치해 주세요")}</span></div>
        {pending && <><div className="choice-flow-bar" aria-hidden="true"><i /></div><button className="text-button cancel-choice" onClick={() => setPending(null)}>{t("선택 다시 하기")}</button></>}
        <p className="scene-change-note">{pending ? (confirmed[1 - index] ? t("빛을 따라 보물의 방으로 돌아가요…") : t("빛을 따라 다음 장면으로 이어져요…")) : t("터치하면 빛이 밝아지고 다음 장면으로 이어져요.")}</p>
        <span className="sr-only">{candidate?.[2]}</span>
      </aside>
    </section>
  </section>;
}
