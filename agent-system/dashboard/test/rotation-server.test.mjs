// Integration: run the real server against a fake `claude` and drive one full rotation over HTTP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('../server.mjs', import.meta.url));
const PREFIX = 'New session. Read docs/delivery/status.md and docs/delivery/memory.md first, then: ';
const FAKE = fileURLToPath(new URL('./fixtures/fake-claude', import.meta.url));

const freePort = () => new Promise((resolve) => {
  const probe = createServer().listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const until = async (check, what) => {
  for (let i = 0; i < 100; i += 1) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`timed out waiting for ${what}`);
};

async function startServer(extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'rotation-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  symlinkSync(FAKE, join(bin, 'claude'));
  const port = await freePort();
  const log = join(dir, 'fake.log');
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, PORT: String(port), PROJECT_DIR: dir, FAKE_LOG: log,
      DASHBOARD_DATA_PATH: join(dir, 'state.json'), DASHBOARD_RUNS_DIR: join(dir, 'runs'), SAGE_CONTEXT_BUDGET: '1000', ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  await new Promise((resolve) => child.stdout.once('data', resolve));
  const base = `http://127.0.0.1:${port}`;
  return {
    state: () => fetch(`${base}/api/state`).then((response) => response.json()),
    post: (path, body = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    log: () => readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)),
    stop: () => child.kill('SIGTERM'),
  };
}

test('server rotates at the budget: CHECKPOINT, fresh process without --resume, startup prefix', async () => {
  const api = await startServer();
  try {
    assert.equal((await api.state()).contextBudget, 1000);
    assert.equal((await api.post('/api/message', { text: 'first' })).status, 202);
    const rotated = await until(async () => { const s = await api.state(); return s.usage.rotations === 1 && s; }, 'rotation');
    assert.equal(rotated.session.id, null);
    assert.equal(rotated.usage.contextTokens, 0);
    assert.equal(rotated.usage.costUsd, 0.5);
    assert.ok(rotated.activity.some((entry) => entry.text === 'Fresh session (context was 1500 tokens)'));
    assert.deepEqual(api.log().filter((entry) => entry.message).map((entry) => entry.message), [`${PREFIX}first`, 'CHECKPOINT']);

    assert.equal((await api.post('/api/message', { text: 'second' })).status, 202);
    await until(() => api.log().some((entry) => entry.message?.endsWith('second')), 'second message');
    const log = api.log();
    const starts = log.filter((entry) => entry.start).map((entry) => entry.start);
    assert.equal(starts.length, 2);
    assert.ok(!starts[1].includes('--resume'));
    assert.equal(log.filter((entry) => entry.message).at(-1).message, `${PREFIX}second`);
    const next = await until(async () => { const s = await api.state(); return s.session.id && s.usage.contextTokens === 100 && s; }, 'new session');
    assert.equal(next.usage.rotations, 1);
  } finally { api.stop(); }
});

test('server keeps the session and shows an error when the checkpoint is not confirmed', async () => {
  const api = await startServer({ FAKE_CHECKPOINT_REPLY: 'not saved, sorry' });
  try {
    await api.post('/api/message', { text: 'first' });
    const failed = await until(async () => { const s = await api.state(); return s.session.error && s; }, 'checkpoint error');
    assert.match(failed.session.error, /did not save a checkpoint/);
    assert.ok(failed.session.id);
    assert.equal(failed.usage.rotations, 0);
  } finally { api.stop(); }
});
