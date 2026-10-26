import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPwaController } from '../src/pwa.js';

test('PWA manifest, HTML and PNG icons meet standalone installation requirements', () => {
  const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.scope, '/'); assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/?source=pwa'); assert.equal(manifest.orientation, 'landscape');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    const png = fs.readFileSync(`public${icon.src}`);
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
  assert.match(fs.readFileSync('index.html', 'utf8'), /rel="manifest"/);
});
test('install promotion uses a user gesture, hides after installation, and tolerates SW failure', async () => {
  const win = Object.assign(new EventTarget(), { document: { readyState: 'complete' }, matchMedia: () => ({ matches: false }) });
  const controller = createPwaController(win, { serviceWorker: { register: async () => { throw new Error('offline'); } } });
  assert.equal(controller.state.available, false);
  let prompted = 0;
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: async () => prompted++, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  win.dispatchEvent(event); assert.equal(event.defaultPrevented, true); assert.equal(controller.state.available, true);
  assert.equal(prompted, 0); await controller.install(); assert.equal(prompted, 1);
  win.dispatchEvent(new Event('appinstalled')); assert.equal(controller.state.installed, true); assert.equal(controller.state.available, false);
});
test('service worker never intercepts API or remote requests; offline navigation gets an explicit notice', async () => {
  const events = {}; let response;
  const self = { location: { origin: 'https://exhibition.example' }, addEventListener: (name, listener) => { events[name] = listener; } };
  const cache = { match: async () => new Response('offline notice') };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, caches: cache, URL, Response, fetch: async () => { throw new Error('offline'); } });
  const dispatch = request => events.fetch({ request, respondWith: promise => { response = promise; } });
  for (const pathname of ['/api/treasure-station/', '/api/treasure-station/save']) {
    response = undefined; dispatch({ method: 'GET', mode: 'navigate', url: `https://exhibition.example${pathname}` }); assert.equal(response, undefined);
  }
  dispatch({ method: 'GET', mode: 'navigate', url: 'https://outside.example/' }); assert.equal(response, undefined);
  dispatch({ method: 'GET', mode: 'navigate', url: 'https://exhibition.example/' }); assert.equal(await (await response).text(), 'offline notice');
});
