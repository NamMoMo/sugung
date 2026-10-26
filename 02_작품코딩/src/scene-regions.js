// Full 3:2 artwork coordinates; scene-specific regions follow each animal's body.
const rectangles = {
  "birthday-before": [[7,7,24,33],[39,6,23,30],[70,5,22,40],[3,44,37,43],[60,43,38,42]],
  "birthday-after": [[5,8,25,27],[36,12,28,28],[64,7,30,33],[1,37,34,36],[59,43,39,39]],
  "tidy-before": [[8,9,24,28],[38,6,24,34],[68,7,22,36],[2,47,37,36],[57,43,36,44]],
  "tidy-after": [[7,8,23,32],[38,7,26,31],[69,4,23,39],[9,41,34,48],[56,44,35,49]],
  "break-before": [[5,8,26,30],[38,11,25,32],[67,16,30,28],[1,48,39,29],[57,48,40,32]],
  "break-after": [[6,12,23,30],[38,8,24,32],[78,3,20,40],[3,47,30,31],[59,48,39,29]],
};
export const sceneRegions = Object.fromEntries(Object.entries(rectangles).map(([id, regions]) => [id, regions.map(([x,y,w,h]) => ({x,y,w,h}))]));
