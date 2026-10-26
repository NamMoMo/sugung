import {test,expect} from '@playwright/test';
test('gate advances through depth at one continuous speed and hands off at its actual animation end',async({page})=>{
 await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.getByRole('button',{name:'안개 한 번에 걷기'}).tap();await page.getByTestId('palace-door').tap();
 const samples=await page.evaluate(()=>new Promise(resolve=>{const values=[];function sample(time){const world=document.querySelector('.entrance-opening .gate-world');if(!world){resolve(values);return;}const z=new DOMMatrixReadOnly(getComputedStyle(world).transform).m43;values.push({time,z});requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
 expect(samples.length).toBeGreaterThan(30);expect(samples.at(-1).z).toBeGreaterThan(650);const rates=samples.slice(2,-2).map((s,i)=>(s.z-samples[i+1].z)/(s.time-samples[i+1].time));const speed=rates.reduce((a,b)=>a+b,0)/rates.length;expect(speed).toBeGreaterThan(.34);expect(speed).toBeLessThan(.39);expect(rates.every(rate=>Math.abs(rate-speed)<.04)).toBe(true);
 await expect(page.getByTestId('trap-transition')).toBeVisible();
});
