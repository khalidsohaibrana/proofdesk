import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { API_BILLING_ENV, SupervisorSession, checkPlanAuth, planOnlyEnv } from '../lib/session.mjs';
import { initialState, reduce } from '../lib/normalize.mjs';

// Fake `claude` that prints a fixed `auth status` JSON.
function fakeCli(status) {
  const dir = mkdtempSync(join(tmpdir(), 'fake-claude-'));
  const file = join(dir, 'claude');
  writeFileSync(file, `#!/bin/sh\necho '${JSON.stringify(status)}'\n`);
  chmodSync(file, 0o755);
  return file;
}

test('planOnlyEnv removes API-key and other-provider overrides, keeps the rest', () => {
  const env = planOnlyEnv({ ANTHROPIC_API_KEY: 'x', CLAUDE_CODE_USE_BEDROCK: '1', ANTHROPIC_BASE_URL: 'https://proxy', PATH: '/bin', HOME: '/h' });
  for (const key of API_BILLING_ENV) assert.equal(env[key], undefined, key);
  assert.equal(env.PATH, '/bin');
  assert.equal(env.HOME, '/h');
});

test('checkPlanAuth accepts a claude.ai subscription login', async () => {
  const result = await checkPlanAuth(fakeCli({ loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'max' }));
  assert.deepEqual(result, { ok: true, plan: 'max', reason: null });
});

test('checkPlanAuth rejects an API (Console) login', async () => {
  const result = await checkPlanAuth(fakeCli({ loggedIn: true, authMethod: 'console' }));
  assert.equal(result.ok, false);
  assert.match(result.reason, /bills API usage/);
});

test('checkPlanAuth rejects a signed-out CLI', async () => {
  const result = await checkPlanAuth(fakeCli({ loggedIn: false, authMethod: 'none' }));
  assert.equal(result.ok, false);
  assert.match(result.reason, /signed out/);
});

test('the supervisor process is never given an API key', () => {
  const session = new SupervisorSession({ cwd: '/tmp' });
  const args = session.buildArgs(null);
  assert.ok(!args.some((arg) => /api[-_]?key/i.test(arg)));
  assert.ok(args.includes('--agent') && args.includes('supervisor'));
});

test('reducer records the auth source reported by the CLI', () => {
  const state = reduce(initialState(), { type: 'system', subtype: 'init', session_id: 's', model: 'm', apiKeySource: 'none' });
  assert.equal(state.session.apiKeySource, 'none');
});
