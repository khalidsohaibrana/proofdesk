import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecision, stripDecision } from '../public/decision.js';

test('reads a decision block: question, options, recommended first', () => {
  const text = 'Atlas drafted ADR-0003.\n\n```decision\nAccept ADR-0003?\n- Hold: I\'ll read it first\n- Accept with all five defaults (recommended)\n- Accept, but change decision 2\n```';
  const decision = parseDecision(text);
  assert.equal(decision.source, 'block');
  assert.equal(decision.question, 'Accept ADR-0003?');
  assert.deepEqual(decision.options.map((o) => o.label), ['Accept with all five defaults', "Hold: I'll read it first", 'Accept, but change decision 2']);
  assert.equal(decision.options[0].recommended, true);
});

test('strips the block from the message text', () => {
  assert.equal(stripDecision('Body text.\n\n```decision\nQ?\n- A\n```'), 'Body text.');
});

test('falls back to quoted answers the supervisor suggests', () => {
  const text = '**DECISION NEEDED**: read the ADR and reply either **"accept ADR-0003 with all five defaults"** or your overrides.';
  const decision = parseDecision(text);
  assert.equal(decision.source, 'quotes');
  assert.equal(decision.options[0].label, 'accept ADR-0003 with all five defaults');
});

test('ignores quotes that are not suggested replies', () => {
  assert.equal(parseDecision('The brief says "clients pin comments on a design" and that is all.'), null);
});

test('no decision in an ordinary status update', () => {
  assert.equal(parseDecision('STATUS: all five PRs open. Nothing needed from you.'), null);
});

test('caps the number of buttons at four', () => {
  const text = '```decision\nPick one\n- a1 option\n- b2 option\n- c3 option\n- d4 option\n- e5 option\n```';
  assert.equal(parseDecision(text).options.length, 4);
});
