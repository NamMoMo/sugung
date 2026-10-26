import { chests } from '../../src/journey.js';
import { earnedLights } from '../../src/seal-transfer.js';
import { createTreasureRecorder } from '../../src/treasure-result.js';

export function treasureFixture() {
  let time = 1000;
  const recorder = createTreasureRecorder(() => time);
  const answers = Object.fromEntries(chests.map(chest => [chest.id, [null, null]]));
  recorder.start();
  for (const chest of chests) for (const [index, scene] of chest.scenes.entries()) {
    time += 100; answers[chest.id][index] = scene.options[0][0];
    recorder.choose(chest.id, index, scene.options[0][0]);
  }
  time = 3000;
  const placements = Object.fromEntries(earnedLights(answers).map((light, index) => [light.id, index]));
  const initial = recorder.snapshot(answers, placements);
  return { recorder, answers, placements, initial,
    change(chestId = 'outfit', index = 0, optionId = 'create') {
      time += 100; answers[chestId][index] = optionId; recorder.choose(chestId, index, optionId);
      return recorder.snapshot(answers, placements);
    },
  };
}
