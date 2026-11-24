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

test('a resumed builder (SendMessage) stays one teammate with two rounds; shell tasks are not agents', () => {
  const lines = readFileSync(fileURLToPath(new URL('./fixtures/followup-session.jsonl', import.meta.url)), 'utf8').trim().split('\n');
  const state = lines.map((line) => JSON.parse(line)).reduce((s, e) => reduce(s, e, '2026-11-24T00:00:00.000Z'), addUserMessage(initialState(), 'spike'));
  const agents = Object.values(state.agents);
  assert.equal(agents.length, 1, JSON.stringify(agents.map((a) => [a.type, a.taskId])));
  assert.equal(agents[0].type, 'builder');
  assert.equal(agents[0].rounds, 2);
  assert.equal(agents[0].status, 'completed');
  const followup = state.activity.find((e) => e.kind === 'followup');
  assert.equal(followup?.targetAgentId, agents[0].id);
});

test('an agent the CLI launches asynchronously stays running until its notification', () => {
  const dispatch = { type: 'assistant', parent_tool_use_id: null, message: { id: 'm', content: [{ type: 'tool_use', id: 'n1', name: 'Agent', input: { subagent_type: 'product-analyst', description: 'Draft SRS' } }] } };
  const launched = { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: 'n1', content: [{ type: 'text', text: 'Async agent launched successfully. (This tool result is internal metadata.)' }] }] } };
  const started = { type: 'system', subtype: 'task_started', task_id: 'tk1', tool_use_id: 'n1', task_type: 'local_agent', subagent_type: 'product-analyst' };
  const progress = { type: 'system', subtype: 'task_progress', task_id: 'tk1', tool_use_id: 'n1', description: 'Reading product docs' };
  const notified = { type: 'system', subtype: 'task_notification', task_id: 'tk1', tool_use_id: 'n1', status: 'completed', summary: 'SRS drafted' };
  let state = [dispatch, started, launched].reduce((s, e) => reduce(s, e), initialState());
  assert.equal(state.agents.n1.status, 'running');
  assert.equal(state.agents.n1.background, true);
  assert.equal(state.agents.n1.summary, '', 'launch metadata is not the result');
  state = reduce(state, progress);
  assert.equal(state.agents.n1.status, 'running');
  state = reduce(state, notified);
  assert.equal(state.agents.n1.status, 'completed');
  assert.equal(state.agents.n1.summary, 'SRS drafted');
});

test('progress revives an agent that was wrongly marked done, but not one that really finished', () => {
  const base = reduce(initialState(), { type: 'assistant', parent_tool_use_id: null, message: { id: 'm', content: [{ type: 'tool_use', id: 'a1', name: 'Agent', input: { subagent_type: 'qa' } }] } });
  const wrong = { ...base, agents: { a1: { ...base.agents.a1, status: 'completed', taskId: 't1' } } };
  const revived = reduce(wrong, { type: 'system', subtype: 'task_progress', task_id: 't1', tool_use_id: 'a1', description: 'Running tests' });
  assert.equal(revived.agents.a1.status, 'running');
  const finished = reduce(revived, { type: 'system', subtype: 'task_notification', task_id: 't1', tool_use_id: 'a1', status: 'completed', summary: 'ok' });
  const late = reduce(finished, { type: 'system', subtype: 'task_progress', task_id: 't1', tool_use_id: 'a1', description: 'late event' });
  assert.equal(late.agents.a1.status, 'completed');
});
