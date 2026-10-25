import React, { useEffect, useRef, useState } from 'react';
import ParticipantQueue from './ParticipantQueue.jsx';
import { orderWaiting, queueRequest } from './participant-queue.js';

export default function AdminQueue() {
  const [state, setState] = useState({ waiting: [], active: null });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const working = useRef(false), revision = useRef(0);
  async function refresh() {
    const version = ++revision.current;
    const data = await queueRequest();
    if (version === revision.current) {
      setState({ ...data, waiting: orderWaiting(data.waiting, data.active?.visit_id) });
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
  return <ParticipantQueue state={state} error={error} busy={busy}
    onSelect={person => act('claim', person)} onRelease={() => state.active && act('release', state.active)}
    onRefresh={() => { if (!working.current) void refresh().catch(e => setError(e.message)); }}/>;
}
