import { useI18n } from "./i18n";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleHelp, Sparkles } from "./icons";
import { countAnswers } from "./journey";
import { earnedLights } from "./seal-transfer.js";
import OceanWindows from "./OceanWindows";
import SealTransfer from "./SealTransfer";

export function RoomHome({ answers, openChest, showGuide, showResult, chests, placements, onRelease, reveal, onRevealComplete, playArrival }) {
  const { t } = useI18n();
  const viewportRef=useRef(null);
  useLayoutEffect(()=>{
    const viewport=viewportRef.current;
    const fit=()=>{
      const {width,height}=viewport.getBoundingClientRect();
      const artWidth=width/height >= 1.2 ? Math.max(width,height*1875/839) : width;
      viewport.style.setProperty("--room-art-width",`${artWidth}px`);
      viewport.style.setProperty("--room-art-height",`${artWidth*839/1875}px`);
    };
    fit();const observer=new ResizeObserver(fit);observer.observe(viewport);
    return()=>observer.disconnect();
  },[]);
  const total = countAnswers(answers);
  const lights = earnedLights(answers);
  const released = Object.keys(placements).length;
  const pending = lights.some(light => placements[light.id] === undefined);
  const [finishing, setFinishing] = useState(false);
  const [revealing, setRevealing] = useState(Boolean(reveal));
  const revealTimer = useRef(null);
  const stopChimes = useRef(null);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finishReveal = useCallback(() => {
    clearTimeout(revealTimer.current); stopChimes.current?.();
    setRevealing(false); onRevealComplete();
  }, [onRevealComplete]);
  useEffect(() => {
    if (!reveal) return;
    setRevealing(true);
    stopChimes.current = playArrival(!reveal.first || reduced);
    revealTimer.current = setTimeout(finishReveal, reduced ? 1100 : reveal.first ? 3800 : 2200);
    return () => { clearTimeout(revealTimer.current); stopChimes.current?.(); };
  }, [reveal, finishReveal, playArrival, reduced]);
  useEffect(() => {
    if (released !== 6) return;
    setFinishing(true);
    const timer = setTimeout(showResult, 2200);
    return () => clearTimeout(timer);
  }, [released]);
  const title = released === 6 || total === 6 ? t("여섯 보물을 모두 찾았어요.") : pending ? t("보물 두 개를 찾았어요.") : released ? t("보물 두 개를 찾고, 봉인 두 개를 풀었어요.") : total ? t("보물의 방으로 돌아왔어요.") : t("탈출의 열쇠는 상자 속에 있어요.");
  const description = released === 6 ? t("여섯 봉인이 모두 풀렸어요. 안개를 걷고 열린 문으로 나가세요.") : pending ? t("찾아낸 보물이 빛이 되었어요. 빛을 문 위 보랏빛 봉인으로 하나씩 끌어다 놓으세요.") : released ? t("남은 상자에도 당신의 보물이 기다리고 있어요.") : t("먼저 열어 볼 상자를 골라 주세요.");
  return <section className={`royal-room ${total ? "room-returned" : ""} ${pending ? "room-transferring" : ""} ${revealing ? "room-awarding" : ""} ${finishing ? "room-releasing" : ""}`} data-testid="treasure-room">
    <header className="royal-room-heading"><span className="eyebrow">THE DRAGON KING'S TREASURE CHAMBER</span><h1 tabIndex={-1}>{title}</h1><p id="light-transfer-instruction">{description}</p><span className="room-found-count" data-testid="found-treasure-count">{t("찾은 보물")} <strong>{total} / 6</strong></span></header>
    <div className="royal-room-viewport" ref={viewportRef}><div className="royal-room-canvas">
      <img src="/art/palace-room.webp" alt={t("금빛 용궁문 앞에 세 보물 상자가 놓인 용왕의 방")} fetchPriority="high" />
      <OceanWindows />
      {chests.map((chest, index) => answers[chest.id].every(Boolean) && <div key={chest.id} className={`open-chest-layer open-chest-layer-${index}`} data-testid={`opened-chest-${chest.id}`} aria-hidden="true"><img src="/art/palace-room-open.webp" alt="" /></div>)}
      <SealTransfer lights={lights} placements={placements} onRelease={onRelease} locked={revealing} arrival={revealing ? reveal : null}/>
      {chests.map((chest, index) => {
        const count=answers[chest.id].filter(Boolean).length;
        const complete=count===2;
        return <button key={chest.id} className={`royal-chest royal-chest-${index} ${complete ? "chest-complete" : "chest-available"}`} data-testid={`chest-${chest.id}`} aria-label={t("{0} 보물 상자 {1}", `CHEST ${Number(chest.number)}`, complete ? t("선택 완료") : t("열기"))} disabled={complete || pending || finishing || revealing} onClick={()=>openChest(chest)}><span className="chest-glimmer">{complete ? <Check size={25}/> : <Sparkles size={25}/>}</span><span className="royal-chest-label"><small>CHEST {Number(chest.number)}</small><span>{t("상자를 터치해 보세요")}</span></span></button>;
      })}
      {revealing && <div className={`light-award-veil ${reveal?.first ? "award-first" : "award-quick"}`} aria-hidden="true" style={{"--award-x":`${[31.6,50.2,69][chests.findIndex(chest=>chest.id===reveal.chestId)]}%`}}/>}
      {revealing && <div className="light-award-copy" role="status" data-testid="light-award-presentation"><strong>{t("보물의 빛 두 개를 얻었어요!")}</strong><span>{t("빛을 문 위의 보랏빛 봉인으로 끌어다 놓으세요.")}</span></div>}
      {revealing && !reveal?.first && <button className="light-award-skip" data-testid="skip-light-award" aria-label={t("터치해서 빛 획득 연출 건너뛰기")} onClick={finishReveal}><span>{t("화면을 터치하면 바로 빛을 옮길 수 있어요")}<ArrowRight size={18}/></span></button>}
      {pending && !revealing && <div className="light-drag-guidance" aria-hidden="true"><span>↑</span>{t("빛을 위쪽 봉인으로 옮겨 주세요")}</div>}
      {finishing && <div className="seal-release-light" aria-hidden="true"/>}
    </div>
    </div>
    <footer className="royal-room-footer"><span>{pending ? t("끌기 어려우면 빛을 터치한 뒤 봉인을 터치해도 돼요.") : t("보물의 모습과 설명은 탈출한 뒤 한 번에 공개돼요.")}</span><button className="text-button" onClick={showGuide}><CircleHelp size={20}/>{t("체험 안내")}</button>{released===6 && !finishing && <button className="button button-gold" onClick={showResult}>{t("탈출하기")}<ArrowRight size={20}/></button>}</footer>
  </section>;
}
