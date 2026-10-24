import test from 'node:test';
import assert from 'node:assert/strict';
import { mentionsTicket } from './public/lib.js';

test('ticket ids match whole tokens only', () => {
  assert.equal(mentionsTicket('#1', 'fix #12'), false);
  assert.equal(mentionsTicket('#12', 'fix #12 crash'), true);
  assert.equal(mentionsTicket('#12', 'fix/12-crash'), true);
  assert.equal(mentionsTicket('#12', 'fix/123-crash'), false);
  assert.equal(mentionsTicket('NOV-1', 'feature/nov-14/event'), false);
  assert.equal(mentionsTicket('NOV-14', 'feature/nov-14/event'), true);
  assert.equal(mentionsTicket('NOV-14', 'NOV-14 A: organizer list'), true);
});
