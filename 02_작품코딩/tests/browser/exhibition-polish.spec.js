import {test,expect} from '@playwright/test';
import {chests} from '../../src/journey.js';
import {resultURL} from '../../src/result-link.js';
import {translate} from '../../src/i18n-core.js';
const answers=Object.fromEntries(chests.map(c=>[c.id,c.scenes.map(s=>s.options[0][0])]));
for(const language of ['ko','en'])for(const width of [1920,390])test(`treasure inspection preserves all six results, language and focus at ${language} ${width}`,async({page},info)=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.setViewportSize({width,height:width===390?844:1080});await page.goto(resultURL(answers,'http://127.0.0.1:5173/',language));await expect(page.locator('.treasure-result-card')).toHaveCount(6);
 await page.getByTestId('inspect-discover').tap();const modal=page.getByRole('dialog');await expect(modal).toBeVisible();await expect(modal.getByRole('heading')).toHaveText(translate(language,'발견의 돋보기'));await expect(page.locator('.result-collection-content')).toHaveAttribute('inert','');
 await expect(modal.locator('.treasure-art')).toBeVisible();const art=await modal.locator('.treasure-art').boundingBox();expect(Math.abs(art.width-art.height)).toBeLessThan(2);expect(art.width).toBeGreaterThanOrEqual(width===390?210:260);await modal.getByRole('button',{name:translate(language,'다음 보물'),exact:true}).tap();await expect(modal.getByRole('heading')).toHaveText(translate(language,'새길의 나침반'));await modal.getByRole('button',{name:translate(language,'이전 보물'),exact:true}).tap();
 for(let i=0;i<7;i++)await page.keyboard.press('Tab');expect(await modal.evaluate(n=>n.contains(document.activeElement))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`treasure-inspection-${language}-${width}.png`)});
 await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);await expect(page.getByTestId('inspect-discover')).toBeFocused();await expect(page.locator('.treasure-result-card')).toHaveCount(6);
});
