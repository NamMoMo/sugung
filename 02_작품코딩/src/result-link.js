import { chests, emptyAnswers } from "./journey.js";

// A versioned, fixed catalog keeps each visitor's six choices in their own link.
// No visitor data or result image is uploaded to a server.
const catalog = [
  ["discover", "create", "make", "help", "teach"],
  ["explore", "express", "plan", "connect", "protect"],
  ["observe", "analysis", "creative", "empathy", "execute"],
  ["craft", "organize", "explain", "cooperate", "persist"],
  ["people", "nature", "music", "numbers", "story"],
  ["tools", "taste", "movement", "art", "play"],
];
export function encodeResult(answers) {
  const ids = chests.flatMap(chest => answers[chest.id] || []);
  if (ids.length !== 6) throw new Error("여섯 선택을 모두 마쳐야 결과지를 만들 수 있어요.");
  const digits = ids.map((id, i) => catalog[i].indexOf(id));
  if (digits.some(index => index < 0)) throw new Error("여섯 선택을 모두 마쳐야 결과지를 만들 수 있어요.");
  return `v1.${digits.join("")}`;
}
export function decodeResult(code) {
  if (typeof code !== "string" || !/^v1\.[0-4]{6}$/.test(code)) return null;
  const result = emptyAnswers();
  chests.forEach((chest, c) => chest.scenes.forEach((scene, s) => {
    result[chest.id][s] = catalog[c * 2 + s][Number(code[3 + c * 2 + s])];
  }));
  return result;
}
export function resultURL(answers, base = window.location.href, language = "ko") {
  const url = new URL(base);
  url.search = language === "en" ? "?lang=en" : "";
  url.hash = `treasures=${encodeResult(answers)}`;
  return url.href;
}
export function sharedResultFromHash(hash) {
  if (!hash.startsWith("#treasures=")) return null;
  const answers = decodeResult(hash.slice("#treasures=".length));
  return answers ? { answers } : { invalid: true };
}
