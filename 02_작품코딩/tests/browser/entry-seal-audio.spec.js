import {test,expect} from '@playwright/test';
async function enter(page){
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  window.__sealVisuals=[];window.__sealNotes=[];
  document.addEventListener('animationstart',event=>{
   if(event.animationName==='seal-strikes' && event.target.matches?.('.entry-seals > span'))window.__sealVisuals.push({index:Number(event.target.dataset.sealIndex),time:performance.now()});
  },true);
  const original=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const node=original.call(this),start=node.start.bind(node);node.start=(...args)=>{window.__sealNotes.push({frequency:node.frequency.value,time:performance.now()});return start(...args);};return node;};
 });
 await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();await expect(page.getByTestId('trap-transition')).toBeVisible();
}
test('six binding sounds follow the six visible seals once, without replay on language change',async({page})=>{
 await enter(page);
 await expect.poll(()=>page.evaluate(()=>window.__sealNotes.length)).toBe(18);
 const {visuals,notes}=await page.evaluate(()=>({visuals:window.__sealVisuals,notes:window.__sealNotes}));
 expect(visuals.map(v=>v.index)).toEqual([0,1,2,3,4,5]);
 const frequencies=[523.25,493.88,440,392,349.23,329.63];
 for(let i=0;i<6;i++){expect(notes[i*3].frequency).toBeCloseTo(frequencies[i],1);expect(Math.abs(notes[i*3].time-visuals[i].time)).toBeLessThan(100);}
 await page.getByRole('button',{name:'English',exact:true}).tap();await page.waitForTimeout(800);expect(await page.evaluate(()=>window.__sealNotes.length)).toBe(18);
});
test('muting before seals appear suppresses all six binding sounds',async({page})=>{
 await enter(page);await page.locator('[data-audio-toggle]').tap();await expect(page.locator('[data-audio-toggle]')).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>page.evaluate(()=>window.__sealVisuals.length)).toBe(6);expect(await page.evaluate(()=>window.__sealNotes.length)).toBe(0);
});
