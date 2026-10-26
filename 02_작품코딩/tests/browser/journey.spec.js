import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { chests } from "../../src/journey.js";

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});
async function enterToTrap(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "안개 한 번에 걷기" }).tap();
  await page.getByRole("button", { name: "보물 방 문 열기" }).tap();
  await expect(page.getByTestId("trap-transition")).toBeVisible();
}
async function enter(page) {
  await enterToTrap(page);
  await page.getByRole("button", { name: "보물을 찾아 탈출하기" }).tap();
  await expect(page.getByTestId("chest-outfit")).toBeVisible();
}
async function descend(page, control) {
  await page.getByTestId(control).tap(); await page.getByTestId("enter-chest-story").tap();
  await expect(page.getByTestId("trap-transition")).toHaveCount(0);
  await expect(page.locator(".photo-scene")).toBeVisible();
  await expect(page.locator(".photo-person").first()).toBeEnabled();
  await expect(page.locator(".living-scene-art")).toHaveCount(1);
  await expect(page.locator(".marine-choice-grid")).toHaveCount(0);
}
async function moveLight(page,id,target) {
  const light=page.getByTestId(`treasure-light-${id}`);
  await expect(light).toBeEnabled();
  const source=await light.boundingBox(); const seal=await page.getByTestId(`seal-target-${target}`).boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2); await page.mouse.down();
  await page.mouse.move(seal.x+seal.width/2,seal.y+seal.height/2,{steps:14});await expect(page.locator(".seal-nearby")).toHaveCount(1);await expect(page.locator(".light-drag-trail circle")).not.toHaveCount(0);await page.mouse.up();
  await expect(light).toHaveCount(0);
}
async function releasePair(page,chest,index){
  await moveLight(page,`${chest.id}-0`,index*2);
  await moveLight(page,`${chest.id}-1`,index*2+1);
}
async function choose(page, id, index) {
  await page.getByTestId(`actor-${id}`).tap();
  await expect(page.getByTestId(`actor-${id}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".scene-light-bloom")).toHaveCount(1);
}
async function finishPair(page, first, second) {
  await choose(page, first, 0);
  await expect(page.getByTestId(`actor-${second}`)).toBeVisible();
  await choose(page, second, 1);
  await expect(page.getByTestId("treasure-room")).toBeVisible();
  await expect(page.getByTestId("light-award-presentation")).toHaveCount(0);
}

test("scratch mist, reveal the reference palace gate, and enter the exact treasure room", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByTestId("palace-door")).toBeDisabled();
  await page.mouse.move(60,260); await page.mouse.down();
  for (const [i,y] of [260,540,800].entries()) await page.mouse.move(i % 2 ? 60 : 1860,y,{steps:24});
  await page.mouse.up();
  await expect(page.locator(".fog-entrance")).toBeHidden();
  await expect(page.locator(".gate-plate")).toHaveAttribute("src","/art/palace-entrance-exterior.webp");
  await expect(page.getByTestId("palace-door")).toBeEnabled();
  await page.screenshot({ path: info.outputPath("reference-gate.png"), animations:"disabled" });
  await page.getByTestId("palace-door").tap();
  await expect(page.locator(".entrance-opening")).toBeVisible();
  await expect(page.getByTestId("trap-transition")).toBeVisible();
  await page.getByRole("button",{name:"보물을 찾아 탈출하기"}).tap();
  await expect(page.locator(".royal-room-canvas > img")).toHaveAttribute("src","/art/palace-room.webp");
  await expect(page.locator(".royal-chest")).toHaveCount(3);
  await page.screenshot({path:info.outputPath("reference-room.png"),animations:"disabled"});
});

test("trap, six choices, exit mist, six hidden treasures revealed together, and a working personal QR", async ({ page, context }, info) => {
  test.setTimeout(90000);
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await enter(page);
  await page.screenshot({path:info.outputPath("mission-room.png")});
  await page.getByTestId("chest-outfit").tap();
  await expect(page.getByTestId("chest-mission-opening")).toBeVisible();
  await page.getByTestId("enter-chest-story").tap();
  await expect(page.getByTestId("trap-transition")).toHaveCount(0);
  const pairs=[["discover","explore"],["observe","craft"],["nature","taste"]];
  for (let c=0;c<3;c++) {
    await expect(page.locator(".photo-person")).toHaveCount(5);
    await expect(page.locator(".treasure-art")).toHaveCount(0);
    await choose(page,pairs[c][0],0);
    await expect(page.getByTestId(`actor-${pairs[c][1]}`)).toBeVisible();
    await choose(page,pairs[c][1],1);
    await page.screenshot({path:info.outputPath(`selected-light-${c}.png`),animations:"disabled"});
    await expect(page.getByTestId("treasure-room")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId(`opened-chest-${chests[c].id}`)).toBeVisible();
    await expect(page.locator(".rune-released")).toHaveCount(c*2);
    await expect(page.locator(".treasure-light")).toHaveCount(2);
    await expect(page.getByTestId("found-treasure-count")).toContainText(`${(c+1)*2} / 6`);
    await page.screenshot({path:info.outputPath(`earned-lights-${c}.png`),animations:"disabled"});
    await releasePair(page,chests[c],c);
    await expect(page.locator(".rune-released")).toHaveCount((c+1)*2);
    await expect(page.locator(".treasure-result-card")).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`room-seals-${c}.png`),animations:"disabled"});
    if(c<2){
      await expect(page.getByTestId(`chest-${chests[c].id}`)).toBeDisabled();
      await page.getByTestId(`chest-${chests[c+1].id}`).tap(); await page.getByTestId("enter-chest-story").tap();
      await expect(page.getByTestId("trap-transition")).toHaveCount(0);
      await expect(page.locator(".photo-scene")).toBeVisible();
    }
  }
  await expect(page.getByTestId("escape-scene")).toBeVisible();
  await expect(page.locator(".fog-entrance")).toBeVisible();
  await expect(page.getByRole("heading",{name:"봉인이 풀렸어요. 보물의 방을 탈출하세요."})).toBeVisible();
  await expect(page.locator(".treasure-result-card")).toHaveCount(0);
  const purple=await page.locator(".fog-escape canvas").evaluate(canvas=>Array.from(canvas.getContext("2d").getImageData(0,0,1,1).data));
  expect(purple[0]).toBeGreaterThan(purple[1]);expect(purple[2]).toBeGreaterThan(purple[1]);
  await page.screenshot({path:info.outputPath("purple-curse-fog.png"),animations:"disabled"});
  await page.getByRole("button",{name:"안개 한 번에 걷기"}).tap();
  await expect(page.getByRole("heading",{name:"봉인이 풀렸어요."})).toBeVisible();
  await expect(page.locator(".escape-free")).toBeVisible();await expect(page.locator(".escape-copy-dock")).toHaveCount(0);
  await expect(page.locator(".escape-palace")).toHaveAttribute("src","/art/palace-exit-open.webp");
  expect(await page.getByTestId("escape-scene").innerText()).not.toMatch(/저주|curse|spell/i);
  await page.locator(".escape-palace").evaluate(img=>img.decode());
  await expect(page.locator(".escape-success")).toHaveCSS("opacity","1");
  await page.screenshot({path:info.outputPath("escape-success.png"),animations:"disabled"});
  await page.getByRole("button",{name:"획득한 여섯 보물 확인하기"}).tap();
  await expect(page.locator(".treasure-result-card")).toHaveCount(6);
  await expect(page.locator(".treasure-meaning")).toHaveCount(6);
  const qr=page.getByTestId("result-qr"); await expect(qr).toBeVisible();
  const raw=Buffer.from((await qr.getAttribute("src")).split(",")[1],"base64");
  const png=PNG.sync.read(raw);
  const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
  const link=await page.getByTestId("result-share-link").getAttribute("href");
  expect(decoded?.data).toBe(link);
  expect(link).toContain("#treasures=v1.");
  const titles=await page.locator(".treasure-result-card h3").allTextContents();
  await expect(page.locator(".treasure-atlas")).toHaveCount(6);
  for(const image of await page.locator(".treasure-atlas").all()) expect(await image.evaluate(async img=>{await img.decode();return img.naturalWidth;})).toBeGreaterThan(1000);
  await expect(page.locator(".treasure-glint")).toHaveCount(18);
  for(const size of [{width:1920,height:1080},{width:1536,height:864}]){
    await page.setViewportSize(size);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const qrBox=await qr.boundingBox(); expect(qrBox.y+qrBox.height).toBeLessThanOrEqual(size.height);
    await page.getByRole("button",{name:"다음 관람객 시작"}).scrollIntoViewIfNeeded();const nextBox=await page.getByRole("button",{name:"다음 관람객 시작"}).boundingBox();expect(nextBox.y+nextBox.height).toBeLessThanOrEqual(size.height+1);
    await page.screenshot({path:info.outputPath(`result-qr-${size.width}.png`),fullPage:true,animations:"disabled"});
  }
  const phone=await context.newPage(); await phone.setViewportSize({width:390,height:844});
  await phone.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
  await phone.goto(decoded.data);
  await expect(phone.locator(".treasure-result-card")).toHaveCount(6);
  expect(await phone.locator(".treasure-result-card h3").allTextContents()).toEqual(titles);
  await expect(phone.locator(".fog-entrance")).toHaveCount(0);
  await expect(phone.getByRole("button",{name:/선택 수정/})).toHaveCount(0);
  expect(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const [download]=await Promise.all([phone.waitForEvent("download"),phone.getByRole("button",{name:"나의 보물 결과지 저장하기"}).tap()]);
  await download.saveAs(info.outputPath("phone-result.png"));
  const card=await readFile(info.outputPath("phone-result.png"));expect(card.readUInt32BE(16)).toBe(1600);expect(card.readUInt32BE(20)).toBeGreaterThan(2100);
  await phone.screenshot({path:info.outputPath("phone-report.png"),fullPage:true,animations:"disabled"});
  await page.getByRole("button",{name:"다음 관람객 시작"}).tap();
  await expect(page.locator(".fog-entrance")).toBeVisible();
  await phone.reload();await expect(phone.locator(".treasure-result-card")).toHaveCount(6);
  expect(await phone.locator(".treasure-result-card h3").allTextContents()).toEqual(titles);
  await phone.evaluate(()=>{location.hash="treasures=v1.444444";});
  await expect(phone.locator(".treasure-result-card h3").first()).not.toHaveText(titles[0]);
  await phone.evaluate(hash=>{location.hash=hash;},new URL(link).hash);
  await expect(phone.locator(".treasure-result-card h3").first()).toHaveText(titles[0]);
  expect(errors).toEqual([]); await phone.close();
});

test("all thirty marine actions remain readable and touchable; touch commits once and can be cancelled", async ({page},info)=>{
  test.setTimeout(90000); await page.emulateMedia({reducedMotion:"reduce"}); await page.clock.install(); await enter(page); await descend(page,"chest-outfit"); await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+50)));
  for(const [c,chest] of chests.entries()){
    if(c){await page.getByRole("button",{name:"보물의 방으로",exact:true}).tap(); await page.getByTestId(`chest-${chest.id}`).tap(); await page.getByTestId("enter-chest-story").tap(); await page.clock.runFor(1500); await expect(page.getByTestId("trap-transition")).toHaveCount(0);}
    for(const [index,scene] of chest.scenes.entries()){
      await page.getByRole("navigation",{name:"이어지는 두 장면"}).getByRole("button").nth(index).tap();
      await expect(page.locator(".action-at-a-glance li")).toHaveCount(5);
      await page.locator(".photo-scene img").first().evaluate(img=>img.decode());
      for(const [id] of scene.options){
        const actor=page.getByTestId(`actor-${id}`),box=await actor.boundingBox();
        await page.touchscreen.tap(box.x+box.width/2,box.y+box.height*.4);
        await expect(actor).toHaveAttribute("aria-pressed","true");
        await expect(page.locator(".photo-person[aria-pressed=true]")).toHaveCount(1);
        await expect(page.locator(".scene-light-bloom")).toBeVisible();
        await page.getByRole("button",{name:"선택 다시 하기",exact:true}).tap();
        await page.clock.fastForward(1700);
        await expect(page.getByTestId(`actor-${id}`)).toHaveAttribute("aria-pressed","false");
      }
    }
  }
  for(const width of [1920,1536,1280,768]){
    await page.setViewportSize({width,height:864}); const actor=page.locator(".photo-person").nth(2),box=await actor.boundingBox();
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height*.4);await expect(actor).toHaveAttribute("aria-pressed","true");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`touch-${width}.png`),fullPage:true,animations:"disabled"});
    await page.getByRole("button",{name:"선택 다시 하기",exact:true}).tap();
  }
  await expect(page.locator(".treasure-result-card")).toHaveCount(0);
});

test("keyboard, idle resume, and next visitor reset preserve the story boundary", async ({page})=>{
  await page.clock.install();await enter(page);await descend(page,"chest-strength");
  const actor=page.getByTestId("actor-observe");await actor.focus();await page.keyboard.press("Enter");await expect(actor).toHaveAttribute("aria-pressed","true");
  await page.clock.fastForward(1600); await expect(page.getByTestId("actor-craft")).toBeVisible(); await page.clock.fastForward(90500);
  await expect(page.getByRole("dialog",{name:"계속 체험할까요?"})).toBeVisible();await page.getByRole("button",{name:"계속 체험하기",exact:true}).tap();
  await expect(page.getByTestId("actor-craft")).toBeVisible();await page.clock.fastForward(106000);await expect(page.locator(".fog-entrance")).toBeVisible();
  await page.getByRole("button",{name:"안개 한 번에 걷기"}).tap();await page.getByRole("button",{name:"보물 방 문 열기"}).tap();
  await expect(page.getByTestId("trap-transition")).toBeVisible(); await page.getByRole("button",{name:"보물을 찾아 탈출하기"}).tap();
  await expect(page.locator(".kiosk-progress")).toHaveAttribute("aria-label","찾은 보물 0 / 6, 풀어낸 봉인 0 / 6");
  await page.getByTestId("chest-strength").tap(); await page.getByTestId("enter-chest-story").tap();await expect(page.getByTestId("trap-transition")).toHaveCount(0);
});

test("invalid saved results do not show fabricated treasures",async({page})=>{
  await page.goto("/#treasures=v1.999999");await expect(page.getByRole("heading",{name:"결과지 링크를 확인해 주세요."})).toBeVisible();await expect(page.locator(".treasure-result-card")).toHaveCount(0);
  await page.getByRole("link",{name:"새 체험 시작"}).tap();await expect(page.locator(".fog-entrance")).toBeVisible();
});

test("trap instructions wait for the visitor, including reduced motion and a long reading pause",async({page})=>{
  await page.clock.install();
  for(const reducedMotion of ["no-preference","reduce"]){
    await page.emulateMedia({reducedMotion});await enterToTrap(page);
    await expect(page.getByTestId("trap-transition")).toBeVisible();await page.clock.fastForward(120000);
    await expect(page.getByRole("button",{name:"보물을 찾아 탈출하기"})).toBeVisible();
    await expect(page.locator(".photo-scene")).toHaveCount(0);await expect(page.getByRole("dialog",{name:"계속 체험할까요?"})).toHaveCount(0);
    await page.getByRole("button",{name:"보물을 찾아 탈출하기"}).tap();
    await page.getByTestId("chest-outfit").tap(); await page.getByTestId("enter-chest-story").tap();
    await expect(page.getByRole("heading",{name:"친구의 생일파티를 준비해요",exact:true})).toBeVisible();
    await expect(page.locator(".living-scene > .living-person")).toHaveCount(5);
  }
});

test("leaving during a glow cancels the pending choice, and reduced motion still advances",async({page})=>{
 await page.clock.install(); await page.emulateMedia({reducedMotion:"reduce"}); await enter(page); await descend(page,"chest-outfit");
 await choose(page,"discover",0); await page.getByRole("button",{name:"보물의 방으로",exact:true}).tap(); await page.clock.fastForward(2000);
 await expect(page.locator(".kiosk-progress")).toHaveAttribute("aria-label","찾은 보물 0 / 6, 풀어낸 봉인 0 / 6");
 await page.getByTestId("chest-outfit").tap(); await page.getByTestId("enter-chest-story").tap(); await expect(page.getByTestId("trap-transition")).toHaveCount(0);
 await choose(page,"make",0); await page.clock.fastForward(900); await expect(page.getByTestId("actor-plan")).toBeVisible();
 await choose(page,"plan",1); await page.clock.fastForward(900); await expect(page.getByTestId("opened-chest-outfit")).toBeVisible();
 await releasePair(page,chests[0],0); await page.clock.fastForward(2300); await page.getByTestId("chest-aura").tap(); await page.getByTestId("enter-chest-story").tap(); await page.clock.fastForward(250); await expect(page.getByTestId("trap-transition")).toHaveCount(0);
 await choose(page,"music",0); await page.clock.fastForward(900); await expect(page.getByTestId("actor-art")).toBeVisible();
 await choose(page,"art",1); await page.clock.fastForward(900); await expect(page.locator(".rune-released")).toHaveCount(2); await releasePair(page,chests[2],1); await expect(page.locator(".rune-released")).toHaveCount(4);
 await expect(page.getByTestId("opened-chest-outfit")).toBeVisible(); await expect(page.getByTestId("opened-chest-aura")).toBeVisible();
});

test("story starts in mist without revealing treasure and entraps on entry before any chest",async({page},info)=>{
 await page.goto("/");await expect(page.getByRole("heading")).toContainText("짙은 안개가 밀려왔어요.");
 await expect(page.locator(".fog-invitation")).not.toContainText("보물");
 await page.getByRole("button",{name:"안개 한 번에 걷기"}).tap();
 await expect(page.getByRole("heading")).toContainText("안개 속에 낯선 문이 나타났어요.");
 await expect(page.locator(".royal-door-invitation")).toContainText("이 문은 어디로 이어질까요?");
 await page.getByTestId("palace-door").tap();await expect(page.getByTestId("trap-transition")).toBeVisible();
 await expect(page.locator(".entry-seals span")).toHaveCount(6);
 await expect(page.getByTestId("trap-transition")).toContainText("문이 닫히고,");
 await expect(page.getByTestId("trap-transition")).toContainText("나를 닮은 행동을 고르면 보물을 얻을 수 있어요.");
 await expect(page.locator(".royal-chest")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"보물을 찾아 탈출하기"})).toBeEnabled();
 await page.screenshot({path:info.outputPath("sealed-entry.png"),animations:"disabled"});
 await page.getByRole("button",{name:"보물을 찾아 탈출하기"}).tap();
 await expect(page.getByRole("heading")).toContainText("탈출의 열쇠는 상자 속에 있어요.");
});

test("real touch drag, invalid drop, cancel, and keyboard placement unlock only earned seals",async({page},info)=>{
 await enter(page); await descend(page,"chest-strength"); await finishPair(page,"observe","craft");
 await expect(page.locator(".rune-released")).toHaveCount(0); await expect(page.getByTestId("chest-aura")).toBeDisabled();
 const light=page.getByTestId("treasure-light-strength-0"),start=await light.boundingBox();
 await expect(light).toHaveCSS("touch-action","none");
 const client=await page.context().newCDPSession(page);
 async function touch(type,x,y){await client.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"||type==="touchCancel"?[]:[{x,y,id:1}]});}
 await touch("touchStart",start.x+start.width/2,start.y+start.height/2);await touch("touchMove",80,200);await touch("touchEnd",80,200);
 await expect(light).toBeVisible(); await expect(page.locator(".rune-released")).toHaveCount(0);
 const restored=await light.boundingBox();expect(Math.abs(restored.x-start.x)).toBeLessThan(1);
 await touch("touchStart",start.x+start.width/2,start.y+start.height/2);await touch("touchMove",start.x+30,start.y-100);await touch("touchCancel",0,0);
 await expect(light).toBeVisible();await expect(page.locator(".rune-released")).toHaveCount(0);
 const target=await page.getByTestId("seal-target-4").boundingBox();
 await touch("touchStart",start.x+start.width/2,start.y+start.height/2);
 for(let i=1;i<=10;i++)await touch("touchMove",start.x+start.width/2+(target.x+target.width/2-start.x-start.width/2)*i/10,start.y+start.height/2+(target.y+target.height/2-start.y-start.height/2)*i/10);
 await touch("touchEnd",0,0);await expect(light).toHaveCount(0);await expect(page.getByTestId("seal-target-4")).toHaveClass(/rune-released/);
 const other=page.getByTestId("treasure-light-strength-1");await other.focus();await page.keyboard.press("Enter");await page.getByTestId("seal-target-1").focus();await page.keyboard.press("Enter");
 await expect(page.locator(".rune-released")).toHaveCount(2);await expect(page.locator(".treasure-light")).toHaveCount(0);await expect(page.getByTestId("chest-aura")).toBeEnabled();
 await page.screenshot({path:info.outputPath("touch-and-keyboard-seals.png"),animations:"disabled"});await client.detach();
});

test("entry has a quiet beat, an impact, six seal strikes and a blocked message before instructions",async({page},info)=>{
 await page.clock.install(); await enterToTrap(page); await page.clock.pauseAt(new Date());
 const stage=page.getByTestId("trap-transition");
 await expect(stage).toHaveAttribute("data-phase","arrival");
 await expect(page.getByRole("button",{name:"보물을 찾아 탈출하기"})).toHaveCount(0);
 await page.clock.runFor(1100); await expect(stage).toHaveAttribute("data-phase","impact");
 await page.clock.runFor(2050); await expect(stage).toHaveAttribute("data-phase","blocked");
 await expect(page.getByRole("status")).toContainText("문이… 열리지 않아요.");
 await page.screenshot({path:info.outputPath("door-blocked.png"),animations:"disabled"});
 await page.clock.runFor(1800);await expect(stage).toHaveAttribute("data-phase","instructions");
 await expect(page.getByRole("button",{name:"보물을 찾아 탈출하기"})).toBeEnabled();
 await page.screenshot({path:info.outputPath("vivid-sealed-entry.png"),animations:"disabled"});
 await page.clock.runFor(120000); await expect(stage).toHaveAttribute("data-phase","instructions");
 await expect(page.getByRole("dialog",{name:"계속 체험할까요?"})).toHaveCount(0);
});

test("party room, creative strength and park bench wording matches each original choice",async({page},info)=>{
 await enter(page); await descend(page,"chest-outfit");
 await expect(page.locator(".scene-story")).toContainText("빌린 파티룸");
 await page.getByRole("navigation",{name:"이어지는 두 장면"}).getByRole("button").nth(1).tap();
 await expect(page.getByTestId("actor-explore")).toContainText("파티룸 앞에 뭐가 있는지 둘러보기");
 await expect(page.getByTestId("actor-protect")).toContainText("친구들과 찍은 사진을 앨범에 모아 두기");
 await expect(page.getByTestId("actor-connect")).toContainText("혼자 있는 친구 챙기기");
 await page.getByRole("button",{name:"English",exact:true}).tap();await expect(page.getByTestId("actor-protect")).toContainText("Save photos with friends in an album");await expect(page.getByTestId("actor-connect")).toContainText("Include a friend who is on their own");await page.getByRole("button",{name:"한국어",exact:true}).tap();
 await expect(page.locator(".living-scene-art")).toHaveAttribute("src","/art/scenes/birthday-after-living-v3.webp");
 await page.locator(".living-scene-art").evaluate(img=>img.decode());
 await page.screenshot({path:info.outputPath("party-room-outside.png"),animations:"disabled"});
 await page.getByRole("button",{name:"보물의 방으로",exact:true}).tap();await descend(page,"chest-strength");
 await expect(page.getByTestId("actor-creative")).toContainText("새로운 정리 방법 떠올리기");
 await page.getByRole("button",{name:"보물의 방으로",exact:true}).tap();await descend(page,"chest-aura");
 await expect(page.getByTestId("actor-nature")).toContainText("공원 벤치에 앉아 쉬기");
 await expect(page.locator(".living-scene-art")).toHaveAttribute("src","/art/scenes/break-before-living-v2.webp");
 await page.locator(".living-scene-art").evaluate(img=>img.decode());
 await page.screenshot({path:info.outputPath("park-bench.png"),animations:"disabled"});
 await page.getByRole("navigation",{name:"이어지는 두 장면"}).getByRole("button").nth(1).tap();await expect(page.getByTestId("actor-tools")).toContainText("새로 산 기기의 기능 둘러보기");await page.getByRole("button",{name:"English",exact:true}).tap();await expect(page.getByTestId("actor-tools")).toContainText("Explore a new device’s features");
});

test("first pair shows the full award; later canvas taps skip only the presentation",async({page},info)=>{
 test.setTimeout(90000); await page.clock.install(); await page.emulateMedia({reducedMotion:"reduce"});
 await enter(page); await descend(page,"chest-aura");
 await page.emulateMedia({reducedMotion:"no-preference"});
 await choose(page,"nature",0);await expect(page.getByTestId("actor-taste")).toBeEnabled();
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+50)));
 await choose(page,"taste",1);await page.clock.runFor(1550);
 await expect(page.getByTestId("light-award-presentation")).toBeVisible();
 await expect(page.getByTestId("skip-light-award")).toHaveCount(0);
 await expect(page.getByTestId("treasure-light-aura-0")).toBeDisabled();
 await page.clock.runFor(80);
 await expect(page.locator(".light-transfer-demo")).toHaveCount(1);
 await page.screenshot({path:info.outputPath("first-pair-award.png"),animations:"disabled"});
 await page.locator(".royal-room-canvas").tap({position:{x:40,y:40}});
 await expect(page.getByTestId("light-award-presentation")).toBeVisible();
 await expect(page.locator(".rune-released")).toHaveCount(0);
 await page.clock.runFor(3900);await expect(page.getByTestId("light-award-presentation")).toHaveCount(0);
 await releasePair(page,chests[2],0);
 await page.getByTestId("chest-strength").tap(); await page.getByTestId("enter-chest-story").tap();await page.clock.runFor(1200);await page.clock.resume();await expect(page.getByTestId("actor-observe")).toBeEnabled();
 await choose(page,"observe",0);await expect(page.getByTestId("actor-craft")).toBeEnabled();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+50)));await choose(page,"craft",1);await page.clock.runFor(1600);
 await expect(page.getByTestId("skip-light-award")).toBeVisible();
 await expect(page.getByTestId("treasure-light-strength-0")).toBeDisabled();
 await page.screenshot({path:info.outputPath("later-pair-skippable.png"),animations:"disabled"});
 const counts=await page.locator(".rune-released").count();
 await page.getByTestId("skip-light-award").tap({position:{x:60,y:60}});
 await expect(page.getByTestId("light-award-presentation")).toHaveCount(0);
 await expect(page.getByTestId("treasure-light-strength-0")).toBeEnabled();
 await expect(page.locator(".rune-released")).toHaveCount(counts);
 await expect(page.locator(".treasure-light")).toHaveCount(2);
 await releasePair(page,chests[1],1);
 await page.getByRole("button",{name:"처음으로",exact:true}).tap();await page.getByRole("button",{name:"새 체험 시작",exact:true}).tap();
 await page.clock.resume();await page.emulateMedia({reducedMotion:"reduce"}); await enter(page);await descend(page,"chest-outfit");
 await choose(page,"discover",0);await expect(page.getByTestId("actor-explore")).toBeVisible();
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+50))); await choose(page,"explore",1);await page.clock.runFor(850);
 await expect(page.getByTestId("light-award-presentation")).toBeVisible();await expect(page.getByTestId("skip-light-award")).toHaveCount(0);
 await page.clock.runFor(1200);await expect(page.getByTestId("treasure-light-outfit-0")).toBeEnabled();
 await expect(page.locator(".rune-released")).toHaveCount(0);
});
