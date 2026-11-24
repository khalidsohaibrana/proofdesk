import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addUserMessage, describeTool, initialState, reduce, stopAll } from '../lib/normalize.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/probe-session.jsonl', import.meta.url));
const events = readFileSync(FIXTURE, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const replay = () => events.reduce((state, event) => reduce(state, event, '2026-11-24T00:00:00.000Z'), addUserMessage(initialState(), 'probe'));

test('captures the session id and model from init', () => {
  const state = replay();
  assert.match(state.session.id, /^[0-9a-f-]{36}$/);
  assert.ok(state.session.model);
});

test('builds one agent per supervisor dispatch, both completed', () => {
  const agents = Object.values(replay().agents);
  assert.equal(agents.length, 2);
  assert.deepEqual(agents.map((a) => a.type).sort(), ['Explore', 'general-purpose']);
  assert.ok(agents.every((a) => a.status === 'completed'), JSON.stringify(agents.map((a) => [a.type, a.status])));
});

test('marks the background dispatch and keeps its brief', () => {
  const explore = Object.values(replay().agents).find((a) => a.type === 'Explore');
  assert.equal(explore.background, true);
  assert.ok(explore.prompt.length > 0);
  assert.ok(explore.summary.length > 0);
});

test('attributes subagent tool calls to the right agent', () => {
  const state = replay();
  const general = Object.values(state.agents).find((a) => a.type === 'general-purpose');
  const calls = state.activity.filter((e) => e.agentId === general.id && e.kind === 'tool');
  assert.ok(calls.some((e) => e.text.startsWith('Read')), JSON.stringify(calls));
  assert.ok(state.activity.some((e) => e.agentId === 'supervisor' && e.kind === 'dispatch'));
});

test('collects supervisor replies and the closing question', () => {
  const replies = replay().messages.filter((m) => m.role === 'supervisor');
  assert.ok(replies.length > 0);
  assert.ok(replies.some((m) => m.text.includes('QUESTION:')));
});

test('records cost and returns to idle after the result', () => {
  const state = replay();
  assert.ok(state.usage.costUsd > 0);
  assert.equal(state.session.status, 'idle');
});

test('does not mutate the previous state', () => {
  const before = initialState();
  const frozen = JSON.stringify(before);
  reduce(before, events.find((e) => e.type === 'assistant'));
  assert.equal(JSON.stringify(before), frozen);
});

test('stopAll marks running agents stopped and keeps cost as the new base', () => {
  const running = reduce(initialState(), {
    type: 'assistant', parent_tool_use_id: null,
    message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'Agent', input: { subagent_type: 'builder', description: 'x' } }] },
  });
  const costed = { ...running, usage: { ...running.usage, costUsd: 2.5 } };
  const stopped = stopAll(costed, 'stopped by human');
  assert.equal(stopped.agents.t1.status, 'stopped');
  assert.equal(stopped.usage.baseCostUsd, 2.5);
});

test('shows a blocking guard hook as a denial', () => {
  const state = reduce(initialState(), { type: 'system', subtype: 'hook_response', exit_code: 2, stderr: '[guard] Blocked edit of src/app.ts' });
  assert.equal(state.activity[0].kind, 'denied');
});

test('describeTool summarises common tools', () => {
  assert.equal(describeTool('Bash', { command: 'npm test' }), 'Bash · npm test');
  assert.equal(describeTool('Agent', { subagent_type: 'reviewer', description: 'PR 4' }), 'Agent · reviewer: PR 4');
});

test('orders messages, dispatches and activity with one increasing sequence', () => {
  const state = replay();
  const seqs = [...state.messages.map((m) => m.seq), ...Object.values(state.agents).map((a) => a.seq), ...state.activity.map((e) => e.seq)];
  assert.ok(seqs.every(Number.isInteger));
  assert.equal(new Set(seqs).size, seqs.length, 'sequence numbers are unique');
  const user = state.messages.find((m) => m.role === 'user');
  assert.ok(Object.values(state.agents).every((a) => a.seq > user.seq), 'dispatches come after the request');
});
