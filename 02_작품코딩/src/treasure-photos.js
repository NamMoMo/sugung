const sheets = [
  ["roles-before", ["discover", "create", "make", "help", "teach"]],
  ["roles-after", ["explore", "express", "plan", "connect", "protect"]],
  ["strength-before", ["observe", "analysis", "creative", "empathy", "execute"]],
  ["strength-after", ["craft", "organize", "explain", "cooperate", "persist"]],
  ["interests-before", ["people", "nature", "music", "numbers", "story"]],
  ["interests-after", ["tools", "taste", "movement", "art", "play"]],
];
export const treasurePhotos = Object.fromEntries(sheets.flatMap(([sheet, ids]) => ids.map((id, i) => [id, {
  src: `/art/treasures/${sheet}.webp`, column: i % 3, row: Math.floor(i / 3),
}])));
