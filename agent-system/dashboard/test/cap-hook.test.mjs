import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialState, reduce } from '../lib/normalize.mjs';

const HOOK = fileURLToPath(new URL('../../hooks/cap-subagents.mjs', import.meta.url));
let agents = {};
const server = createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ agents })); });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

const project = mkdtempSync(join(tmpdir(), 'cap-'));
mkdirSync(join(project, '.claude'));
writeFileSync(join(project, '.claude', 'agent-system.json'), JSON.stringify({ maxConcurrentAgents: 7 }));

const running = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}`, { id: `t${i}`, taskId: `task${i}`, type: 'builder', description: `job ${i}`, status: 'running' }]).concat(Object.entries(extra)));

test('allows a dispatch while fewer than 7 are running', async () => {
  agents = running(6);
  const result = await runHookAsync({ tool_name: 'Agent', tool_use_id: 'new' });
  assert.equal(result.status, 0);
});

test('blocks the 8th concurrent agent with a clear message', async () => {
  agents = running(7);
  const result = await runHookAsync({ tool_name: 'Agent', tool_use_id: 'new' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /7 subagents are already running \(limit 7\)/);
});

test('does not count the dispatch being checked against itself', async () => {
  agents = running(6, { self: { id: 'self', status: 'running', type: 'qa', description: 'x' } });
  const result = await runHookAsync({ tool_name: 'Agent', tool_use_id: 'self' });
  assert.equal(result.status, 0);
});

test('messaging an agent that is still running is allowed even at the cap', async () => {
  agents = running(7);
  const result = await runHookAsync({ tool_name: 'SendMessage', tool_input: { to: 'task3' } });
  assert.equal(result.status, 0);
});

test('resuming a finished agent at the cap is blocked', async () => {
  agents = running(7);
  const result = await runHookAsync({ tool_name: 'SendMessage', tool_input: { to: 'finished-task' } });
  assert.equal(result.status, 2);
});

test('ignores other tools', async () => {
  agents = running(20);
  const result = await runHookAsync({ tool_name: 'Read' });
  assert.equal(result.status, 0);
});

test('a refused background dispatch shows as failed, not stuck running', () => {
  const dispatched = reduce(initialState(), { type: 'assistant', parent_tool_use_id: null, message: { id: 'm', content: [{ type: 'tool_use', id: 'b1', name: 'Agent', input: { subagent_type: 'builder', run_in_background: true } }] } });
  const refused = reduce(dispatched, { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: 'b1', is_error: true, content: '[cap] Blocked: 7 subagents are already running' }] } });
  assert.equal(refused.agents.b1.status, 'failed');
});

function runHookAsync(input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { env: { ...process.env, AGENT_DASHBOARD_URL: url, CLAUDE_PROJECT_DIR: project } });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}
