export async function stationRequest(action = 'state', data, fetcher = fetch) {
  const response = await fetcher(`/api/treasure-station/${action === 'state' ? '' : action}`, {
    method: action === 'state' ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  });
  const body = await response.json();
  if (!response.ok) { const error = new Error(body.error || '체험 서버에 연결하지 못했습니다.'); error.code = body.code; throw error; }
  return body;
}

export function createStationSession({ request = stationRequest, onChange = () => {}, onActivate = () => {}, onReset = () => {} } = {}) {
  let disposed = false, serial = 0, epoch = 0, person = null, pending = null, saving = false, resetting = false;
  let holdResult = false, savedRevision = 0, resetRequested = false;
  let state = { ready: false, active: false, busy: false, completed: false, error: '', participant: null };
  const emit = patch => { if (!disposed) { state = { ...state, ...patch }; onChange(state); } };
  function clear() {
    epoch++; person = pending = null; holdResult = false; savedRevision = 0; resetRequested = false;
    onReset(); emit({ active: false, completed: false, participant: null, error: '', busy: false });
  }
  async function sync() {
    if (disposed || saving || resetting) return;
    const read = ++serial, version = epoch;
    try {
      const data = await request();
      if (disposed || read !== serial || version !== epoch) return;
      const active = data.active;
      emit({ ready: true, ...(pending ? {} : { error: '' }) });
      if (active && active.visit_id !== person?.visit_id) {
        epoch++; person = active; pending = null; holdResult = false; savedRevision = 0;
        onActivate(active); emit({ active: true, completed: false, participant: active, error: '' });
      } else if (!active && person && (!holdResult || data.last?.status === 'stopped')) clear();
    } catch (error) { emit({ error: error.message }); }
  }
  async function flush() {
    if (saving || resetting || disposed || !pending || !person) return;
    saving = true; const version = epoch, id = person.visit_id;
    emit({ busy: true, error: '' });
    try {
      while (pending && !disposed && epoch === version) {
        const snapshot = pending;
        const reply = await request('save', { visit_id: id, result: snapshot });
        if (disposed || epoch !== version) return;
        if (reply.visit_id !== id || reply.status !== 'completed' || reply.saved_revision < snapshot.revision)
          throw new Error('완료 기록을 확인하지 못했습니다. 다시 저장해 주세요.');
        savedRevision = reply.saved_revision;
        if (pending.revision <= savedRevision) pending = null;
        emit({ completed: true, error: '' });
      }
    } catch (error) {
      if (epoch === version && !disposed) {
        if (['VISIT_STOPPED', 'VISIT_NOT_CURRENT'].includes(error.code)) clear();
        else emit({ error: error.message });
      }
    } finally {
      saving = false; emit({ busy: false });
      if (resetRequested && !pending) { resetRequested = false; await reset(); }
    }
  }
  function submit(result) {
    if (!person || disposed || result.revision <= savedRevision || result.revision <= (pending?.revision || 0)) return;
    holdResult = true; pending = structuredClone(result); void flush();
  }
  async function reset() {
    if (saving || pending) { resetRequested = true; if (!saving) await flush(); return; }
    if (resetting || disposed) return;
    resetting = true; emit({ busy: true, error: '' });
    try {
      if (person) await request('release', { visit_id: person.visit_id });
      if (!disposed) clear();
    } catch (error) { emit({ error: error.message }); }
    finally { resetting = false; emit({ busy: false }); }
  }
  return { sync, submit, reset, retry: flush, get state() { return state; },
    dispose() { disposed = true; epoch++; serial++; } };
}
