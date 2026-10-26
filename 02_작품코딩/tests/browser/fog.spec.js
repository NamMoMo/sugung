import {test,expect} from "@playwright/test";

test.beforeEach(async({page})=>{await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());});
const opacity=canvas=>{
 const ctx=canvas.getContext("2d");let total=0,count=0;
 for(let y=30;y<canvas.height;y+=80)for(let x=30;x<canvas.width;x+=80){total+=ctx.getImageData(x,y,1,1).data[3];count++;}
 return total/count;
};

test("dense full-height fog flows away after a real touch swipe, preserves progress on resize, then reveals the door",async({page},info)=>{
 await page.goto("/");const canvas=page.locator(".fog-entrance canvas");
 await expect(canvas).toBeVisible();await expect(canvas).toHaveCSS("touch-action","none");
 expect(await canvas.evaluate(opacity)).toBeGreaterThan(220);
 await page.screenshot({path:info.outputPath("dense-mist-before.png"),animations:"disabled"});
 const client=await page.context().newCDPSession(page);
 const touch=(type,x=0,y=0)=>client.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y,id:1}]});
 await touch("touchStart",450,450);
 for(let i=1;i<=14;i++)await touch("touchMove",450+i*28,450-i*3);
 await touch("touchEnd");
 const bar=page.getByRole("progressbar",{name:"안개 걷기 진행률"});
 await expect.poll(async()=>Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
 const progress=Number(await bar.getAttribute("aria-valuenow"));expect(progress).toBeLessThan(100);
 const sample=()=>canvas.evaluate(c=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=3;i<d.length;i+=404)sum+=d[i];return sum;});
 const first=await sample();await expect.poll(sample).not.toBe(first);
 expect(await canvas.evaluate(opacity)).toBeLessThan(245);
 await page.screenshot({path:info.outputPath("hand-pushed-mist.png"),animations:"disabled"});
 await page.setViewportSize({width:1536,height:864});
 expect(Number(await bar.getAttribute("aria-valuenow"))).toBe(progress);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath("mist-1536.png"),animations:"disabled"});
 await page.getByRole("button",{name:"안개 한 번에 걷기"}).tap();await expect(page.getByTestId("palace-door")).toBeEnabled();
 await client.detach();
});

test("a touch without a sweep does not open the door; reduced motion and keyboard alternative still work",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 await page.locator(".fog-entrance canvas").tap({position:{x:300,y:250}});
 await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","0");
 await expect(page.getByTestId("palace-door")).toBeDisabled();
 const button=page.getByRole("button",{name:"안개 한 번에 걷기"});await button.focus();await page.keyboard.press("Enter");
 await expect(page.getByTestId("palace-door")).toBeEnabled();
});
