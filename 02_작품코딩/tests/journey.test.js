import test from "node:test";
import assert from "node:assert/strict";
import {
  chests,
  countAnswers,
  emptyAnswers,
  readProgress,
  sanitizeAnswers,
  selectedOptions,
} from "../src/journey.js";
import { legacyData } from "../src/character-data.js";
import { treasures } from "../src/treasure-data.js";

test("six scenes preserve all thirty original choices and character mappings", () => {
  assert.equal(chests.length, 3);
  for (const chest of chests) {
    assert.equal(chest.scenes.length, 2);
    const ids = chest.scenes.flatMap((scene) => {
      assert.equal(scene.options.length, 5);
      return scene.options.map((option) => option[0]);
    });
    assert.equal(new Set(ids).size, 10);
    const original = legacyData.categories.find(
      (category) => category.id === chest.id,
    );
    assert.deepEqual(
      [...ids].sort(),
      original.options.map((option) => option.id).sort(),
    );
  }
});

test("persisted choices must belong to their own scene", () => {
  const result = sanitizeAnswers({
    outfit: ["explore", "explore"],
    strength: ["missing", "craft"],
    aura: ["nature", "taste"],
  });
  assert.deepEqual(result.outfit, [null, "explore"]);
  assert.deepEqual(result.strength, [null, "craft"]);
  assert.equal(countAnswers(result), 4);
  assert.deepEqual(
    selectedOptions(chests[0], result).map((option) => option.label),
    ["탐험하기"],
  );
});

test("corrupt, unavailable, or unexpected storage starts an empty journey", () => {
  for (const raw of ["broken JSON", "null", "true", "[]", "{}"]) {
    assert.deepEqual(readProgress({ getItem: () => raw }), emptyAnswers());
  }
  assert.deepEqual(
    readProgress({
      getItem: () => {
        throw new Error("Storage disabled");
      },
    }),
    emptyAnswers(),
  );
});

test("all six choices survive save/restore, with independent editing", () => {
  const original = Object.fromEntries(
    chests.map((chest) => [
      chest.id,
      chest.scenes.map((scene) => scene.options[0][0]),
    ]),
  );
  const restored = readProgress({ getItem: () => JSON.stringify(original) });
  assert.equal(countAnswers(restored), 6);
  restored.outfit[0] = "create";
  assert.equal(original.outfit[0], "discover");
  assert.equal(restored.outfit[1], "explore");
  assert.deepEqual(
    selectedOptions(chests[0], restored).map((option) => option.label),
    ["창작하기", "탐험하기"],
  );
});

test("every choice awards its own treasure and result description", () => {
  const options = chests.flatMap((chest) =>
    chest.scenes.flatMap((scene) => scene.options),
  );
  assert.deepEqual(Object.keys(treasures).sort(), options.map(([id]) => id).sort());
  assert.equal(new Set(Object.values(treasures).map(({ name }) => name)).size, 30);
  for (const chest of chests) {
    for (let index = 0; index < 5; index++) {
      const answers = emptyAnswers();
      answers[chest.id] = chest.scenes.map((scene) => scene.options[index][0]);
      const collected = selectedOptions(chest, answers);
      assert.equal(collected.length, 2);
      for (const option of collected) {
        assert.ok(option.treasure.name);
        assert.ok(option.treasure.description.length > 30);
      }
    }
  }
});
