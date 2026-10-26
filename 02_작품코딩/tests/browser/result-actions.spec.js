import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {chests,selectedOptions} from '../../src/journey.js';
import {createLocalizer} from '../../src/i18n-core.js';
const answers=Object.fromEntries(chests.map(c=>[c.id,c.scenes.map(s=>s.options[4][0])]));
for(const lang of ['ko','en'])for(const width of [1920,390])test(`${lang} selected actions match choices on ${width}px report, inspection and saved image`,async({page},info)=>{
 await page.setViewportSize({width,height:1080});await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 await page.addInitScript(()=>{window.__reportText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__reportText.push(text);return original.call(this,text,...args);};});
 await page.goto('/?lang='+lang+'#treasures=v1.444444');
 const localize=createLocalizer(lang),options=chests.flatMap(c=>localize(selectedOptions(c,answers)));
 const cards=page.locator('.treasure-result-card');await expect(cards).toHaveCount(6);
 for(const [i,option] of options.entries()){
  await expect(cards.nth(i).locator('h3')).toHaveText(option.treasure.name);
  await expect(cards.nth(i).locator('.treasure-meaning')).toHaveText(option.treasure.description);
  await expect(cards.nth(i).locator('.treasure-selected-action')).toContainText(option.action);
  expect(await cards.nth(i).locator('.treasure-selected-action').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`${lang}-actions-${width}.png`),fullPage:true});
 await page.getByTestId('inspect-protect').tap();await expect(page.getByTestId('treasure-inspection').locator('.treasure-selected-action')).toContainText(options[1].action);await page.keyboard.press('Escape');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:lang==='ko'?'나의 보물 결과지 저장하기':'Save my treasure report'}).tap()]);
 const file=info.outputPath(`${lang}-saved-${width}.png`);await download.saveAs(file);const png=PNG.sync.read(await readFile(file));expect(png.width).toBe(1600);expect(png.height).toBeGreaterThan(2100);
 const drawn=(await page.evaluate(()=>window.__reportText.join(''))).replace(/\s+/g,'');for(const option of options)expect(drawn).toContain(option.action.replace(/\s+/g,''));
});
