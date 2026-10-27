import test from 'node:test';
import assert from 'node:assert/strict';
import { fitStatement } from '../main/statement-text.js';
import { INTEREST_ITEMS, CATEGORY, LEGACY_CATEGORY, offlineLabels, categoryOf } from '../main/catalog.js';

// Conservative metrics: a Korean glyph occupies a full em, Latin characters .65em.
function context() {
  return { font: '', measureText(text) {
    const size = Number(this.font.match(/(\d+)px/)[1]);
    return { width: Array.from(text).reduce((n, c) => n + (/[^\x00-\x7f]/.test(c) ? 1 : .65) * size, 0) };
  } };
}

test('all complete bilingual sentences fit the original plaque without losing text', () => {
  // Existing silk hole/frame leaves this much centered writing area.
  for (const item of Object.values(INTEREST_ITEMS)) for (const text of [item.statement, item.statementEn]) {
    const ctx = context();
    const layout = fitStatement(ctx, text, 388, 144);
    assert.ok(layout.lines.length * layout.lineHeight <= 144);
    assert.ok(layout.lines.every(line => ctx.measureText(line).width <= 388));
    assert.equal(layout.lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  }
});

test('old offline QR indexes retain their meanings after replacing the catalog', () => {
  assert.deepEqual(offlineLabels('0.2.14'), ['양치하기', '물 마시기', '노래 듣기']);
  assert.deepEqual(offlineLabels('0.9', '2'), ['사람과 마음', '게임과 놀이']);
  assert.deepEqual(offlineLabels('oops.-1.999', '2'), []);
  for (const label of Object.keys(LEGACY_CATEGORY)) assert.equal(categoryOf(label), LEGACY_CATEGORY[label]);
  assert.equal(Object.keys(CATEGORY).length, 10);
  assert.ok(Object.keys(CATEGORY).every(label => label.length <= 40));
});

test('projection captions fit both a narrow preview and an exhibition screen', () => {
  for (const [width, height] of [[320, 844], [1280, 720], [1920, 1080], [480, 240]]) {
    for (const item of Object.values(INTEREST_ITEMS)) {
      const ctx = context();
      const layout = fitStatement(ctx, item.statement, width * .68, height * .13, Math.round(height * .042 * .8), 8);
      assert.ok(layout.lines.length * layout.lineHeight <= height * .13);
      assert.equal(layout.lines.join('').replace(/\s/g, ''), item.statement.replace(/\s/g, ''));
    }
  }
});
