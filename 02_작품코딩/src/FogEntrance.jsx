import { useI18n } from "./i18n";
import { FogField } from "./fog-field.js";
import { createFogRenderer } from "./fog-renderer.js";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Hand,
  Shell,
  Sparkles,
} from "./icons";

export default function FogEntrance({ onEnter, onInteract, variant = "entrance" }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const gateRef = useRef(null);
  const drawing = useRef(null);
  const renderer = useRef(null);
  const previous = useRef(null);
  const revealed = useRef(false);
  const timer = useRef(null);
  const [progress, setProgress] = useState(0);
  const [fogReady, setFogReady] = useState(false);
  const fallback = useRef(null);
  const [leaving, setLeaving] = useState(false);

  function finish() {
    if (revealed.current) return;
    onInteract?.();
    revealed.current = true;
    setProgress(100);
    renderer.current?.disperse();
    setLeaving(true);
    timer.current = window.setTimeout(
      onEnter,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 800,
    );
  }

  useEffect(() => {
    gateRef.current?.focus({ preventScroll: true });
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas=canvasRef.current;
    fallback.current=new FogField();
    const useFallback=()=>{renderer.current?.dispose();renderer.current=null;setFogReady(false);};
    const start=()=>{
      renderer.current?.dispose();
      try { renderer.current=createFogRenderer(canvas,{variant,reduced,onError:useFallback}); }
      catch { renderer.current=null; }
      setFogReady(Boolean(renderer.current));
    };
    const lost=event=>{event.preventDefault();useFallback();};
    const resize=()=>{drawing.current=null;previous.current=null;renderer.current?.resize();};
    canvas.addEventListener("contextlost",lost);canvas.addEventListener("contextrestored",start);
    start();window.addEventListener("resize",resize);
    return ()=>{window.removeEventListener("resize",resize);canvas.removeEventListener("contextlost",lost);canvas.removeEventListener("contextrestored",start);renderer.current?.dispose();renderer.current=null;window.clearTimeout(timer.current);};
  }, [variant]);

  function pushFog(event) {
    if (drawing.current !== event.pointerId || revealed.current) return;
    const rect=canvasRef.current.getBoundingClientRect();
    const point={x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};
    const percent=renderer.current ? renderer.current.push(previous.current || point,point) : fallback.current?.push(previous.current || point,point,rect.width/rect.height) || 0;
    previous.current=point;
    setProgress(old=>Math.max(old,percent));
    if(percent>=100)finish();
  }
  function stopPush(event) {
    if(drawing.current !== event.pointerId)return;
    drawing.current=null;previous.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section
      ref={gateRef}
      tabIndex={-1}
      className={`fog-entrance fog-${variant} ${leaving ? "fog-leaving" : ""}`}
      data-fog-renderer={fogReady ? "canvas" : "fallback"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fog-title"
    >
      <div className="fog-backup" aria-hidden="true" style={{ opacity:fogReady ? 0 : Math.max(.2,1-progress/110) }} />
      <canvas
        ref={canvasRef}
        aria-label={t("손가락이나 마우스로 안개를 밀어 걷어내세요")}
        onPointerDown={event=>{
          if(drawing.current!==null || (event.pointerType==="mouse" && event.button!==0))return;
          onInteract?.();drawing.current=event.pointerId;previous.current=null;
          event.currentTarget.setPointerCapture(event.pointerId);pushFog(event);
        }}
        onPointerMove={pushFog}
        onPointerUp={stopPush}
        onPointerCancel={stopPush}
        onLostPointerCapture={stopPush}
      />
      <div className="fog-brand">
        <Shell size={25} strokeWidth={1.3} />
        <span>{t("수궁야행")}</span>
      </div>
      <div
        className={`fog-invitation ${progress > 8 ? "fog-invitation-faded" : ""}`}
      >
        <span className="fog-eyebrow">
          <Sparkles size={14} /> {variant === "escape" ? "THE WAY OUT" : "A SUDDEN MIST"}
        </span>
        <h1 id="fog-title">
          {variant === "escape" ? t("봉인이 풀렸어요.") : t("갑자기,")}
          <br />
          {variant === "escape" ? t("보물의 방을 탈출하세요.") : t("짙은 안개가 밀려왔어요.")}
        </h1>
        <p>
          {variant === "escape" ? <>{t("손으로 안개를 걷어내고")}<br />{t("열린 문을 따라 보물의 방을 벗어나세요.")}</> : <>{t("앞이 보이지 않아요.")}<br />{t("손으로 안개를 걷어 볼까요?")}</>}
        </p>
        <div className="fog-hand">
          <Hand size={31} strokeWidth={1.1} />
          <span>{t("터치하고 옆으로 밀어 보세요")}</span>
        </div>
      </div>
      <div className="fog-bottom">
        <span>{t("나를 찾아 떠나는 바닷속 여정")}</span>
        <div
          className="fog-progress"
          role="progressbar"
          aria-label={t("안개 걷기 진행률")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <i style={{ width: `${progress}%` }} />
        </div>
        <button onClick={finish}>{t("안개 한 번에 걷기")}<ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
