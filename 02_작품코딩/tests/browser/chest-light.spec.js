import {test,expect} from '@playwright/test';
async function room(page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();}
test.beforeEach(async({page})=>{await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());});
test('original chests open, light rushes toward the visitor, and the existing missions remain selectable',async({page},info)=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await room(page);
 for(const [i,id] of ['outfit','strength','aura'].entries()){
  await page.getByTestId('chest-'+id).tap();const light=page.getByTestId('chest-dive');
  await expect(light).toHaveAttribute('data-stage','closed');await expect(light.locator('canvas')).toHaveCount(0);await expect(light.locator('image')).toHaveAttribute('href','/art/palace-room-open.webp');await expect(light.locator('.chest-light-opened-photo')).toHaveCSS('opacity','0');
  await page.screenshot({path:info.outputPath(id+'-closed.png')});await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
  await page.getByTestId('enter-chest-story').tap();await page.clock.runFor(300);await expect(light).toHaveAttribute('data-stage','opening');
  await light.locator('.chest-light-opened-photo').evaluate(n=>{n.style.transition='none';n.style.opacity='1';});await page.screenshot({path:info.outputPath(id+'-opened.png')});
  expect(await page.getByTestId('chest-pull-world').evaluate(n=>getComputedStyle(n).transform)).toBe('none');
  await page.clock.runFor(300);await expect(light).toHaveAttribute('data-stage','rush');
  await light.locator('.chest-light-core').evaluate(n=>{for(const animation of n.getAnimations()){animation.pause();animation.currentTime=350;}});await page.screenshot({path:info.outputPath(id+'-light-rush.png')});
  expect((await light.locator('.chest-light-core').boundingBox()).width).toBeGreaterThan(1000);
  await page.clock.runFor(540);await expect(light).toHaveAttribute('data-stage','handoff');await expect(page.locator('.kiosk-shell')).toHaveAttribute('inert','');
  await page.clock.runFor(390);await page.clock.resume();await expect(light).toHaveCount(0);
  const actor=page.locator('.living-person').first();await expect(actor).toBeEnabled();await page.screenshot({path:info.outputPath(id+'-mission.png')});
  if(i===0){await actor.tap();await expect(page.getByTestId('actor-explore')).toBeVisible();}
  await page.getByRole('button',{name:'보물의 방으로',exact:true}).tap();
 }
 expect(errors).toEqual([]);
});
test('light transition works without WebGL and reduced motion still reaches a selectable mission',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.__webglRequests=0;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2'){window.__webglRequests++;return null;}return original.call(this,kind,...args);};});
 await room(page);await page.getByTestId('chest-outfit').tap();await page.getByTestId('enter-chest-story').tap();await expect(page.getByTestId('actor-discover')).toBeEnabled();expect(await page.evaluate(()=>window.__webglRequests)).toBe(0);
});
