import { useEffect, useId, useRef, useState } from "react";

export const CHEST_LIGHT_MS = 1500;

// The original photographed chest opens; only its light approaches the visitor.
export default function ChestDive({ index, active, onReveal, onComplete }) {
  const [stage, setStage] = useState("closed");
  const callbacks = useRef({ onReveal, onComplete });
  callbacks.current = { onReveal, onComplete };
  const mask = `chest-light-${useId().replace(/[^a-z0-9]/gi, "")}`;
  useEffect(() => {
    if (!active) return;
    setStage("opening");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => callbacks.current.onComplete(false), 200);
      return () => clearTimeout(timer);
    }
    const timers = [
      setTimeout(() => setStage("rush"), 320),
      setTimeout(() => { setStage("handoff"); callbacks.current.onReveal?.(); }, 1120),
      setTimeout(() => callbacks.current.onComplete(true), CHEST_LIGHT_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);
  return <div className="chest-dive chest-light-transition" data-testid="chest-dive" data-renderer="css" data-stage={stage} data-exterior="original-photograph" aria-hidden="true">
    <svg className="chest-light-opened-photo" viewBox="0 0 1875 839" preserveAspectRatio="xMidYMid slice">
      <defs><filter id={`${mask}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="1875" height="839"><rect x={[425,780,1140][index]} y="380" width="320" height="330" rx="20" fill="white" filter={`url(#${mask}-soft)`}/></mask></defs>
      <image href="/art/palace-room-open.webp" width="1875" height="839" mask={`url(#${mask})`}/>
    </svg>
    <div className="chest-light-core" />
    <div className="chest-light-sparks">{Array.from({length:12},(_,i)=><i key={i} style={{"--spark-angle":`${i*30}deg`}}/>)}</div>
  </div>;
}
