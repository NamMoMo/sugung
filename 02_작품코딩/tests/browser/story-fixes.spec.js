import { test, expect } from '@playwright/test';
for(const language of ['ko','en'])test(`fog invitation and footer never overlap in ${language}`,async({page},info)=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.goto('/');
 if(language==='en')await page.getByRole('button',{name:'English',exact:true}).tap();
 await expect(page.locator('html')).toHaveAttribute('lang',language);
 for(const size of [{width:1920,height:1080},{width:1536,height:864},{width:1536,height:752},{width:1319,height:645},{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(size);
  const bounds=await page.locator('.fog-entrance').evaluate(n=>{
   const invitation=n.querySelector('.fog-invitation').getBoundingClientRect(),footer=n.querySelector('.fog-bottom').getBoundingClientRect();
   return {invitationBottom:invitation.bottom,invitationTop:invitation.top,footerTop:footer.top,footerBottom:footer.bottom,height:innerHeight,width:innerWidth,scroll:document.documentElement.scrollWidth};
  });
  expect(bounds.invitationTop).toBeGreaterThanOrEqual(70);expect(bounds.invitationBottom+10).toBeLessThanOrEqual(bounds.footerTop);expect(bounds.footerBottom).toBeLessThanOrEqual(bounds.height);expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
  await page.screenshot({path:info.outputPath(`fog-${language}-${size.width}x${size.height}.png`)});
 }
});
test('door closing starts a visible two-beat shake at impact, with a still reduced-motion fallback',async({page},info)=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await page.getByTestId('trap-transition').waitFor();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+10)));
 await page.clock.runFor(1050);await expect(page.getByTestId('trap-transition')).toHaveAttribute('data-phase','impact');
 const values=await page.locator('.entrapment-world').evaluate(n=>{const a=n.getAnimations().find(a=>a.animationName==='entry-double-impact');if(!a)return null;a.pause();a.currentTime=60;const first=getComputedStyle(n).transform;a.currentTime=430;const second=getComputedStyle(n).transform;return {first,second,duration:a.effect.getTiming().duration};});
 expect(values).not.toBeNull();expect(values.duration).toBe(760);expect(values.first).not.toBe(values.second);expect(values.first).not.toBe('none');await page.screenshot({path:info.outputPath('restored-double-impact.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.entrapment-world')).toHaveCSS('animation-name','none');
});
