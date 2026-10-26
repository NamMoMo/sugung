import React, { useEffect, useRef, useState } from 'react';
import { queueRequest } from './participant-queue.js';
import './participant-queue.css';

export default function AdminQueue() {
  const [state, setState] = useState({ active: null });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const working = useRef(false), revision = useRef(0);
  async function refresh() {
    const version = ++revision.current;
    const data = await queueRequest();
    if (version === revision.current) {
      setState({ active: data.active });
      setError('');
    }
  }
  useEffect(() => {
    let closed = false;
    async function poll() { if (!closed && !working.current) try { await refresh(); } catch (e) { if (!closed) setError(e.message); } }
    void poll(); const timer = setInterval(poll, 2000);
    return () => { closed = true; revision.current++; clearInterval(timer); };
  }, []);
  async function act(action, person) {
    if (working.current) return;
    working.current = true; revision.current++; setBusy(true); setError('');
    try { await queueRequest(action, { visit_id: person.visit_id }); await refresh(); }
    catch (e) { setError(e.message); }
    finally { working.current = false; setBusy(false); }
  }
  return <section className="participant-queue" aria-label="체험 운영 상태">
    <div className="participant-queue__panel">
      <p>수궁야행 · 역기능적 믿음 · 관리자</p><h1>체험 운영 상태</h1>
      {error && <p role="alert">{error}</p>}
      {state.active ? <div>
        <h2>체험 중</h2><p>{state.active.nickname} · {state.active.participant_code}</p>
        <p>다른 관객의 QR 입장은 체험 종료 후 가능합니다.</p>
        <button disabled={busy} onClick={() => act('release', state.active)}>체험 중지</button>
      </div> : <p role="status">입장 가능 · 관객이 QR을 스캔하면 체험이 활성화됩니다.</p>}
      <button disabled={busy} onClick={() => { if (!working.current) void refresh().catch(e => setError(e.message)); }}>상태 새로고침</button>
    </div>
  </section>;
}
