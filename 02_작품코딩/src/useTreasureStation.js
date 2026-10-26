import { useCallback, useEffect, useRef, useState } from 'react';
import { createStationSession } from './station-session.js';

export function useTreasureStation({ enabled, onReset }) {
  const controller = useRef(null), latest = useRef(onReset); latest.current = onReset;
  const [state, setState] = useState({ ready: false, active: false, busy: false, completed: false, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const session = createStationSession({ onChange: setState,
      onActivate: () => latest.current(), onReset: () => latest.current() });
    controller.current = session;
    const sync = () => { if (!document.hidden) void session.sync(); };
    sync(); const timer = setInterval(sync, 2000);
    document.addEventListener('visibilitychange', sync); window.addEventListener('online', sync);
    return () => {
      clearInterval(timer); session.dispose(); controller.current = null;
      document.removeEventListener('visibilitychange', sync); window.removeEventListener('online', sync);
    };
  }, [enabled]);
  const reset = useCallback(() => controller.current?.reset(), []);
  const submit = useCallback(result => controller.current?.submit(result), []);
  const retry = useCallback(() => { void controller.current?.retry(); void controller.current?.sync(); }, []);
  return { ...state, enabled, reset, submit, retry };
}
