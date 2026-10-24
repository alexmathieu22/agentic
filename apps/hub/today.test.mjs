import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from './today.mjs';

const now = Date.parse('2026-10-23T12:00:00Z');
const ago = (d) => new Date(now - d * 864e5).toISOString();

test('groups by project and ranks review requests first', () => {
  const r = build({
    sessions: [{ repo: '/x/Repos/kinovember', title: 's', branch: 'feat/a', updatedAt: ago(1) }],
    prs: [
      { role: 'author', repo: 'kinovember', title: 'mine', updatedAt: ago(4), url: 'u1' },
      { role: 'reviewer', repo: 'kinovember', title: 'theirs', updatedAt: ago(0), url: 'u2' },
    ],
    tickets: [{ id: 'NOV-1', title: 't', project: 'Kinovember', started: true, updatedAt: ago(6) }],
  }, now);
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].tickets.length, 1);
  assert.match(r.attention[0].text, /Review requested/);
  assert.equal(r.attention.length, 4);
});
