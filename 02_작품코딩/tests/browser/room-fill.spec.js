import {test,expect} from '@playwright/test';
for(const lang of ['ko','en'])test(`${lang} room fills the viewport before and after a mission and on resize`,async({page},info)=>{
 test.setTimeout(65000);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 if(lang==='en')await page.getByRole('button',{name:'English',exact:true}).tap();
 async function check(label){
  const vp=await page.locator('.royal-room-viewport').boundingBox(),art=await page.locator('.royal-room-canvas').boundingBox();
  const size=page.viewportSize();expect(Math.abs(vp.width-size.width)).toBeLessThan(2);expect(Math.abs(vp.y+vp.height-size.height)).toBeLessThan(2);
  expect(art.x).toBeLessThanOrEqual(vp.x+1);expect(art.x+art.width).toBeGreaterThanOrEqual(vp.x+vp.width-1);expect(art.y).toBeLessThanOrEqual(vp.y+1);expect(art.y+art.height).toBeGreaterThanOrEqual(vp.y+vp.height-1);
  for(const id of ['outfit','strength','aura']){
   const button=page.getByTestId('chest-'+id),box=await button.locator('.royal-chest-label').boundingBox();expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
  await page.screenshot({path:info.outputPath(`${lang}-${label}-${size.width}.png`)});
 }
 for(const size of [{width:1920,height:1080},{width:1366,height:768},{width:2560,height:1080},{width:1024,height:768}]){await page.setViewportSize(size);await page.waitForTimeout(100);await check('initial');}
 await page.setViewportSize({width:1920,height:1080});await page.getByTestId('chest-aura').tap();await page.getByTestId('enter-chest-story').tap();await page.getByTestId('actor-nature').tap();await expect(page.getByTestId('actor-taste')).toBeEnabled();await page.getByTestId('actor-taste').tap();await expect(page.getByTestId('treasure-light-aura-0')).toBeEnabled();
 await check('returned');await page.getByTestId('treasure-light-aura-0').tap();await page.getByTestId('seal-target-0').tap();await page.getByTestId('treasure-light-aura-1').tap();await page.getByTestId('seal-target-1').tap();await expect(page.locator('.rune-released')).toHaveCount(2);await check('released');
 await page.getByTestId('chest-outfit').tap();await expect(page.getByTestId('chest-mission-opening')).toBeVisible();
});
