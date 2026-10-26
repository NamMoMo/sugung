const revised = {
  "break-after": "/art/scenes/break-after-living-v2.webp",
  "birthday-after": "/art/scenes/birthday-after-living-v3.webp",
  "break-before": "/art/scenes/break-before-living-v2.webp",
};
export const sceneArt = id => revised[id] || `/art/scenes/${id}-living.webp`;
