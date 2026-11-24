// /api/tts with a stand-in engine: validation, audio/wav, and a failing engine. No model is downloaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_TTS_CHARS, createTts, validateTtsText } from '../lib/tts.mjs';

const SERVER = fileURLToPath(new URL('../server.mjs', import.meta.url));
const STUB = fileURLToPath(new URL('./fixtures/stub-tts-engine.mjs', import.meta.url));
const freePort = () => new Promise((resolve) => {
  const probe = createServer().listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

test('validateTtsText rejects empty and oversized text', () => {
  assert.throws(() => validateTtsText('   '), { status: 400 });
  assert.throws(() => validateTtsText(undefined), { status: 400 });
  assert.throws(() => validateTtsText('x'.repeat(MAX_TTS_CHARS + 1)), { status: 400 });
  assert.equal(validateTtsText(' hi '), 'hi');
});

test('engine loads lazily once, uses the voice, and retries after a failed load', async () => {
  let loads = 0;
  const voices = [];
  const tts = createTts({ voice: 'am_test', load: async () => { loads += 1; if (loads === 1) throw new Error('boom'); return { generate: async (t, o) => { voices.push(o.voice); return { toWav: async () => new ArrayBuffer(4) }; } }; } });
  assert.equal(loads, 0);
  await assert.rejects(tts.synthesize('hello'), /boom/);
  await tts.synthesize('hello');
  await tts.synthesize('again');
  assert.equal(loads, 2);
  assert.deepEqual(voices, ['am_test', 'am_test']);
});

test('POST /api/tts returns audio/wav from the stub engine and validates input', async () => {
  const port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), 'tts-'));
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(port), PROJECT_DIR: dir, DASHBOARD_DATA_PATH: join(dir, 's.json'), DASHBOARD_RUNS_DIR: join(dir, 'r'), SAGE_TTS_ENGINE_MODULE: STUB, SAGE_VOICE: 'am_stub' },
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  try {
    await new Promise((resolve) => child.stdout.once('data', resolve));
    const post = (body) => fetch(`http://127.0.0.1:${port}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const ok = await post({ text: 'Hello Khalid' });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'audio/wav');
    const bytes = Buffer.from(await ok.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.match(bytes.toString('latin1'), /\|am_stub\|Hello Khalid/);
    assert.equal((await post({ text: '' })).status, 400);
    assert.equal((await post({})).status, 400);
    assert.equal((await post({ text: 'x'.repeat(401) })).status, 400);
  } finally {
    child.kill();
  }
});
