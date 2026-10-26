import test from 'node:test';
import assert from 'node:assert/strict';
import { treasureFixture } from './helpers/treasure-fixture.js';
import { createTreasureRecorder, validateTreasureResult } from '../src/treasure-result.js';

test('six real choices and six seals create canonical participant results with actions and treasures', () => {
  const { initial } = treasureFixture();
  assert.equal(validateTreasureResult(initial), true);
  assert.equal(initial.room_id, 'self-knowledge'); assert.equal(initial.team_id, 2);
  assert.equal(initial.revision, 6); assert.equal(initial.selections.length, 6);
  assert.equal(initial.duration_ms, 2000); assert.equal(initial.history.length, 6);
  assert.equal(initial.selections[0].treasure.name, '발견의 돋보기');
  assert.equal(initial.selected_actions[4], '친구랑 대화하기');
});
test('result edits append history and revise choices while preserving first finish and duration', () => {
  const fixture = treasureFixture(), revised = fixture.change();
  assert.equal(validateTreasureResult(revised), true);
  assert.equal(revised.revision, 7); assert.equal(revised.selections[0].treasure.name, '상상의 팔레트');
  assert.equal(revised.finished_at, fixture.initial.finished_at);
  assert.equal(revised.duration_ms, fixture.initial.duration_ms);
  assert.notEqual(revised.updated_at, fixture.initial.updated_at);
  assert.deepEqual(revised.history.slice(0, 6), fixture.initial.history);
  assert.equal(fixture.initial.answers.outfit[0], 'discover');
});
test('incomplete or forged results cannot become completion payloads; recorder reset loses prior identity', () => {
  const fixture = treasureFixture();
  assert.throws(() => fixture.recorder.snapshot(fixture.answers, {}), /INCOMPLETE/);
  for (const mutate of [r => r.selections[0].action = '임의 항목', r => r.answers.outfit[0] = 'music',
    r => r.history[0].option_id = 'invalid', r => r.history.pop(), r => r.seal_placements['aura-1'] = 0,
    r => r.finished_at = 'invalid', r => r.duration_ms = -1, r => r.team_id = 1,
    r => r.summary.keywords = ['임의 키워드'], r => r.language = 'invalid']) {
    const forged = structuredClone(fixture.initial); mutate(forged); assert.equal(validateTreasureResult(forged), false);
  }
  fixture.recorder.reset(); assert.throws(() => fixture.recorder.snapshot(fixture.answers, fixture.placements), /INCOMPLETE/);
  assert.equal(createTreasureRecorder().choose('outfit', 0, 'invalid'), false);
});
