import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpeechQueue, createPlayer, initialMemory, planSpeech } from '../public/voice.js';

const snap = (over = {}) => ({
  seq: 10, messages: [], agents: {}, usage: { rotations: 0 }, session: { status: 'idle', error: null }, replay: null, ...over,
});
const sage = (seq, text) => ({ id: `m${seq}`, seq, role: 'supervisor', text });
const baseline = (s) => planSpeech(initialMemory(), s, true).memory;

test('history on first load is never spoken', () => {
  const { lines } = planSpeech(initialMemory(), snap({ messages: [sage(3, '```say\nOld news.\n```')] }), true);
  assert.deepEqual(lines, []);
});

test('speaks the say line of a new message when voice is on', () => {
  const memory = baseline(snap());
  const { lines } = planSpeech(memory, snap({ seq: 12, messages: [sage(11, '```say\nPlan is ready.\n```\nBody')] }), true);
  assert.deepEqual(lines, ['Plan is ready.']);
});

test('speaks nothing with the toggle off or in replay, and does not replay the backlog when turned on', () => {
  const memory = baseline(snap());
  const next = snap({ seq: 12, messages: [sage(11, '```say\nPlan is ready.\n```')] });
  const off = planSpeech(memory, next, false);
  assert.deepEqual(off.lines, []);
  assert.deepEqual(planSpeech(off.memory, next, true).lines, []);
});

test('a message still streaming is held until it is final', () => {
  const memory = baseline(snap());
  const live = snap({ seq: 11, session: { status: 'running' }, messages: [sage(11, 'Working on')] });
  const held = planSpeech(memory, live, true);
  assert.deepEqual(held.lines, []);
  const done = planSpeech(held.memory, { ...live, session: { status: 'idle' } }, true);
  assert.deepEqual(done.lines, ['Working on']);
});

test('decision requests get the decision line; failures and rotation are announced once', () => {
  const memory = baseline(snap({ agents: { a1: { id: 'a1', status: 'running', description: 'Build the thing' } } }));
  const next = snap({
    seq: 13, messages: [sage(12, '```say\nADR is ready.\n```\n```decision\nAccept?\n- Yes\n```')],
    agents: { a1: { id: 'a1', status: 'failed', description: 'Build the thing' } }, usage: { rotations: 1 },
  });
  const first = planSpeech(memory, next, true);
  assert.deepEqual(first.lines, ['ADR is ready. I need a decision from you.', 'An agent failed: Build the thing.', 'Sage saved a checkpoint. Your next message starts a fresh session.']);
  assert.deepEqual(planSpeech(first.memory, next, true).lines, []);
});

test('queue plays lines in order without overlap; stop drops the rest', async () => {
  const log = [];
  let active = 0;
  let release;
  const queue = new SpeechQueue(async (line) => {
    active += 1;
    assert.equal(active, 1);
    log.push(line);
    await new Promise((resolve) => { release = resolve; });
    active -= 1;
  }, () => log.push('cancel'));
  queue.push('a');
  queue.push('b', 'c');
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(log, ['a']);
  release();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(log, ['a', 'b']);
  queue.stop();
  release();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(log, ['a', 'b', 'cancel']);
});

test('player falls back to the system voice and reports "system" when the engine fails', async () => {
  const modes = [];
  const spoken = [];
  class Utterance { constructor(text) { this.text = text; } }
  const player = createPlayer({
    onMode: (m) => modes.push(m), onPreparing: () => {},
    fetchImpl: async () => ({ ok: false, status: 502 }),
    synth: { speak: (u) => { spoken.push(u.text); u.onend(); }, cancel() {} }, Utterance,
  });
  await player.play('Hello there.');
  assert.deepEqual(spoken, ['Hello there.']);
  assert.deepEqual(modes, ['system']);
});
