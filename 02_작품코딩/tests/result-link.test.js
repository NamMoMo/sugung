import test from "node:test";
import assert from "node:assert/strict";
import { encodeResult, decodeResult, resultURL, sharedResultFromHash } from "../src/result-link.js";
import { chests, emptyAnswers, countAnswers } from "../src/journey.js";

test("visitor result links preserve all six independent choices", () => {
  for (let variation = 0; variation < 30; variation++) {
    const answers = Object.fromEntries(chests.map((chest, c) => [chest.id, chest.scenes.map((scene, s) => scene.options[(variation + c + s) % 5][0])]));
    const encoded = encodeResult(answers);
    assert.deepEqual(decodeResult(encoded), answers);
    const url = new URL(resultURL(answers,"https://example.test/?old=1#unused"));
    assert.equal(url.search, "");
    assert.deepEqual(sharedResultFromHash(url.hash), { answers });
    assert.equal(countAnswers(decodeResult(encoded)), 6);
  }
});
test("partial, malformed, and unknown result links never invent answers", () => {
  assert.throws(() => encodeResult(emptyAnswers()));
  for (const code of ["", "v2.000000", "v1.00000", "v1.0000000", "v1.000005", "v1.00000a", "v1.00000%", "v1.000000<script>"]) assert.equal(decodeResult(code), null);
  assert.deepEqual(sharedResultFromHash("#treasures=bad"), { invalid: true });
  assert.equal(sharedResultFromHash("#other=hello"), null);
});
test("a saved visitor link is independent of the next visitor's session", () => {
  const first = decodeResult("v1.012340");
  const link = resultURL(first,"https://example.test/");
  const next = decodeResult("v1.444444");
  assert.notDeepEqual(first,next);
  assert.deepEqual(sharedResultFromHash(new URL(link).hash).answers,first);
});
