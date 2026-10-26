import { useCallback, useEffect, useRef, useState } from "react";

export const IDLE_DELAY = 90_000;
export const IDLE_GRACE = 15_000;

export default function useIdleReset(active, onReset) {
  const [remaining, setRemaining] = useState(null);
  const deadline = useRef(0);
  const lastActivity = useRef(0);
  const timer = useRef(null);
  const heldPointers = useRef(new Set());
  const resetRef = useRef(onReset);
  resetRef.current = onReset;
  const continueVisit = useCallback(() => {
    lastActivity.current = Date.now();
    deadline.current = Date.now() + IDLE_DELAY;
    setRemaining(null);
  }, []);
  useEffect(() => {
    if (!active) {
      setRemaining(null);
      return;
    }
    continueVisit();
    heldPointers.current.clear();
    const activity = (event) => {
      if (Date.now() >= deadline.current) return;
      if (event.type === "pointermove" && !event.buttons && event.pointerType !== "touch") return;
      if (Date.now() - lastActivity.current < 500) return;
      lastActivity.current = Date.now();
      deadline.current = Date.now() + IDLE_DELAY;
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel"];
    const hold = (event) => {
      if (Date.now() < deadline.current) heldPointers.current.add(event.pointerId);
    };
    const release = (event) => {
      heldPointers.current.delete(event.pointerId);
      if (Date.now() < deadline.current) deadline.current = Date.now() + IDLE_DELAY;
    };
    const blur = () => heldPointers.current.clear();
    window.addEventListener("pointerdown", hold, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", blur);
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }));
    timer.current = window.setInterval(() => {
      if (heldPointers.current.size) {
        deadline.current = Date.now() + IDLE_DELAY;
        return;
      }
      const overdue = Date.now() - deadline.current;
      if (overdue < 0) return;
      if (overdue >= IDLE_GRACE) {
        window.clearInterval(timer.current);
        resetRef.current();
      } else setRemaining(Math.ceil((IDLE_GRACE - overdue) / 1000));
    }, 500);
    return () => {
      window.clearInterval(timer.current);
      events.forEach((name) => window.removeEventListener(name, activity));
      window.removeEventListener("pointerdown", hold);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", blur);
      heldPointers.current.clear();
    };
  }, [active, continueVisit]);
  return { remaining, continueVisit };
}
