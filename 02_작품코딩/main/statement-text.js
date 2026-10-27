// Fit complete sentences inside the existing lantern plaques without truncation.
export function wrapStatement(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of Array.from(text)) {
    if (line && ctx.measureText(line + char).width > maxWidth) {
      const space = line.lastIndexOf(' ');
      if (space > line.length / 2) {
        lines.push(line.slice(0, space));
        line = line.slice(space + 1) + char;
      } else {
        lines.push(line.trimEnd());
        line = char.trimStart();
      }
    } else line += char;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export function fitStatement(ctx, text, width, height, maxFont = 40, minFont = 18) {
  for (let fontSize = maxFont; fontSize >= Math.min(minFont, maxFont); fontSize--) {
    ctx.font = `700 ${fontSize}px "Gowun Batang", serif`;
    const lines = wrapStatement(ctx, text, width);
    const lineHeight = fontSize * 1.35;
    if (lines.length * lineHeight <= height && lines.every(line => ctx.measureText(line).width <= width)) {
      return { lines, fontSize, lineHeight };
    }
  }
  throw new Error('Sentence does not fit the plaque');
}

export function drawStatement(ctx, text, cx, cy, width, height) {
  ctx.save();
  const layout = fitStatement(ctx, text, width, height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F6E3BA'; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 3;
  const top = cy - (layout.lines.length - 1) * layout.lineHeight / 2;
  layout.lines.forEach((line, i) => ctx.fillText(line, cx, top + i * layout.lineHeight));
  ctx.restore();
}
