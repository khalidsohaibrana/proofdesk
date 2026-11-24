import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReplayPlayer, loadRun } from '../lib/replay.mjs';
import { RunRecorder } from '../lib/recorder.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/probe-session.jsonl', import.meta.url));
const events = readFileSync(FIXTURE, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

function runFile() {
  const start = Date.parse('2026-11-24T10:00:00Z');
  const records = [
    { t: start, kind: 'human', text: 'probe' },
    ...events.map((event, i) => ({ t: start + 1000 + i * 500, kind: 'event', event })),
    { t: start + 1000 + events.length * 500, kind: 'board', board: { gate: 'Planning', tickets: [], pulls: [], error: null, updatedAt: null } },
  ];
  const file = join(mkdtempSync(join(tmpdir(), 'run-')), 'run.jsonl');
  writeFileSync(file, records.map((r) => JSON.stringify(r)).join('\n'));
  return file;
}

test('replaying to the end rebuilds the live state', () => {
  const player = new ReplayPlayer(loadRun(runFile()));
  player.seek(player.duration);
  const agents = Object.values(player.world.state.agents);
  assert.equal(agents.length, 2);
  assert.ok(agents.every((a) => a.status === 'completed'));
  assert.equal(player.world.board.gate, 'Planning');
  assert.equal(player.world.state.messages[0].role, 'user');
});

test('seeking backwards rewinds the state', () => {
  const player = new ReplayPlayer(loadRun(runFile()));
  player.seek(player.duration);
  player.seek(0);
  assert.equal(Object.keys(player.world.state.agents).length, 0);
  assert.equal(player.world.state.messages.length, 1, 'only the opening human message at t=0');
});

test('virtual clock follows the position', () => {
  const player = new ReplayPlayer(loadRun(runFile()));
  player.seek(5000);
  assert.equal(player.now(), '2026-11-24T10:00:05.000Z');
});

test('recorder writes one JSON line per record, in order', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rec-'));
  const recorder = new RunRecorder(dir);
  const file = recorder.start(new Date('2026-11-24T10:00:00Z'));
  recorder.write('human', { text: 'hello' });
  await recorder.write('event', { event: { type: 'system', subtype: 'init' } });
  const lines = readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines.map((l) => l.kind), ['human', 'event']);
  recorder.end();
  assert.equal(recorder.active, false);
});
