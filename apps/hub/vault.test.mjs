import test from 'node:test';
import assert from 'node:assert/strict';
import { highlights } from './sources/vault.mjs';

const note = (body) => `---\ntype: daily\n---\n\nUp: [[Job]]\n\n## Notes\n\n- [[Job/Ideas/X|X]] - filed.\n\n## What I did\n\n${body}`;

test('each ### heading becomes a highlight with the first sentence of its first bullet', () => {
  const h = highlights(note(`### Rollout\n\n- Merged [repo !1](https://x/1) into \`pipeline\`; released image 1.1.1.\n- Second bullet.\n\n### Review\n\n- Approved !600, questioning values.`));
  assert.deepEqual(h, [
    { title: 'Rollout', detail: 'Merged repo !1 into pipeline' },
    { title: 'Review', detail: 'Approved !600, questioning values' },
  ]);
});

test('a note without headings falls back to its top-level bullets, and the Notes section is ignored', () => {
  const h = highlights(note('- Fixed the build.\n  - nested detail\n- Wrote docs.'));
  assert.deepEqual(h.map((x) => x.title), ['Fixed the build', 'Wrote docs']);
});

test('an empty or missing section yields nothing, and long details are cut', () => {
  assert.deepEqual(highlights(note('')), []);
  assert.deepEqual(highlights('no sections here'), []);
  const long = highlights(note(`### T\n\n- ${'word '.repeat(60)}`))[0].detail;
  assert.ok(long.length <= 120 && long.endsWith('…'));
});
