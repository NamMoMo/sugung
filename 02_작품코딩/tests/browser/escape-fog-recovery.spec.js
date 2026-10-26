import {test,expect} from '@playwright/test';
async function reachExit(page){
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 for(const [i,[id,a,b]] of [['outfit','discover','explore'],['strength','observe','craft'],['aura','nature','taste']].entries()){
  await page.getByTestId('chest-'+id).tap();await page.getByTestId('enter-chest-story').tap();await page.getByTestId('actor-'+a).tap();await page.getByTestId('actor-'+b).tap();
  for(let j=0;j<2;j++){await expect(page.getByTestId(`treasure-light-${id}-${j}`)).toBeEnabled();await page.getByTestId(`treasure-light-${id}-${j}`).tap();await page.getByTestId(`seal-target-${i*2+j}`).tap();}
 }
 await expect(page.locator('.fog-escape')).toBeVisible();
}
async function swipe(page){await page.mouse.move(300,450);await page.mouse.down();await page.mouse.move(1100,490,{steps:16});await page.mouse.up();await expect.poll(async()=>Number(await page.locator('.fog-escape [role=progressbar]').getAttribute('aria-valuenow'))).toBeGreaterThan(0);}
test('final fog survives drawing failure and context loss, recovers, and still clears to the exit',async({page},info)=>{
 test.setTimeout(65000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await reachExit(page);
 const fog=page.locator('.fog-escape'),canvas=fog.locator('canvas');await expect(fog).toHaveAttribute('data-fog-renderer','canvas');
 const color=await canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,1,1).data));expect(color[2]).toBeGreaterThan(color[1]);expect(color[3]).toBeGreaterThan(220);
 await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.putImageData;CanvasRenderingContext2D.prototype.putImageData=function(...args){CanvasRenderingContext2D.prototype.putImageData=original;throw new Error('simulated canvas draw failure');};window.dispatchEvent(new Event('resize'));});
 await expect(fog).toHaveAttribute('data-fog-renderer','fallback');await expect(fog.locator('.fog-backup')).toHaveCSS('opacity','1');await swipe(page);await page.screenshot({path:info.outputPath('fallback-purple-fog.png')});
 await canvas.dispatchEvent('contextrestored');await expect(fog).toHaveAttribute('data-fog-renderer','canvas');await canvas.dispatchEvent('contextlost');await expect(fog).toHaveAttribute('data-fog-renderer','fallback');await canvas.dispatchEvent('contextrestored');await expect(fog).toHaveAttribute('data-fog-renderer','canvas');
 await fog.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await expect(page.locator('.escape-success')).toBeVisible();await page.getByRole('button',{name:'획득한 여섯 보물 확인하기'}).tap();await expect(page.locator('.treasure-result-card')).toHaveCount(6);expect(errors).toEqual([]);
});
test('final fog remains visible and touchable when the canvas context cannot be created',async({page})=>{
 test.setTimeout(65000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){if(this.closest('.fog-escape'))return null;return original.apply(this,args);};});
 await reachExit(page);await expect(page.locator('.fog-escape')).toHaveAttribute('data-fog-renderer','fallback');await expect(page.locator('.fog-escape .fog-backup')).toHaveCSS('opacity','1');await swipe(page);await page.locator('.fog-escape').getByRole('button',{name:'안개 한 번에 걷기'}).tap();await expect(page.locator('.escape-success')).toBeVisible();expect(errors).toEqual([]);
});
