import { test, expect } from '@playwright/test';
import { chests } from '../../src/journey.js';
import { treasures } from '../../src/treasure-data.js';
import { createLocalizer } from '../../src/i18n-core.js';
const en=createLocalizer('en');
async function audit(page,selector,minFont,{viewport=true}={}) {
 const issues=await page.locator(selector).evaluateAll((nodes,{minFont,viewport})=>nodes.flatMap(n=>{
  const style=getComputedStyle(n),box=n.getBoundingClientRect();if(!box.width||!box.height||style.display==='none')return [];
  const problems=[];const text=n.textContent.trim();
  if(parseFloat(style.fontSize)<minFont)problems.push(`font ${style.fontSize}`);
  const range=document.createRange();range.selectNodeContents(n);
  for(const line of range.getClientRects()){
   if(line.width<1||line.height<1)continue;
   if(viewport&&(line.left< -1||line.right>innerWidth+1||line.top< -1||line.bottom>innerHeight+1))problems.push('outside viewport');
   for(let p=n;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p),r=p.getBoundingClientRect();if(/hidden|clip|auto|scroll/.test(s.overflowX)&& (line.left<r.left-2||line.right>r.right+2))problems.push('horizontal clipping');if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(line.top<r.top-2||line.bottom>r.bottom+2))problems.push('vertical clipping');}
  }
  return problems.length?[`${text}: ${[...new Set(problems)].join(', ')}`]:[];
 }),{minFont,viewport});
 expect(issues).toEqual([]);
}
for(const size of [{width:1920,height:1080},{width:1536,height:864}])test(`English exhibit copy stays readable at ${size.width} × ${size.height}`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize(size);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'English',exact:true}).tap();await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.fog-hand > span')).toHaveCSS('font-size','20px');
 await audit(page,'.fog-invitation h1,.fog-invitation p,.fog-hand span',20);
 await page.getByRole('button',{name:'Clear all mist',exact:true}).tap();await page.getByTestId('palace-door').waitFor();await audit(page,'.royal-door-invitation h1,.royal-door-invitation p,.royal-door-touch',22);await page.screenshot({path:info.outputPath(`door-${size.width}.png`)});await page.getByTestId('palace-door').tap();await page.getByRole('button',{name:'Find the treasures and escape',exact:true}).waitFor();await audit(page,'.entrapment-copy h1,.entrapment-copy p',22);await page.screenshot({path:info.outputPath(`trap-${size.width}.png`)});await page.getByRole('button',{name:'Find the treasures and escape',exact:true}).tap();
 for(const [c,chest]of chests.entries()){
  await audit(page,'.royal-room-heading h1,.royal-room-heading p,.royal-chest-label strong',18);
  await page.getByTestId('chest-'+chest.id).tap(); await audit(page,".chest-mission-copy h1,.chest-mission-copy p,.chest-mission-copy .button",23);await page.screenshot({path:info.outputPath(`briefing-${chest.id}-${size.width}.png`)}); await page.getByTestId("enter-chest-story").tap();await page.getByTestId('actor-'+chest.scenes[0].options[0][0]).waitFor();
  for(let s=0;s<2;s++){
   const scene=chest.scenes[s];await audit(page,'.current-situation h1,.current-situation p,.scene-story,.action-at-a-glance strong,.living-person-action strong',18);
   // Every pill must stay inside the scene and separate from other pills.
   const collisions=await page.locator('.living-person-action').evaluateAll(nodes=>nodes.flatMap((n,i)=>{const a=n.getBoundingClientRect();return nodes.slice(i+1).flatMap(m=>{const b=m.getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)+2&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+2?[n.textContent+' / '+m.textContent]:[];});}));expect(collisions).toEqual([]);
   await page.screenshot({path:info.outputPath(`${scene.id}-${size.width}.png`)});
   const worst=[...scene.options].sort((a,b)=>en(treasures[b[0]]).description.length-en(treasures[a[0]]).description.length)[0][0];await page.getByTestId('actor-'+worst).tap();if(s===0)await page.getByTestId('actor-'+chest.scenes[1].options[0][0]).waitFor();
  }
  await page.getByTestId(`treasure-light-${chest.id}-0`).waitFor();await audit(page,'.light-award-copy strong,.light-award-copy > span',20);await expect(page.getByTestId(`treasure-light-${chest.id}-0`)).toBeEnabled();
  await audit(page,'.royal-room-heading h1,.royal-room-heading p,.light-drag-guidance',18);
  for(let i=0;i<2;i++){await page.getByTestId(`treasure-light-${chest.id}-${i}`).tap();await page.getByTestId(`seal-target-${c*2+i}`).tap();}
 }
 await page.getByRole('button',{name:'Clear all mist',exact:true}).waitFor();await audit(page,'.fog-invitation h1,.fog-invitation p',20);await page.getByRole('button',{name:'Clear all mist',exact:true}).tap();await page.getByRole('button',{name:'Reveal my six treasures',exact:true}).waitFor();await audit(page,'.escape-success h1,.escape-success p',20);await page.getByRole('button',{name:'Reveal my six treasures',exact:true}).tap();await expect(page.locator('.treasure-result-card')).toHaveCount(6);
 await audit(page,'.treasure-meaning',size.width===1920?18:17);await audit(page,'.treasure-result-card h3',21);await audit(page,'.result-qr p,.qr-links a,.qr-links button',16);await audit(page,'.next-visitor',20);
 for (const node of await page.locator('.result-qr,.treasure-result-actions .button').all()) { const box=await node.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(size.height); } await page.screenshot({path:info.outputPath(`results-${size.width}.png`),fullPage:true});
 // Check all 30 possible treasure names and meanings in the phone-compatible report.
 for(let i=0;i<5;i++){
  await page.goto(`/?lang=en#treasures=v1.${String(i).repeat(6)}`);await expect(page.locator('.treasure-result-card')).toHaveCount(6);await audit(page,'.treasure-meaning',size.width===1920?18:17,{viewport:false});await audit(page,'.treasure-result-card h3',21,{viewport:false});
 }
});
