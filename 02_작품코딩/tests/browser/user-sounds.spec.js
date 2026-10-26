import {test,expect,chromium} from '@playwright/test';
test('permitted autoplay starts music while fog is still present, before any touch',async({},info)=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1920,height:1080}});
 try {await page.addInitScript(()=>{window.__interactionCount=0;for(const name of ['pointerdown','keydown','click'])window.addEventListener(name,()=>window.__interactionCount++);});await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.goto('http://127.0.0.1:5173/');await expect(page.locator('.fog-entrance')).toBeVisible();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.kiosk-app')).toHaveAttribute('data-audio-playing','intro');expect(await page.evaluate(()=>window.__interactionCount)).toBe(0);await expect.poll(()=>page.locator('audio[data-audio-state=active]').evaluate(a=>a.currentTime)).toBeGreaterThan(.1);await page.locator('[data-audio-toggle]').click();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','false');await page.locator('[data-audio-toggle]').click();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','true');await page.screenshot({path:info.outputPath('fog-autoplay.png')});} finally {await browser.close();}
});
test('blocked autoplay waits quietly, then a touch unlocks it; supplied cues follow impact and chest opening',async({page})=>{
 test.setTimeout(45000);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 await page.addInitScript(()=>{
  window.__cueStarts=[];
  const originalPlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(!navigator.userActivation.hasBeenActive)return Promise.reject(new DOMException('gesture required','NotAllowedError'));return originalPlay.call(this);};
  const original=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const node=original.call(this),start=node.start.bind(node);node.start=(...args)=>{window.__cueStarts.push({duration:node.buffer?.duration,phase:document.querySelector('[data-testid=trap-transition]')?.dataset.phase,offset:args[1]||0,time:performance.now()});return start(...args);};return node;};
 });
 await page.goto('/');await page.waitForTimeout(500);await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','false');await expect(page.locator('.toast')).toHaveCount(0);await expect(page.locator('audio')).toHaveCount(0);
 await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await expect(page.locator('.kiosk-app')).toHaveAttribute('data-audio-playing','intro');await page.getByTestId('palace-door').tap();
 await expect.poll(()=>page.evaluate(()=>window.__cueStarts.filter(c=>Math.abs(c.duration-6.552)<.04).length),{timeout:10000}).toBe(1);
 const impact=await page.evaluate(()=>window.__cueStarts.find(c=>Math.abs(c.duration-6.552)<.04));expect(impact.phase).toBe('impact');expect(impact.offset).toBeCloseTo(2.05);
 await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await page.getByTestId('chest-outfit').tap();await expect(page.getByTestId('chest-mission-opening')).toBeVisible();
 await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__cueStarts.filter(c=>Math.abs(c.duration-5.094)<.04).length)).toBe(0);
 await page.getByTestId('enter-chest-story').tap();await expect.poll(()=>page.evaluate(()=>window.__cueStarts.filter(c=>Math.abs(c.duration-5.094)<.04).length)).toBe(1);
 await expect(page.getByTestId('actor-discover')).toBeEnabled({timeout:10000});
 expect(await page.evaluate(()=>window.__cueStarts.some(c=>Math.abs(c.duration-.888)<.04))).toBe(true);
 await page.locator('[data-audio-toggle]').tap();const before=await page.evaluate(()=>window.__cueStarts.length);await page.getByTestId('actor-discover').tap();expect(await page.evaluate(()=>window.__cueStarts.length)).toBe(before);
});
test('iron gate plays at the first door; chest sound waits for portal entry and plays once',async({page})=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{window.__starts=[];const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start.bind(source);source.start=(...args)=>{window.__starts.push({duration:source.buffer?.duration,at:performance.now()});return start(...args);};return source;};});
 await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.waitForTimeout(400);await page.getByTestId('palace-door').tap();await expect(page.locator('.entrance-opening')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__starts.filter(s=>Math.abs(s.duration-1.8)<.025).length)).toBe(1);
 await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await page.getByTestId('chest-outfit').tap();await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__starts.filter(s=>Math.abs(s.duration-5.094)<.04).length)).toBe(0);
 await page.getByTestId('enter-chest-story').tap();await expect(page.getByTestId('chest-mission-opening')).toHaveAttribute('data-phase','portal');await expect.poll(()=>page.evaluate(()=>window.__starts.filter(s=>Math.abs(s.duration-5.094)<.04).length)).toBe(1);
 await expect(page.getByTestId('actor-discover')).toBeEnabled({timeout:10000});await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__starts.filter(s=>Math.abs(s.duration-5.094)<.04).length)).toBe(1);
});
