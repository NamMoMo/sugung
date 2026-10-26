import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());});
test('exterior gate, light-only inscription, dark doorway, living windows and all three chest targets',async({page},info)=>{
 test.setTimeout(60000);await page.clock.install();await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await expect(page.getByTestId('palace-door')).toBeEnabled();
 await expect(page.locator('.gate-plate')).toHaveAttribute('src','/art/palace-entrance-exterior.webp');
 const cue=page.locator('.royal-door-touch');await expect(cue).toHaveCSS('border-top-width','0px');await expect(cue).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(cue.locator('svg')).toHaveCount(0);
 await page.locator('.gate-plate').evaluate(img=>img.decode());await page.screenshot({path:info.outputPath('exterior-door-inscription.png')});
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));await page.getByTestId('palace-door').tap();
 const entry=await page.locator('.royal-entrance').evaluate(n=>{for(const a of n.getAnimations({subtree:true})){a.pause();a.currentTime=1450;}return getComputedStyle(n.querySelector('.gate-world')).transform;});expect(entry).not.toBe('none');await expect(page.locator('.gate-gap')).toHaveCSS('background-image','none');await expect(page.locator('.gate-gap')).toHaveCSS('background-color','rgb(0, 0, 0)');expect(await page.locator('.gate-world').evaluate(n=>new DOMMatrixReadOnly(getComputedStyle(n).transform).m43)).toBeGreaterThan(400);await page.screenshot({path:info.outputPath('entering-the-gate.png')});
 await expect(page.locator('.gate-dark-passage')).toHaveCount(0);await page.locator('.gate-world').evaluate(n=>{for(const a of n.getAnimations()){a.pause();a.currentTime=2350;}});const aperture=await page.locator('.gate-gap').boundingBox();expect(aperture.width).toBeGreaterThan(1920);expect(aperture.height).toBeGreaterThan(1080);await page.screenshot({path:info.outputPath('doorway-black-passage.png')});
 await page.locator(".gate-world").evaluate(n=>n.dispatchEvent(new AnimationEvent("animationend",{bubbles:true,animationName:"gate-forward-passage"})));await page.clock.runFor(20);await expect(page.getByTestId('trap-transition')).toBeVisible();await page.locator('.entrapment-room').evaluate(img=>img.decode());await page.locator('.entrapment-world').evaluate(n=>{for(const a of n.getAnimations({subtree:true})){if(a.animationName==='chamber-arrival'){a.pause();a.currentTime=500;}}});await page.clock.runFor(450);await page.screenshot({path:info.outputPath('walking-into-room.png')});await page.clock.runFor(4500);await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 const sea=page.getByTestId('living-ocean');await expect(sea).toHaveCount(1);await expect(sea).toHaveAttribute('aria-hidden','true');await expect(sea).toHaveCSS('pointer-events','none');
 const movement=await page.locator('.ocean-school').first().evaluate(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=1000;const first=getComputedStyle(n).transform;a.currentTime=7000;return [first,getComputedStyle(n).transform];});expect(movement[0]).not.toBe(movement[1]);
 await page.locator('.kiosk-page').evaluate(n=>n.getAnimations().forEach(a=>a.finish()));await page.screenshot({path:info.outputPath('living-window-room.png')});
 for(const [i,id]of ['outfit','strength','aura'].entries()){
  await page.getByTestId('chest-'+id).tap();const portal=page.getByTestId('chest-mission-opening');await expect(portal).toBeVisible();
  await expect(portal).toHaveAttribute('data-phase','briefing');
  await expect(portal).toHaveAttribute('data-first',String(i===0));
  await page.clock.runFor(120000);await expect(portal).toHaveAttribute('data-phase','briefing');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`chest-briefing-${id}.png`)});
  await page.getByTestId('enter-chest-story').tap();
  await expect(portal).toHaveAttribute('data-phase','portal');
  expect(await page.getByTestId('chest-pull-world').evaluate(n=>new DOMMatrixReadOnly(getComputedStyle(n).transform).a)).toBeLessThanOrEqual(1.061);
  await expect(page.getByTestId('chest-dive')).toHaveAttribute('data-renderer','css');
  await expect(page.locator('.chest-pull-lid')).toHaveCount(0);
  await portal.evaluate(n=>{for(const a of n.getAnimations({subtree:true})){a.pause();a.currentTime=800;}});await page.screenshot({path:info.outputPath(`chest-descent-${id}.png`)});
  await page.clock.runFor(5300);await page.clock.resume();await expect(page.locator('.photo-scene')).toBeVisible();await page.getByRole('button',{name:'보물의 방으로',exact:true}).tap();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 }
});
test('reduced motion keeps door and chest navigation working without continuous water or camera animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await expect(page.locator('.royal-door-touch')).toHaveCSS('animation-name','none');await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 await expect(page.locator('.ocean-school').first()).toHaveCSS('animation-name','none');await expect(page.locator('.ocean-caustic-light')).toHaveCSS('animation-name','none');await page.getByTestId('chest-strength').tap();await page.getByTestId('enter-chest-story').tap();await expect(page.getByTestId('actor-observe')).toBeVisible();
});
