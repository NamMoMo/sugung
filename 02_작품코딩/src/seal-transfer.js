import { chests } from "./journey.js";

export function earnedLights(answers) {
  return chests.flatMap((chest, chestIndex) => answers[chest.id]?.every(Boolean)
    ? chest.scenes.map((_, index) => ({ id: `${chest.id}-${index}`, chestId: chest.id, chestIndex, index }))
    : []);
}

// One earned light unlocks one still-closed seal. Invalid or repeated drops are inert.
export function placeLight(placements, id, seal, answers) {
  if (!Number.isInteger(seal) || seal < 0 || seal > 5 || placements[id] !== undefined
    || Object.values(placements).includes(seal) || !earnedLights(answers).some(light => light.id === id)) return placements;
  return { ...placements, [id]: seal };
}

export function nearestSeal(point, targets) {
  let nearest = null;
  let distance = Infinity;
  for (const target of targets) {
    const d = Math.hypot(point.x - target.x, point.y - target.y);
    if (d <= target.radius && d < distance) { nearest = target.index; distance = d; }
  }
  return nearest;
}
