import {test,expect} from '@playwright/test';
import {chests} from '../../src/journey.js';
import {translate} from '../../src/i18n-core.js';
for(const lang of ['ko','en'])test(`${lang}: categories stay hidden through every chest and both scenes, then appear on the report`,async({page},info)=>{
 test.setTimeout(60000);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});const t=key=>translate(lang,key);
 await page.goto('/');if(lang==='en')await page.getByRole('button',{name:'English',exact:true}).tap();await page.getByRole('button',{name:t('안개 한 번에 걷기'),exact:true}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:t('보물을 찾아 탈출하기'),exact:true}).tap();
 async function hidden(){const content=await page.locator('body').innerText(),labels=await page.locator('[aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')).join('\n'));for(const chest of chests){expect(content).not.toContain(t(chest.name));expect(labels).not.toContain(t(chest.name));}}
 await hidden();for(const [i,chest]of chests.entries()){const label=page.getByTestId('chest-'+chest.id).locator('.royal-chest-label');await expect(label.locator('small')).toHaveText('CHEST '+(i+1));await expect(label.locator('strong')).toHaveCount(0);await expect(label.locator('span')).toHaveText(t('상자를 터치해 보세요'));const box=await label.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(1081);}
 await page.screenshot({path:info.outputPath(lang+'-room.png')});
 for(const [i,chest]of chests.entries()){
  await page.getByTestId('chest-'+chest.id).tap();await hidden();await expect(page.locator('.chest-mission-copy .eyebrow')).toHaveText('CHEST '+(i+1));await page.getByTestId('enter-chest-story').tap();await expect(page.locator('.living-person').first()).toBeEnabled();await hidden();
  await expect(page.locator('.current-situation .eyebrow')).toContainText('CHEST '+(i+1));await page.locator('.scene-moments button').nth(1).tap();await hidden();await expect(page.locator('.current-situation h1')).toHaveText(t(chest.scenes[1].name));
  await page.screenshot({path:info.outputPath(`${lang}-${chest.id}-scene.png`)});await page.getByRole('button',{name:t('보물의 방으로'),exact:true}).tap();await hidden();
 }
 await page.goto('/?lang='+lang+'#treasures=v1.444444');for(const chest of chests)await expect(page.getByRole('heading',{name:t(chest.name),exact:true})).toBeVisible();await expect(page.locator('.treasure-result-card')).toHaveCount(6);await expect(page.locator('.treasure-selected-action')).toHaveCount(6);
});
test('water dominates the new room mix and both continuous audio layers follow the mission',async({page})=>{
 await page.addInitScript(()=>{window.__mixLinks=[];const original=AudioNode.prototype.connect;AudioNode.prototype.connect=function(to,...rest){window.__mixLinks.push({from:this,to});return original.call(this,to,...rest);};});
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 const mix=()=>page.evaluate(()=>({water:window.__mixLinks.find(e=>e.from.type==='lowpass'&&e.from.frequency?.value===5000)?.to.gain.value,music:window.__mixLinks.find(e=>e.from.mediaElement?.dataset.audioState==='active')?.to.gain.value}));
 await expect.poll(async()=>{const v=await mix();return v.water>.28&&v.water<.32&&v.music>.23&&v.music<.27;}).toBe(true);
 await page.getByTestId('chest-outfit').tap();await page.getByTestId('enter-chest-story').tap();await expect(page.getByTestId('actor-discover')).toBeEnabled();await expect.poll(async()=>{const v=await mix();return v.water>.22&&v.water<.26&&v.music>.22&&v.music<.26;},{timeout:6000}).toBe(true);
});
