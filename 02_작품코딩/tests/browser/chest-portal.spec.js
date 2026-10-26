import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());});
async function room(page){await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();}
test('reading waits through language changes, entry is deliberate, actions appear after the scene and a new visitor restores the introduction',async({page},info)=>{
 await page.clock.install();await page.emulateMedia({reducedMotion:'reduce'});await room(page);await page.getByTestId('chest-outfit').tap();
 const portal=page.getByTestId('chest-mission-opening');await expect(portal).toHaveAttribute('data-first','true');
 await page.clock.fastForward(120000);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(portal).toHaveAttribute('data-phase','briefing');
 await page.getByRole('button',{name:'English',exact:true}).tap();await expect(page.getByRole('heading',{name:'Your story unfolds inside this chest.',exact:true})).toBeVisible();
 await page.clock.fastForward(120000);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByTestId('actor-discover')).toHaveCount(0);
 await page.getByRole('button',{name:'한국어',exact:true}).tap();await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await expect(page.getByTestId('chest-dive')).toHaveAttribute('data-renderer','css');await page.getByTestId('enter-chest-story').tap();await expect(portal).toHaveAttribute('data-phase','portal');expect(await page.getByTestId('chest-pull-world').evaluate(n=>new DOMMatrixReadOnly(getComputedStyle(n).transform).a)).toBeLessThanOrEqual(1.061);
 await page.clock.runFor(1510);await page.clock.resume();await expect(page.locator('.scene-arriving')).toBeVisible();await expect(page.getByTestId('actor-discover')).toBeDisabled();
 await expect(page.getByTestId('actor-discover')).toBeEnabled();await expect(page.locator('.scene-settled')).toBeVisible();
 await page.getByRole('button',{name:'보물의 방으로',exact:true}).tap();await page.getByTestId('chest-strength').tap();await expect(portal).toHaveAttribute('data-first','false');await expect(page.getByRole('heading',{name:'다음 이야기가 기다리고 있어요.',exact:true})).toBeVisible();
 await page.getByTestId('enter-chest-story').tap();await expect(page.getByTestId('actor-observe')).toBeEnabled({timeout:10000});await page.getByRole('button',{name:'처음으로',exact:true}).tap();await page.getByRole('button',{name:'새 체험 시작',exact:true}).tap();
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();await page.getByTestId('chest-aura').tap();await expect(portal).toHaveAttribute('data-first','true');
});
