import { translate } from "./i18n-core.js";
function wrapText(ctx, text, x, y, width, lineHeight, draw = true) {
  let line = "";
  for (const letter of (/[가-힣]/.test(text) ? [...text] : text.split(/(\s+)/))) {
    if (line && ctx.measureText(line + letter).width > width) {
      if (draw) ctx.fillText(line.trim(), x, y);
      y += lineHeight;
      line = "";
    }
    line += letter;
  }
  if (line && draw) ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}

async function drawTreasure(ctx, image, x, y) {
  if (!image) throw new Error("보물 이미지를 준비하고 있어요. 잠시 후 다시 시도해 주세요.");
  await image.decode();
  if (!image.naturalWidth) throw new Error("보물 이미지를 불러오지 못했어요. 다시 시도해 주세요.");
  const width = image.naturalWidth / 3;
  const height = image.naturalHeight / 2;
  const column = Number(image.dataset.column);
  const row = Number(image.dataset.row);
  ctx.drawImage(image, column * width, row * height, width, height, x + 35, y, 210, 210);
}

export async function exportTreasureCard(groups, artwork, language = "ko") {
  const t = (key) => translate(language, key);
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 2100;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 저장할 수 없는 브라우저입니다.");
  ctx.font = "22px sans-serif";
  const actionSpace = groups.map(group => Math.max(...group.options.map(option =>
    wrapText(ctx, `${t("내가 선택한 행동")}: ${option.action}`, 0, 0, 624, 32, false))) + 16);
  canvas.height += actionSpace.reduce((sum,height)=>sum+height,0);
  ctx.fillStyle = "#071321";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#bca777";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, 1528, canvas.height - 72);
  ctx.textAlign = "center";
  ctx.fillStyle = "#d8c396";
  ctx.font = "24px sans-serif";
  ctx.fillText(t("수 궁 야 행  ·  나 의 보 물 기 록"), 800, 106);
  ctx.fillStyle = "#faf6e9";
  ctx.font = "50px serif";
  ctx.fillText(t("내가 발견한 여섯 가지 보물"), 800, 183);
  for (const [index, group] of groups.entries()) {
    const top = 250 + index * 560 + actionSpace.slice(0,index).reduce((sum,height)=>sum+height,0);
    ctx.textAlign = "left";
    ctx.fillStyle = "#d8c396";
    ctx.font = "28px sans-serif";
    ctx.fillText(group.name, 90, top);
    for (const [column, option] of group.options.entries()) {
      const left = 80 + column * 740;
      ctx.fillStyle = "#102235";
      ctx.fillRect(left, top + 26, 700, 480 + actionSpace[index]);
      await drawTreasure(ctx, artwork[option.id], left + 210, top + 30);
      ctx.textAlign = "center";
      ctx.fillStyle = "#bfa779";
      ctx.font = "23px sans-serif";
      ctx.fillText(option.label, left + 350, top + 260);
      ctx.fillStyle = "#faf6e9";
      ctx.font = "36px serif";
      ctx.fillText(option.treasure.name, left + 350, top + 314);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ddc28e";
      ctx.font = "22px sans-serif";
      wrapText(ctx, `${t("내가 선택한 행동")}: ${option.action}`, left + 38, top + 354, 624, 32);
      ctx.fillStyle = "#d8d9d4";
      ctx.font = "26px sans-serif";
      wrapText(ctx, option.treasure.description, left + 38, top + 366 + actionSpace[index], 624, 40);
    }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#a8b4bf";
  ctx.font = "23px sans-serif";
  ctx.fillText(t("지금의 선택에서 발견한 보물 · 성격이나 능력을 진단하는 결과가 아닙니다."), 800, canvas.height - 90);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("이미지를 만들지 못했어요. 다시 시도해 주세요.");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = language === "en" ? "sugung-my-treasures.png" : "수궁야행-나의-보물.png";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
