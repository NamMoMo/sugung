import { useI18n, LanguageSwitch } from "./i18n";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleHelp, RotateCcw, Shell, Volume2, VolumeX, X } from "./icons";
import { chests as rawChests, countAnswers, emptyAnswers, STORAGE_KEY } from "./journey";
import Entrance from "./Entrance";
import { RoomHome } from "./Experience";
import Modal from "./Modal";
import { TrapTransition, ChestTransition, Escape } from "./StoryTransition";
import { sharedResultFromHash } from "./result-link";
import useIdleReset from "./useIdleReset";
import { earnedLights, placeLight } from "./seal-transfer.js";
import useExhibitionAudio from "./useExhibitionAudio";
import { musicStage } from "./exhibition-audio.js";
import { createTreasureRecorder } from './treasure-result.js';
import { useTreasureStation } from './useTreasureStation.js';
import StationNotice from './StationNotice.jsx';

const DualScenes = lazy(() => import("./DualScenes"));
const Result = lazy(() => import("./Result"));

function clearPreviousVisit() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
  try { window.sessionStorage.removeItem("sugung-room-entered"); } catch {}
}

export default function App() {
  const { t, localize, setLanguage, language } = useI18n();
  const recorder = useRef(null);
  if (!recorder.current) recorder.current = createTreasureRecorder();
  const chests = localize(rawChests);
  const [sharedRoute, setSharedRoute] = useState(() => sharedResultFromHash(window.location.hash));
  const [trapped, setTrapped] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [entered, setEntered] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [visit, setVisit] = useState(0);
  const [page, setPage] = useState("home");
  const [activeChest, setActiveChest] = useState("outfit");
  const [hasEnteredStory, setHasEnteredStory] = useState(false);
  const [storyEntering, setStoryEntering] = useState(false);
  const [chestHandoff, setChestHandoff] = useState(false);
  const [chestOverlay, setChestOverlay] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [modal, setModal] = useState(null);
  const [lightPlacements, setLightPlacements] = useState({});
  const [lightReveal, setLightReveal] = useState(null);
  const [toast, setToast] = useState("");
  const [escapeFree, setEscapeFree] = useState(false);
  const finishLightReveal = useCallback(() => setLightReveal(null), []);

  const total = countAnswers(answers);
  const released = Object.keys(lightPlacements).length;
  const pendingLights = earnedLights(answers).filter(light => lightPlacements[light.id] === undefined);
  const chest = chests.find((item) => item.id === activeChest);
  const closeModal = useCallback(() => setModal(null), []);
  const notify = useCallback((message) => setToast(message), []);
  const audioStage = musicStage({ entered, page, storyEntering, escapeFree, shared: Boolean(sharedRoute) });
  const music = useExhibitionAudio(audioStage, Boolean(sharedRoute), notify, visit);
  const startStory = useCallback(() => { music.engine.current?.chest(); setStoryEntering(true); setHasEnteredStory(true); }, [music.engine]);
  const openGateSound = useCallback(() => music.engine.current?.gateOpen(), [music.engine]);
  const playLightArrival = useCallback(quick => music.engine.current?.pair(quick), [music.engine]);
  const escapeRevealed = useCallback(() => setEscapeFree(true), []);
  const enterRoom = useCallback(() => { setEntered(true); setEngaged(true); setTrapped(true); setPage("trap"); }, []);
  const engage = useCallback(() => { recorder.current.start(); setEngaged(true); }, []);

  const resetArtwork = useCallback(() => {
    recorder.current.reset();
    setLanguage("ko");
    setTrapped(false);
    setEscaped(false);
    setAnswers(emptyAnswers());
    setEntered(false);
    setEngaged(false);
    setPage("home");
    setActiveChest("outfit");
    setSceneIndex(0);
    setHasEnteredStory(false);
    setStoryEntering(false);
    setChestOverlay(false);
    setChestHandoff(false);
    setModal(null);
    setLightPlacements({});
    setLightReveal(null);
    music.reset();
    setEscapeFree(false);
    setToast("");
    setVisit((current) => current + 1);

    clearPreviousVisit();
  }, [setLanguage, music.reset]);
  const station = useTreasureStation({ enabled: import.meta.env.VITE_TREASURE_STATION_ENABLED === 'true' && !sharedRoute, onReset: resetArtwork });
  const beginExperience=useCallback(()=>{engage();station.begin();},[engage,station.begin]);
  const resetVisit = useCallback(() => { if (station.enabled) void station.reset(); else resetArtwork(); }, [station.enabled, station.reset, resetArtwork]);
  const { remaining, continueVisit } = useIdleReset(engaged && page !== "trap" && page !== "chest-light", resetVisit);
  const obscured = Boolean(modal || remaining !== null);
  useEffect(() => {
    if (!station.enabled || !station.active || page !== 'result' || !escaped) return;
    try { station.submit(recorder.current.snapshot(answers, lightPlacements, language)); }
    catch { notify('체험 결과를 확인하지 못했습니다. 운영자에게 알려 주세요.'); }
  }, [station.enabled, station.active, station.submit, page, escaped, answers, lightPlacements, language, notify]);

  useEffect(clearPreviousVisit, []);
  useEffect(() => {
    const update = () => setSharedRoute(sharedResultFromHash(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.querySelector(".kiosk-main h1")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, activeChest, entered]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);


  const finishTrap = useCallback(() => setPage("home"), []);
  const revealChestScene = useCallback(() => { setChestHandoff(true); setChestOverlay(true); setPage("scene"); }, []);
  const finishChest = useCallback((from3d = false) => { setChestHandoff(from3d); setChestOverlay(false); setPage("scene"); }, []);
  const sealAppears = useCallback((index,delay) => music.engine.current?.bind(index,delay), [music.engine]);
  const doorCloses = useCallback(() => { music.engine.current?.door(); }, [music.engine]);
  function openChest(target, index) {
    if (!escaped && (pendingLights.length || answers[target.id].every(Boolean))) return;
    setActiveChest(target.id);
    setStoryEntering(false);
    setChestHandoff(false);
    const unanswered = answers[target.id].findIndex((answer) => !answer);
    setSceneIndex(index ?? Math.max(0, unanswered));
    setPage(escaped || index !== undefined ? "scene" : "chest-light");
    setTrapped(true);
    setModal(null);
  }
  function returnToRoom() { setModal(null); setPage("home"); }
  function choose(index, id) {
    if (!chest.scenes[index].options.some(option => option[0] === id)) return;
    recorder.current.choose(chest.id, index, id);
    const next = { ...answers, [chest.id]: answers[chest.id].map((old, i) => i === index ? id : old) };
    setAnswers(next);
    if (next[chest.id].every(Boolean)) {
      if (escaped) setPage("result");
      else {
        if (!answers[chest.id].every(Boolean)) setLightReveal({ chestId: chest.id, first: earnedLights(answers).length === 0 });
        setPage("home");
      }
    }
  }
  function showResult() {
    setModal(null);
    if (total === 6 && released === 6) setPage(escaped ? "result" : "escape");
  }
  function releaseLight(id, seal) {
    if (lightReveal) return;
    const next = placeLight(lightPlacements, id, seal, answers);
    if (next !== lightPlacements) { setLightPlacements(next); music.engine.current?.release(); }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else notify("이 화면에서는 전체화면을 지원하지 않아요.");
    } catch { notify("전체화면을 열지 못했어요. 다시 터치해 주세요."); }
  }
  const soundControl = (floating = false) => <button className={floating ? "exhibition-sound-toggle" : "kiosk-tool"} data-audio-toggle="true" onClick={music.toggle} aria-label={music.sound ? t("배경음 끄기") : t("배경음 켜기")} aria-pressed={music.sound}>{music.sound ? <Volume2 size={23} /> : <VolumeX size={23} />}</button>;

  if (sharedRoute) return (
    <div className="kiosk-app palace-theme shared-report">
      <LanguageSwitch />{soundControl(true)}<a className="audio-source-credit" href="/audio/credits.txt" target="_blank" rel="noreferrer">{t("음원 출처")}</a><header className="shared-report-brand"><Shell size={28} /><span>{t("수궁야행 · 나의 보물 기록")}</span></header>
      <main className="kiosk-main main-content kiosk-result">
        {sharedRoute.invalid ? <div className="invalid-result"><h1>{t("결과지 링크를 확인해 주세요.")}</h1><p>{t("여섯 선택이 담긴 올바른 QR 또는 결과 링크로 다시 열어 주세요.")}</p><a className="button button-gold" href={window.location.pathname}>{t("새 체험 시작")}</a></div> : <Suspense fallback={<p role="status">{t("나의 여섯 보물을 펼치고 있어요…")}</p>}><Result shared answers={sharedRoute.answers} notify={notify} /></Suspense>}
      </main>
      {toast && <div className="toast" role="status">{t(toast)}</div>}
    </div>
  );
  return (
    <div data-audio-stage={audioStage} data-audio-playing={music.playing} className={`kiosk-app palace-theme ${entered && page === "home" ? "is-room" : ""}`}>
      <StationNotice station={station} language={language} />
      {(!entered || ["trap", "chest-light", "escape"].includes(page)) && soundControl(true)}
      <a className="audio-source-credit" href="/audio/credits.txt" target="_blank" rel="noreferrer">{t("음원 출처")}</a>
      <div className="kiosk-stage" inert={obscured} aria-hidden={obscured ? true : undefined}>
        <LanguageSwitch onInteract={() => { engage(); continueVisit(); }} />
        {(page === "chest-light" || chestOverlay) && <ChestTransition chest={chest} initialScene={sceneIndex} first={!hasEnteredStory} onStart={startStory} onReveal={revealChestScene} onComplete={finishChest} />}
        {page === "trap" ? <TrapTransition onSeal={sealAppears} onImpact={doorCloses} onComplete={finishTrap} /> : page === "chest-light" ? null : page === "escape" ? <Escape onRevealed={escapeRevealed} onEngage={engage} onResult={() => { setEscaped(true); setTrapped(false); setPage("result"); }} /> : !entered ? <Entrance key={visit} onDoorOpen={openGateSound} onEnter={enterRoom} onEngage={beginExperience} /> : (
          <div className="kiosk-shell" inert={chestOverlay} aria-hidden={chestOverlay ? true : undefined}>
            <a className="skip-link" href="#main-content">{t("본문으로 건너뛰기")}</a>
            <header className="kiosk-header">
              <button className="kiosk-brand" onClick={returnToRoom} aria-label={t("수궁야행 보물 방")}><Shell size={32} strokeWidth={1.3} /><span>{t("수궁야행")}<small>{t("나를 찾아가는 밤")}</small></span></button>
              <ol className="kiosk-steps" aria-label={t("체험 진행 단계")}>{[t("보물 방"), t("함정 속 선택"), t("탈출과 기록")].map((label, i) => <li key={label} aria-current={i === (page === "home" ? 0 : page === "scene" ? 1 : 2) ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
              <div className="kiosk-header-actions">
                <span className="kiosk-progress" aria-label={t("찾은 보물 {0} / 6, 풀어낸 봉인 {1} / 6", total, released)}><span className="kiosk-progress-dots" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < total ? "found" : ""} />)}</span><strong><small>{t("찾은 보물")} </small>{total}<small> / 6</small></strong></span>
                <button className="kiosk-tool" onClick={() => setModal("guide")} aria-label={t("체험 안내")}><CircleHelp size={23} /></button>
                {soundControl()}
                <button className="kiosk-tool kiosk-fullscreen" onClick={fullscreen}>{t("전체화면")}</button>
                <button className="kiosk-tool" onClick={() => setModal("reset")}><RotateCcw size={19} /><span>{t("처음으로")}</span></button>
              </div>
            </header>
            <main id="main-content" className={`kiosk-main main-content kiosk-${page} ${page === "scene" && chestHandoff ? "scene-from-chest3d" : ""}`}>
              <div key={`${page}-${activeChest}`} className="kiosk-page">
                {page === "home" && <RoomHome answers={answers} chests={chests} openChest={openChest} showGuide={() => setModal("guide")} placements={lightPlacements} onRelease={releaseLight} showResult={showResult} reveal={lightReveal} onRevealComplete={finishLightReveal} playArrival={playLightArrival} />}
                {page === "scene" && <Suspense fallback={<div className="kiosk-loading" role="status">{t("일상 속 장면을 열고 있어요…")}</div>}><DualScenes key={chest.id} chest={chest} answers={answers} choose={choose} goHome={returnToRoom} initialScene={sceneIndex} /></Suspense>}
                {page === "result" && total === 6 && <Suspense fallback={<div className="kiosk-loading" role="status">{t("여섯 가지 보물을 펼치고 있어요…")}</div>}><Result answers={answers} openChest={openChest} onNextVisitor={resetVisit} notify={notify} /></Suspense>}
              </div>
            </main>
          </div>
        )}
      </div>
      {toast && <div className="toast" role="status"><Check size={19} />{t(toast)}<button aria-label={t("알림 닫기")} onClick={() => setToast("")}><X size={19} /></button></div>}
      {remaining !== null && <Modal title={t("계속 체험할까요?")} onClose={continueVisit}><p className="modal-intro">{t("잠시 손길이 멈췄어요. 계속하려면 아래 버튼을 터치해 주세요.")}</p><p className="idle-countdown"><strong>{remaining}</strong>{t("초 뒤 새로운 관람객을 맞이합니다.")}</p><div className="kiosk-modal-actions"><button className="button button-primary" onClick={continueVisit}>{t("계속 체험하기")}<ArrowRight size={20} /></button><button className="button button-outline" onClick={resetVisit}>{t("새 체험 시작")}</button></div></Modal>}
      {modal === "guide" && remaining === null && <Modal title={t("나만의 보물을 찾는 방법")} onClose={closeModal}><ol className="kiosk-guide"><li><span>01</span><div><h3>{t("봉인에 갇힌 보물의 방")}</h3><p>{t("방에 들어서자 문이 닫히고 여섯 봉인이 걸렸어요. 나가려면 세 상자 속 미션에서 여섯 보물을 찾아야 해요.")}</p></div></li><li><span>02</span><div><h3>{t("두 순간에서 하나씩 골라요")}</h3><p>{t("바다 친구의 행동을 살펴보고 터치해 주세요. 주변 빛이 밝아지면 선택이 기록되고 다음 장면으로 이어져요.")}</p></div></li><li><span>03</span><div><h3>{t("보물의 빛으로 봉인을 풀어요")}</h3><p>{t("두 미션을 마치면 상자 위에 빛 두 개가 떠올라요. 빛을 문 위 보랏빛 봉인으로 하나씩 끌어다 놓으세요. 여섯 봉인을 모두 풀고 안개를 걷으면 탈출해요. 보물의 모습과 설명은 마지막 결과지와 QR에서 만나요.")}</p></div></li></ol><p className="kiosk-visit-note">{t("정답은 없어요. 선택은 새 체험을 시작하면 초기화됩니다.")}</p><button className="button button-primary modal-cta" onClick={closeModal}>{t("좋아요, 시작할게요")}<ArrowRight size={20} /></button></Modal>}
      {modal === "reset" && remaining === null && <Modal title={t("새 체험을 시작할까요?")} onClose={closeModal}><p className="modal-intro">{t("지금까지의 선택을 비우고, 안개가 덮인 문으로 돌아갑니다.")}</p><div className="kiosk-modal-actions"><button className="button button-primary" onClick={resetVisit}>{t("새 체험 시작")}</button><button className="button button-outline" onClick={closeModal}>{t("이어서 체험하기")}</button></div></Modal>}


    </div>
  );
}
