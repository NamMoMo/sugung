export function createPwaController(win, nav) {
  let prompt = null, installed = Boolean(win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone);
  const listeners = new Set();
  const state = () => ({ installed, available: !installed && Boolean(prompt) });
  const notify = () => { for (const listener of listeners) listener(state()); };
  const before = event => { event.preventDefault(); prompt = event; notify(); };
  const done = () => { installed = true; prompt = null; notify(); };
  win.addEventListener('beforeinstallprompt', before); win.addEventListener('appinstalled', done);
  const register = () => { if ('serviceWorker' in nav) void nav.serviceWorker.register('/sw.js').catch(() => {}); };
  if (win.document?.readyState === 'complete') register(); else win.addEventListener('load', register, { once: true });
  return {
    get state() { return state(); },
    subscribe(listener) { listeners.add(listener); listener(state()); return () => listeners.delete(listener); },
    async install() {
      const event = prompt; if (!event || installed) return false;
      prompt = null; notify(); await event.prompt(); await event.userChoice; return true;
    },
  };
}
export const pwa = typeof window === 'undefined' ? null : createPwaController(window, navigator);
