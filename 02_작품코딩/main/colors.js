// 관람객이 고르는 초롱 빛깔 10가지 (체험 화면의 '초롱 꾸미기'와 빔 화면이 함께 씀)
// 위·아래 빛깔을 하나씩 골라 투톤 초롱을 만듭니다. 기록에는 '쪽빛·다홍'처럼 '위·아래' 이름으로 저장됩니다.
// 빛깔을 바꾸거나 더하려면 여기만 고치면 됩니다 (name: 기록·직원 화면에 쓰는 이름, en: 영어 화면 이름, hex: 색).
export const CHORONG_COLORS = [
  { name: '쪽빛',   en: 'Indigo', hex: '#2E4FC4' },
  { name: '하늘빛', en: 'Sky',    hex: '#5FB0F2' },
  { name: '청록',   en: 'Jade',   hex: '#1F9E86' },
  { name: '연두',   en: 'Lime',   hex: '#9ACD4E' },
  { name: '노랑',   en: 'Yellow', hex: '#F7C843' },
  { name: '주황',   en: 'Orange', hex: '#F4882C' },
  { name: '다홍',   en: 'Red',    hex: '#E8352C' },
  { name: '분홍',   en: 'Pink',   hex: '#F27AA8' },
  { name: '보라',   en: 'Purple', hex: '#8A4FD8' },
  { name: '흰빛',   en: 'White',  hex: '#F4F1FF' },
];
// 처음 창을 열었을 때 골라져 있는 조합 (이 중 하나가 무작위로)
export const COLOR_STARTERS = [['쪽빛', '다홍'], ['보라', '분홍'], ['노랑', '다홍'], ['쪽빛', '흰빛'], ['청록', '노랑'], ['하늘빛', '분홍']];
export const colorByName = n => CHORONG_COLORS.find(c => c.name === n);
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// 위·아래 빛깔로 초롱 한 벌의 색 정보를 만듦. 불빛(glow)은 두 색을 섞어 밝게 한 색
export function twoTone(topName, bottomName) {
  const t = colorByName(topName) || CHORONG_COLORS[0], b = colorByName(bottomName) || CHORONG_COLORS[6];
  const [r, g, bl] = hex2rgb(t.hex).map((v, i) => Math.round(((v + hex2rgb(b.hex)[i]) / 2) * 0.45 + 255 * 0.55));
  return {
    name: `${t.name}·${b.name}`, top: t.hex, bottom: b.hex, trim: '#C9A04A', frame: 'wood',
    glowRGB: `${r},${g},${bl}`, glow: (r << 16) + (g << 8) + bl,
    line: b.name === '흰빛' ? t.hex : undefined,   // 자막 줄 색: 아래가 흰빛이면 위 색으로
    shape: 'hex', motif: 'plum', animal: 'rabbit',
  };
}
// '쪽빛·다홍' 같은 이름을 다시 색 정보로 (빔 화면용). 모르는 이름이면 null
export function twoToneFromName(name) {
  const [a, b] = String(name || '').split('·');
  return colorByName(a) && colorByName(b) ? twoTone(a, b) : null;
}
