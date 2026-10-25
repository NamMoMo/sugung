export function orderWaiting(visits, activeId) {
  return visits.filter(v => v.visit_id !== activeId).sort((a, b) =>
    Date.parse(a.entered_at) - Date.parse(b.entered_at) || a.visit_id.localeCompare(b.visit_id));
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
  return {
    schema_version: 1, interaction_count: session.count,
    remaining_keywords: session.labels.filter(l => !l.own).map(l => l.text),
    added_keywords: session.labels.filter(l => l.own).map(l => l.text),
    final_keywords: session.labels.map(l => l.text),
  };
}
