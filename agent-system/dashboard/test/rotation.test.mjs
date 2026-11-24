import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { SupervisorSession } from '../lib/session.mjs';
import { addUserMessage, initialState, reduce, rotateSession } from '../lib/normalize.mjs';
import { DEFAULT_CONTEXT_BUDGET, Rotator, STARTUP_PREFIX, contextBudget, shouldRotate, withStartupPrefix } from '../lib/rotation.mjs';

const AT = '2026-11-24T00:00:00.000Z';
const assistant = (usage, extra = {}) => ({ type: 'assistant', parent_tool_use_id: null, message: { id: 'm', content: [], usage }, ...extra });
const idle = { contextTokens: 120_000, budget: 100_000, status: 'idle', agents: {} };

test('contextTokens is input + cache read + cache creation of the latest main-thread message', () => {
  let state = reduce(initialState(), assistant({ input_tokens: 5, cache_read_input_tokens: 1000, cache_creation_input_tokens: 200, output_tokens: 9 }), AT);
  assert.equal(state.usage.contextTokens, 1205);
  state = reduce(state, assistant({ input_tokens: 7, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 }), AT);
  assert.equal(state.usage.contextTokens, 2007);
});

test('contextTokens ignores subagent messages', () => {
  const main = reduce(initialState(), assistant({ input_tokens: 3000 }), AT);
  const after = reduce(main, assistant({ input_tokens: 90_000 }, { parent_tool_use_id: 'toolu_sub' }), AT);
  assert.equal(after.usage.contextTokens, 3000);
});

test('shouldRotate: at or over budget, idle, no subagents', () => {
  assert.equal(shouldRotate(idle), true);
  assert.equal(shouldRotate({ ...idle, contextTokens: 100_000 }), true);
  assert.equal(shouldRotate({ ...idle, contextTokens: 99_999 }), false);
});

test('shouldRotate never rotates while subagents run, mid-turn, or in replay', () => {
  assert.equal(shouldRotate({ ...idle, agents: { a: { status: 'running' }, b: { status: 'completed' } } }), false);
  assert.equal(shouldRotate({ ...idle, agents: { b: { status: 'completed' } } }), true);
  assert.equal(shouldRotate({ ...idle, status: 'running' }), false);
  assert.equal(shouldRotate({ ...idle, replay: true }), false);
});

test('SAGE_CONTEXT_BUDGET overrides the default; bad values fall back', () => {
  assert.equal(contextBudget({}), DEFAULT_CONTEXT_BUDGET);
  assert.equal(DEFAULT_CONTEXT_BUDGET, 100_000);
  assert.equal(contextBudget({ SAGE_CONTEXT_BUDGET: '5000' }), 5000);
  assert.equal(contextBudget({ SAGE_CONTEXT_BUDGET: 'lots' }), DEFAULT_CONTEXT_BUDGET);
  assert.equal(contextBudget({ SAGE_CONTEXT_BUDGET: '-1' }), DEFAULT_CONTEXT_BUDGET);
});

test('buildArgs has no --resume after rotation, and keeps the tool lists', () => {
  const session = new SupervisorSession({ cwd: '.' });
  const rotated = rotateSession({ ...initialState(), session: { ...initialState().session, id: 'abc' } });
  assert.equal(rotated.session.id, null);
  assert.ok(!session.buildArgs(rotated.session.id).includes('--resume'));
  assert.deepEqual(session.buildArgs('abc').slice(-2), ['--resume', 'abc']);
  assert.ok(session.buildArgs(null).includes('--allowedTools') && session.buildArgs(null).includes('--disallowedTools'));
});

test('rotateSession keeps cost, resets context and adds a timeline entry', () => {
  const state = { ...initialState(), usage: { ...initialState().usage, costUsd: 2.5, contextTokens: 123_456 } };
  const next = rotateSession(state, AT);
  assert.equal(next.usage.contextTokens, 0);
  assert.equal(next.usage.baseCostUsd, 2.5);
  assert.equal(next.usage.rotations, 1);
  assert.equal(next.activity[0].text, 'Fresh session (context was 123456 tokens)');
});

test('the startup prefix is applied only to a fresh session', () => {
  assert.equal(withStartupPrefix('hello', true), `${STARTUP_PREFIX}hello`);
  assert.equal(withStartupPrefix('hello', false), 'hello');
  assert.equal(STARTUP_PREFIX, 'New session. Read docs/delivery/status.md and docs/delivery/memory.md first, then: ');
});

// A stand-in session: records what is sent and exits when stopped.
function harness(timeoutMs) {
  const session = Object.assign(new EventEmitter(), { running: true, sent: [], stops: 0 });
  session.send = (text) => session.sent.push(text);
  session.stop = () => { session.stops += 1; setImmediate(() => { session.running = false; session.emit('exit', {}); }); };
  const base = initialState();
  const box = { state: { ...base, session: { ...base.session, id: 'sid', status: 'idle' }, usage: { ...base.usage, contextTokens: 150_000 } } };
  const rotator = new Rotator({ session, getState: () => box.state, setState: (next) => { box.state = next; }, budget: 100_000, timeoutMs });
  return { session, rotator, box };
}

test('checkpoint timeout keeps the session and shows an error', async () => {
  const { session, rotator, box } = harness(20);
  rotator.onResult({ type: 'result', result: 'done' });
  assert.deepEqual(session.sent, ['CHECKPOINT']);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(session.stops, 0);
  assert.equal(box.state.session.id, 'sid');
  assert.match(box.state.session.error, /did not confirm the checkpoint/);
  assert.equal(rotator.busy, false);
  // A late result must not trigger another checkpoint until the human speaks again.
  rotator.onResult({ type: 'result', result: 'CHECKPOINT SAVED' });
  assert.equal(session.sent.length, 1);
});

test('a result without CHECKPOINT SAVED fails the rotation and keeps the session', async () => {
  const { session, rotator, box } = harness(1000);
  rotator.onResult({ type: 'result', result: 'done' });
  rotator.onResult({ type: 'result', result: 'Sorry, could not write memory' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.stops, 0);
  assert.equal(box.state.session.id, 'sid');
  assert.ok(box.state.session.error);
});

test('CHECKPOINT SAVED stops the process and clears the session id', async () => {
  const { session, rotator, box } = harness(1000);
  rotator.onResult({ type: 'result', result: 'done' });
  rotator.onResult({ type: 'result', result: 'CHECKPOINT SAVED' });
  assert.equal(rotator.onExit(), true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(session.stops, 1);
  assert.equal(box.state.session.id, null);
  assert.equal(box.state.usage.rotations, 1);
});

test('no checkpoint is sent while a subagent is running; it proceeds once they finish', () => {
  const { session, rotator, box } = harness(1000);
  const base = box.state;
  box.state = { ...base, agents: { a1: { id: 'a1', status: 'running' } } };
  rotator.onResult({ type: 'result', result: 'dispatched' });
  assert.deepEqual(session.sent, []);
  box.state = { ...base, agents: { a1: { id: 'a1', status: 'completed' } } };
  rotator.onResult({ type: 'result', result: 'all done' });
  assert.deepEqual(session.sent, ['CHECKPOINT']);
});

test('a human message after rotation starts from a null session id', () => {
  const state = addUserMessage(rotateSession(initialState(), AT), 'hi', AT);
  assert.equal(state.session.id, null);
  assert.equal(state.session.status, 'running');
});
