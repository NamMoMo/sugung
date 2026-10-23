const storageKey = 'sugung:lantern-launch';
const returnUrl = 'https://sugung-yahaeng-mobile.activebay64.chatgpt.site/?room_return=lantern-dream';
// The fragment keeps the short-lived room ticket out of HTTP access logs/referrers.
const fragment = new URLSearchParams(location.hash.slice(1));
const incoming = fragment.get('launch');
let token = /^[a-f0-9]{64}$/.test(incoming || '') ? incoming : null;
if (token) {
  try { sessionStorage.setItem(storageKey, token); } catch {}
  history.replaceState(null, '', `${location.pathname}${location.search}`);
} else if (new URLSearchParams(location.search).get('from') === 'sugung') {
  try { token = sessionStorage.getItem(storageKey); } catch {}
}
export const appLaunch = new URLSearchParams(location.search).get('from') === 'sugung';
let context;
const english = new URLSearchParams(location.search).get('lang') === 'en';
async function post(path, extra = {}) {
  if (!token) throw new Error(english ? 'Return to Sugung Yahaeng and enter this room again.' : '수궁야행 앱에서 다시 입장해 주세요.');
  const response = await fetch(`/api/app/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...extra }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(english ? 'Could not connect. Please try again.' : '연결하지 못했습니다. 다시 시도해 주세요.');
  return response.json();
}
export async function loadAppContext() {
  context = await post('launch');
  if (!context.ready) throw new Error(english ? 'The result from the previous room is not connected yet.' : '3번 방 결과 연결을 준비 중입니다. 앱으로 돌아가 주세요.');
  return context;
}
export async function saveAppRecord(record) {
  const result = await post('complete', { record });
  if (result.status !== 'completed' || result.visit_id !== context?.visit_id) throw new Error('Completion not confirmed');
  return result;
}
export function showAppReturn(record) {
  let actions = document.getElementById('appReturnActions');
  if (actions) return;
  actions = document.createElement('div'); actions.id = 'appReturnActions';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const button = document.createElement('button'); button.type = 'button';
  button.textContent = english ? 'Complete and return to Sugung Yahaeng' : '완료하고 수궁야행으로 돌아가기';
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = english ? 'Confirming completion…' : '완료 기록을 확인하고 있습니다…';
    try {
      await saveAppRecord(record);
      try { sessionStorage.removeItem(storageKey); } catch {}
      location.assign(returnUrl);
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  });
  actions.append(status, button);
  document.querySelector('#ending .actions').append(actions);
}
export function showAppLoadError(message, retry) {
  document.getElementById('loadInfo').textContent = message;
  document.getElementById('introActions').hidden = true;
  document.getElementById('idForm').hidden = true;
  let box = document.getElementById('appLoadActions');
  if (!box) {
    box = document.createElement('div'); box.id = 'appLoadActions';
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = english ? 'Retry' : '다시 확인';
    button.onclick = async () => { button.disabled = true; try { await retry(); } finally { button.disabled = false; } };
    const link = document.createElement('a'); link.href = returnUrl;
    link.textContent = english ? 'Return to app' : '앱으로 돌아가기';
    box.append(button, document.createTextNode(' '), link);
    document.getElementById('loadInfo').after(box);
  }
}
export function clearAppLoadError() { document.getElementById('appLoadActions')?.remove(); }
