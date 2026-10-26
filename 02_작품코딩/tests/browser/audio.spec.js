import {test,expect} from '@playwright/test';
async function track(page,id){await expect(page.locator('.kiosk-app')).toHaveAttribute('data-audio-stage',id);await expect(page.locator(`audio[data-bgm-track="${id}"][data-audio-state="active"]`)).toHaveCount(1);const status=await page.locator(`audio[data-bgm-track="${id}"][data-audio-state="active"]`).evaluate(a=>({paused:a.paused,error:a.error?.message,ready:a.readyState}));expect(status.paused).toBe(false);expect(status.error).toBeUndefined();expect(status.ready).toBeGreaterThanOrEqual(2);}
test('five real BGM tracks crossfade, repeat, mute and reset across the complete exhibition',async({page},info)=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('button',{name:'English',exact:true}).tap();await track(page,'intro');
 // A late-loop voice starts before the original ends, rather than a hard restart.
 await page.locator('audio[data-audio-state=active]').evaluate(a=>{a.currentTime=a.duration-4.3;});
 await expect(page.locator('audio[data-bgm-track=intro][data-audio-state=fading]')).toHaveCount(1);await expect(page.locator('audio[data-bgm-track=intro][data-audio-state=active]')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear all mist',exact:true}).tap();await page.getByTestId('palace-door').tap();await track(page,'room');
 await page.getByRole('button',{name:'Find the treasures and escape',exact:true}).tap();
 // Locate by the stable control attribute, independent of translated wording.
 await page.locator('[data-audio-toggle]').tap();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','false');await page.waitForTimeout(250);expect(await page.locator('audio').evaluateAll(as=>as.every(a=>a.paused))).toBe(true);
 await page.getByTestId('chest-outfit').tap();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-audio-toggle]').tap();await track(page,'room');await page.getByTestId('enter-chest-story').tap();await track(page,'mission');
 for(const [i,[id,a,b]] of [['outfit','discover','explore'],['strength','observe','craft'],['aura','nature','taste']].entries()){
  if(i){await page.getByTestId('chest-'+id).tap();await track(page,'room');await page.getByTestId('enter-chest-story').tap();await track(page,'mission');}
  const mission=page.locator('audio[data-bgm-track=mission][data-audio-state=active]');
  if(i) { const resumed=await mission.evaluate(a=>a.currentTime);expect(resumed).toBeGreaterThanOrEqual(i*12);expect(resumed).toBeLessThan(i*12+8); }
  if(i<2) await mission.evaluate((a,t)=>{a.currentTime=t;},(i+1)*12);
  await page.getByTestId('actor-'+a).tap();await page.getByTestId('actor-'+b).tap();await track(page,'room');
  for(let j=0;j<2;j++){await expect(page.getByTestId(`treasure-light-${id}-${j}`)).toBeEnabled();await page.getByTestId(`treasure-light-${id}-${j}`).tap();await page.getByTestId(`seal-target-${i*2+j}`).tap();}
 }
 await page.locator('.fog-escape').getByRole('button',{name:'Clear all mist',exact:true}).waitFor();await track(page,'escape');
 await page.locator('.fog-escape').getByRole('button',{name:'Clear all mist',exact:true}).tap();await track(page,'escape');
 await expect(page.locator('audio[data-bgm-track=escape][data-audio-state=active]')).toHaveCount(1);
 await page.getByRole('button',{name:'Reveal my six treasures',exact:true}).tap();await track(page,'result');await expect(page.locator('.treasure-result-card')).toHaveCount(6);
 await page.waitForTimeout(2000);await expect(page.locator('audio[data-bgm-track]')).toHaveCount(1);await expect(page.locator('audio[data-audio-layer=ambience][data-ambience-state=active]')).toHaveCount(1);await page.screenshot({path:info.outputPath('result-with-music.png')});
 await page.getByRole('button',{name:'Next visitor',exact:true}).tap();await track(page,'intro');await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await track(page,'intro');await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await page.getByTestId('chest-outfit').tap();await track(page,'room');await page.getByTestId('enter-chest-story').tap();await track(page,'mission');expect(await page.locator('audio[data-bgm-track=mission][data-audio-state=active]').evaluate(a=>a.currentTime)).toBeLessThan(5);expect(errors).toEqual([]);
});
test('rapid scene changes and muting do not leave orphaned music or broken touch controls',async({page})=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await track(page,'room');
 for(const id of ['outfit','strength','aura']){await page.getByTestId('chest-'+id).tap();await track(page,'room');await expect(page.locator('audio[data-bgm-track=mission][data-audio-state=active]')).toHaveCount(0);await page.getByTestId('enter-chest-story').tap();await track(page,'mission');await page.getByRole('button',{name:'보물의 방으로',exact:true}).tap();}
 await track(page,'room');await page.waitForTimeout(2100);await expect(page.locator('audio[data-bgm-track]')).toHaveCount(1);await expect(page.locator('audio[data-audio-layer=ambience][data-ambience-state=active]')).toHaveCount(1);
 await page.locator('[data-audio-toggle]').tap();await page.getByTestId('chest-aura').tap();await page.getByTestId('enter-chest-story').tap();await page.waitForTimeout(300);expect(await page.locator('audio').evaluateAll(as=>as.every(a=>a.paused))).toBe(true);
 await page.locator('[data-audio-toggle]').tap();await track(page,'mission');
});
test('backgrounding pauses music, returning resumes it, and a failed next track keeps the old music',async({page})=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await track(page,'room');await page.waitForTimeout(1800);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.locator('audio').evaluateAll(as=>as.every(a=>a.paused))).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.locator('audio[data-audio-state=active]').evaluate(a=>a.paused)).toBe(false);
 await page.route('**/audio/mission.m4a',r=>r.abort());await page.getByTestId('chest-outfit').tap();await track(page,'room');await page.getByTestId('enter-chest-story').tap();await expect(page.getByRole('status')).toContainText('배경음을 재생하지 못했어요.');
 await expect(page.locator('audio[data-bgm-track=room][data-audio-state=active]')).toHaveCount(1);await expect(page.locator('audio[data-audio-state=loading]')).toHaveCount(0);expect(await page.locator('audio[data-bgm-track=room]').evaluate(a=>a.paused)).toBe(false);
 await expect(page.getByTestId('actor-discover')).toBeEnabled();
});

test('chamber music resumes its previous position on repeated mission returns',async({page})=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await track(page,'room');
 expect(await page.locator('audio[data-bgm-track=room][data-audio-state=active]').evaluate(a=>a.currentTime)).toBeLessThan(10);
 for(const [id,position] of [['outfit',60],['strength',95]]){
  await page.locator('audio[data-bgm-track=room][data-audio-state=active]').evaluate((a,t)=>{a.currentTime=t;},position);
  await page.getByTestId('chest-'+id).tap();await track(page,'room');await page.getByTestId('enter-chest-story').tap();await track(page,'mission');await page.getByRole('button',{name:'보물의 방으로',exact:true}).tap();await track(page,'room');
  const time=await page.locator('audio[data-bgm-track=room][data-audio-state=active]').evaluate(a=>a.currentTime);expect(time).toBeGreaterThanOrEqual(position);expect(time).toBeLessThan(position+8);
 }
 await page.waitForTimeout(1900);await expect(page.locator('audio[data-bgm-track]')).toHaveCount(1);await expect(page.locator('audio[data-audio-layer=ambience][data-ambience-state=active]')).toHaveCount(1);
});
