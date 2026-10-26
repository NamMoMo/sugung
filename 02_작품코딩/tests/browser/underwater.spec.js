import {test,expect} from '@playwright/test';
test('photographic jellyfish and masked underwater exit preserve touch, language and results',async({page},info)=>{
 test.setTimeout(90000);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'보물을 찾아 탈출하기'}).tap();
 await expect(page.locator('.ocean-jelly image')).toHaveCount(2);await expect(page.locator('.ocean-jelly path')).toHaveCount(0);await expect(page.locator('.ocean-jelly image').first()).toHaveAttribute('href','/art/jellyfish-realistic.webp');
 const imageOK=await page.evaluate(async()=>{const im=new Image();im.src='/art/jellyfish-realistic.webp';await im.decode();return im.naturalWidth>500;});expect(imageOK).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.screenshot({path:info.outputPath('room-realistic-jellyfish.png')});await page.emulateMedia({reducedMotion:'reduce'});
 for(const [c,[id,a,b]]of [['outfit','discover','explore'],['strength','observe','craft'],['aura','nature','taste']].entries()){
  await page.getByTestId('chest-'+id).tap();await page.getByTestId('enter-chest-story').tap();await page.getByTestId('actor-'+a).tap();await page.getByTestId('actor-'+b).tap();
  for(let i=0;i<2;i++){await expect(page.getByTestId(`treasure-light-${id}-${i}`)).toBeEnabled();await page.getByTestId(`treasure-light-${id}-${i}`).tap();await page.getByTestId(`seal-target-${c*2+i}`).tap();}
 }
 await page.locator('.fog-escape').getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByRole('button',{name:'획득한 여섯 보물 확인하기'}).waitFor();
 const water=page.getByTestId('exit-underwater');await expect(water).toHaveAttribute('data-moving','false');await expect(water.locator('animate')).toHaveCount(0);await expect(water).toHaveCSS('pointer-events','none');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(water).toHaveAttribute('data-moving','true');await expect(water.locator('animate')).toHaveCount(1);
 const samples=await water.locator('feTurbulence[result=water]').evaluate(n=>{const svg=n.ownerSVGElement;svg.pauseAnimations();svg.setCurrentTime(2);const a=n.baseFrequencyX.animVal;svg.setCurrentTime(8);return[a,n.baseFrequencyX.animVal];});expect(samples[0]).not.toBe(samples[1]);
 await expect(water.locator('.ocean-refraction')).toHaveAttribute('href','/art/palace-exit-open.webp');
 await page.waitForTimeout(1500);await page.screenshot({path:info.outputPath('underwater-exit-1920.png')});
 for(const size of [{width:1536,height:864},{width:1319,height:645}]){await page.setViewportSize(size);const r=await water.boundingBox();const base=await page.locator('.escape-palace').boundingBox();expect(r).toEqual(base);await page.screenshot({path:info.outputPath(`underwater-exit-${size.width}.png`)});}
 await page.getByRole('button',{name:'English',exact:true}).tap();await expect(page.getByRole('button',{name:'Reveal my six treasures'})).toBeVisible();await page.getByRole('button',{name:'Reveal my six treasures'}).tap();await expect(page.locator('.treasure-result-card')).toHaveCount(6);
});
