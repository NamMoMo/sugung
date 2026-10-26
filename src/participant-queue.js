export function selectionChanged(selectedId, active) {
  return {
    stop: Boolean(selectedId && selectedId !== active?.visit_id),
    start: Boolean(active && active.visit_id !== selectedId),
  };
}

export async function queueRequest(action = 'state', data, fetcher = fetch) {
  const response = await fetcher(`/api/participant-queue/${action === 'state' ? '' : action}`, {
    method: action === 'state' ? 'GET' : 'POST', cache: 'no-store',
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '대기 명단을 불러오지 못했습니다.');
  return body;
}

export function resultForSession(session) {
  const history = session.history || [];
  const finalKeywords = session.labels.map(l => l.text);
  const iso = value => Number.isFinite(value) ? new Date(value).toISOString() : null;
  return {
    schema_version: 2, room_id: 'beliefs', team_id: 1,
    started_at: iso(session.startedAt), finished_at: iso(session.finishedAt),
    duration_ms: Number.isFinite(session.startedAt) && Number.isFinite(session.finishedAt) ? Math.max(0, session.finishedAt - session.startedAt) : null,
    completion_mode: 'normal',
    summary: { keywords: finalKeywords },
    interaction_count: session.count,
    remaining_keywords: session.labels.filter(l => !l.own).map(l => l.text),
    added_keywords: session.labels.filter(l => l.own).map(l => l.text),
    discarded_keywords: history.filter(event => event.type === 'discard').map(event => event.text),
    discarded_initial_keywords: history.filter(event => event.type === 'discard' && event.source === 'initial').map(event => event.text),
    all_added_keywords: history.filter(event => event.type === 'add').map(event => event.text),
    final_keywords: finalKeywords,
    history: history.map(event => ({ ...event, at: iso(event.at), elapsed_ms: Number.isFinite(session.startedAt) ? Math.max(0, event.at - session.startedAt) : null })),
  };
}
