import {LIMIT} from './interaction.js';
import { useEffect, useRef, useState } from 'react';
import { queueRequest, resultForSession, selectionChanged } from './participant-queue.js';

export function useParticipantQueue(onStart, scene, session) {
  const [show, setShow] = useState(true), [state, setState] = useState({ active: null });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const selected = useRef(null), blocked = useRef(true), valid = useRef(true), working = useRef(false);
  const endingVisible = useRef(false);
  const revision = useRef(0), readSerial = useRef(0), alive = useRef(true);
  const latest = useRef({ onStart, session }); latest.current = { onStart, session };
  const refresh = async () => {
    const started = revision.current;
    const serial = ++readSerial.current;
    const data = await queueRequest();
    if (!alive.current || started !== revision.current || serial !== readSerial.current) return data;
    setState({ active: data.active });
    const change = selectionChanged(selected.current?.visit_id, data.active);
    if (change.stop && !endingVisible.current) {
      selected.current = null; blocked.current = true; setShow(true);
      latest.current.onStart();
      setError('');
    }
    if (change.start) begin(data.active);
    return data;
  };
  useEffect(() => {
    alive.current = true;
    let disposed = false;
    async function poll() {
      if (!working.current) {
        try { await refresh(); } catch (e) { if (!disposed) setError(e.message); }
      }
    }
    void poll(); const timer = setInterval(poll, 2000);
    return () => { disposed = true; alive.current = false; clearInterval(timer); };
  }, []);
  async function run(task) {
    if (working.current) return;
    revision.current++;
    working.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e.message); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }
  function begin(person) {
    endingVisible.current = false;
    setCompletionError(false);
    latest.current.onStart(); selected.current = person; valid.current = true;
    setState({ active: person });
    blocked.current = false; setShow(false); setError('');
  }
  function release() {
    if (working.current) return;
    blocked.current = true; setShow(true);
    return run(async () => {
      const person = selected.current || state.active;
      if (person) await queueRequest('release', { visit_id: person.visit_id });
      selected.current = null; endingVisible.current = false; latest.current.onStart(); await refresh();
      setCompletionError(false);
    });
  }
  function finish() {
    const person = selected.current;
    if (!person || working.current) return;
    blocked.current = true; endingVisible.current = true;
    // 09 is part of the artwork. Saving completion must not cover it with the waiting screen.
    setShow(false);
    if (!valid.current || latest.current.session.count !== LIMIT) {
      setError('관리자 장면 이동 또는 테스트 체험입니다. 완료 기록 없이 초기화해 주세요.'); return;
    }
    return run(async () => {
      try {
        await queueRequest('complete', { visit_id: person.visit_id, result: resultForSession(latest.current.session) });
        selected.current = null; setCompletionError(false); await refresh();
      } catch (e) { setCompletionError(true); throw e; }
    });
  }
  useEffect(() => { if (scene === 'escaped') void finish(); }, [scene]);
  return { show, state, error, busy, completionError, blocked, valid, working, release,
    refresh: () => run(refresh), retryFinish: finish };
}
