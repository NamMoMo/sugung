import { useCallback, useEffect, useRef, useState } from "react";
import { createExhibitionAudio } from "./exhibition-audio.js";

export default function useExhibitionAudio(track, shared, notify, visit) {
  const interacted = useRef(false);
  const engine = useRef(null), desired = useRef(track), optedOut = useRef(false), active = useRef(false), notifyRef = useRef(notify);
  const [sound, setSound] = useState(false), [playing, setPlaying] = useState("");
  desired.current = track; notifyRef.current = notify;
  const ensure = useCallback(() => {
    if (!engine.current) engine.current = createExhibitionAudio({ onPlaying: setPlaying, onError: message => notifyRef.current(message) });
    engine.current.setTrack(desired.current); return engine.current;
  }, []);
  const enable = useCallback(() => {
    try { const player = ensure(); player.setEnabled(true); active.current = true; setSound(true); }
    catch (error) { notifyRef.current(error.message); }
  }, [ensure]);
  const toggle = useCallback(() => {
    interacted.current = true;
    if (active.current) { optedOut.current = true; active.current = false; engine.current?.setEnabled(false); setSound(false); }
    else { optedOut.current = false; enable(); }
  }, [enable]);
  const reset = useCallback(() => {
    engine.current?.setEnabled(false); engine.current?.reset(); active.current = false; optedOut.current = false; interacted.current = false; setSound(false);
  }, []);
  useEffect(() => { engine.current?.setTrack(track); }, [track]);
  useEffect(() => {
    if (shared) return;
    let cancelled = false;
    try {
      const player = ensure();
      player.tryAutoplay().then(started => {
        if (!cancelled && !interacted.current) { active.current = started; setSound(started); }
      });
    } catch { /* A first gesture can retry on browsers that disallow autoplay. */ }
    return () => { cancelled = true; };
  }, [shared, visit, ensure]);
  useEffect(() => {
    function gesture(event) {
      if (shared || event.target.closest?.("[data-audio-toggle]")) return;
      if (event.type === "keydown" && !["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      interacted.current = true;
      if (!active.current && !optedOut.current) enable();
      else if (active.current) engine.current?.resumeFromGesture();
    }
    function click(event) {
      const button = event.target.closest?.("button");
      if (button && !button.disabled && !button.hasAttribute("data-audio-toggle") && !button.matches('.royal-door,[data-testid="enter-chest-story"]')) engine.current?.click(button.matches(".scene-person"));
    }
    window.addEventListener("pointerdown", gesture, true); window.addEventListener("keydown", gesture, true); window.addEventListener("click", click, true);
    return () => { window.removeEventListener("pointerdown", gesture, true); window.removeEventListener("keydown", gesture, true); window.removeEventListener("click", click, true); };
  }, [enable, shared]);
  useEffect(() => () => { engine.current?.destroy(); engine.current = null; }, []);
  return { engine, sound, playing, toggle, reset };
}
