import {test,expect} from '@playwright/test';
const pairs=[['outfit','discover','explore'],['strength','observe','craft'],['aura','nature','taste']];
async function englishOnly(page){
 const text=await page.locator('body').innerText();
 expect(text.replaceAll('한국어','')).not.toMatch(/[가-힣]/);
 const attrs=await page.locator('[aria-label],img[alt]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')||n.getAttribute('alt')).filter(x=>x&&!x.includes('Choose language')));
 expect(attrs.join('\n')).not.toMatch(/[가-힣]/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
test('English journey, live switching without losing progress, six treasures, QR language and download',async({page,context},info)=>{
 test.setTimeout(120000);
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('lang','ko');
 await page.getByRole('button',{name:'English',exact:true}).tap();
 await expect(page.getByRole('heading')).toContainText('a thick mist rolls in.');await englishOnly(page);
 await page.screenshot({path:info.outputPath('english-first-screen.png')});
 await page.getByRole('button',{name:'Clear all mist',exact:true}).tap();
 await expect(page.getByRole('heading')).toContainText('A mysterious door');await englishOnly(page);
 await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'Find the treasures and escape',exact:true}).waitFor();
 await englishOnly(page);await page.getByRole('button',{name:'Find the treasures and escape',exact:true}).tap();
 for(const [c,[chest,first,second]] of pairs.entries()){
  await page.getByTestId('chest-'+chest).tap(); await page.getByTestId("enter-chest-story").tap();await page.getByTestId('actor-'+first).waitFor();
  await englishOnly(page);
  if(c===0){
   await page.getByTestId('actor-'+first).tap();
   await page.getByTestId('actor-'+second).waitFor();
   await page.getByRole('button',{name:'한국어',exact:true}).tap();
   await expect(page.getByRole('heading',{name:'파티 후, 시간이 조금 남았어요',exact:true})).toBeVisible();
   await expect(page.locator('.kiosk-progress')).toContainText('1');
   await page.getByRole('button',{name:'English',exact:true}).tap();await englishOnly(page);
  }else{await page.getByTestId('actor-'+first).tap();await page.getByTestId('actor-'+second).waitFor();}
  await englishOnly(page);await page.screenshot({path:info.outputPath(`english-scene-${c}.png`)});
  await page.getByTestId('actor-'+second).tap();await page.getByTestId('treasure-light-'+chest+'-0').waitFor();
  await expect(page.getByTestId('treasure-light-'+chest+'-0')).toBeEnabled();await englishOnly(page);
  for(let s=0;s<2;s++){await page.getByTestId(`treasure-light-${chest}-${s}`).tap();await page.getByTestId(`seal-target-${c*2+s}`).tap();}
 }
 await page.getByRole('button',{name:'Clear all mist',exact:true}).waitFor();await englishOnly(page);
 await page.getByRole('button',{name:'Clear all mist',exact:true}).tap();
 await expect(page.getByRole('heading',{name:'The seals are released.',exact:true})).toBeVisible();await englishOnly(page);
 await page.getByRole('button',{name:'Reveal my six treasures',exact:true}).tap();await expect(page.locator('.treasure-result-card')).toHaveCount(6);await englishOnly(page);
 for(const size of [{width:1920,height:1080},{width:1536,height:864}]){
  await page.setViewportSize(size);await page.screenshot({path:info.outputPath(`english-result-${size.width}.png`),fullPage:true});
  const next=await page.getByRole('button',{name:'Next visitor',exact:true}).boundingBox();expect(next.y+next.height).toBeLessThanOrEqual(size.height);
 }
 const url=await page.getByTestId('result-share-link').getAttribute('href');expect(url).toContain('?lang=en#treasures=v1.');
 const phone=await context.newPage({viewport:{width:390,height:844}});await phone.goto(url);await expect(phone.locator('.treasure-result-card')).toHaveCount(6);await englishOnly(phone);
 const [download]=await Promise.all([phone.waitForEvent('download'),phone.getByRole('button',{name:'Save my treasure report',exact:true}).tap()]);expect(download.suggestedFilename()).toBe('sugung-my-treasures.png');await download.saveAs(info.outputPath('english-report.png'));
 await phone.screenshot({path:info.outputPath('english-phone.png'),fullPage:true});
 await phone.getByRole('button',{name:'한국어',exact:true}).tap();await expect(phone.getByRole('heading',{name:'내가 발견한 여섯 가지 보물',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Next visitor',exact:true}).tap();await expect(page.locator('html')).toHaveAttribute('lang','ko');await expect(page.locator('.fog-entrance')).toBeVisible();
 await phone.close();
});
test('the initial language choice times out for the next visitor and idle dialog can change languages',async({page})=>{
 await page.clock.install();await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('button',{name:'English',exact:true}).tap();
 await page.clock.fastForward(91000);
 await expect(page.getByRole('dialog',{name:'Would you like to continue?',exact:true})).toBeVisible();
 await page.getByRole('dialog',{name:'Would you like to continue?',exact:true}).getByRole('button',{name:'한국어',exact:true}).tap();
 await expect(page.getByRole('dialog',{name:'계속 체험할까요?',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'계속 체험하기',exact:true}).tap();
 await page.getByRole('button',{name:'English',exact:true}).tap();
 await page.clock.fastForward(106000);await expect(page.locator('html')).toHaveAttribute('lang','ko');
 await expect(page.locator('.fog-entrance')).toBeVisible();
});
