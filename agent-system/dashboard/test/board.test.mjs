import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateFrom, stageFor, verdictsFrom } from '../lib/board.mjs';

const comment = (body, createdAt = '2026-11-24T00:00:00Z') => ({ body, createdAt });

test('verdictsFrom reads only first-line verdicts and keeps the latest', () => {
  const verdicts = verdictsFrom([
    comment('REVIEW: REQUEST CHANGES — round 1\nfix x'),
    comment('looks fine, REVIEW: APPROVE in prose'),
    comment('REVIEW: APPROVE — round 2', '2026-11-25T00:00:00Z'),
    comment('SECURITY: PASS — round 1'),
  ]);
  assert.equal(verdicts.review.result, 'APPROVE');
  assert.equal(verdicts.security.result, 'PASS');
  assert.equal(verdicts.qa, undefined);
});

test('stageFor moves a PR through the gates', () => {
  const open = { state: 'OPEN', isDraft: false };
  assert.equal(stageFor({ ...open, isDraft: true }, {}), 'building');
  assert.equal(stageFor(open, {}), 'review');
  assert.equal(stageFor(open, { review: { result: 'REQUEST CHANGES' } }), 'review');
  assert.equal(stageFor(open, { review: { result: 'APPROVE' } }), 'qa');
  assert.equal(stageFor(open, { review: { result: 'APPROVE' }, security: { result: 'FAIL' } }), 'review');
  assert.equal(stageFor(open, { review: { result: 'APPROVE' }, qa: { result: 'PASS' } }), 'human');
  assert.equal(stageFor({ state: 'MERGED' }, {}), 'done');
});

test('gateFrom reads the line under Current gate', () => {
  const md = '# Status\n\n## Current gate\n**Phase 0, Foundation (G0 not passed).** No feature code.\n\n## Done\n';
  assert.equal(gateFrom(md), 'Phase 0, Foundation (G0 not passed). No feature code.');
  assert.equal(gateFrom('# nothing here'), '');
});

test('verdictsFrom records the review round', () => {
  const verdicts = verdictsFrom([comment('REVIEW: REQUEST CHANGES — round 1'), comment('REVIEW: APPROVE — round 2')]);
  assert.equal(verdicts.review.round, 2);
});
