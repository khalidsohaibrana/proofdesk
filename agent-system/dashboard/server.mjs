// Agent dashboard: chat with the supervisor and watch it delegate, live.
// Local only. Zero npm dependencies. Runs the real Claude Code CLI.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addUserMessage, initialState, reduce, stopAll } from './lib/normalize.mjs';
import { SupervisorSession, checkPlanAuth } from './lib/session.mjs';
import { loadBoard } from './lib/board.mjs';
import { RunRecorder } from './lib/recorder.mjs';
import { ReplayPlayer, loadRun } from './lib/replay.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(process.env.PROJECT_DIR || join(HERE, '..', '..'));
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';
const DATA_FILE = process.env.DASHBOARD_DATA_PATH || join(HERE, 'data', 'state.json');
const RUNS_DIR = process.env.DASHBOARD_RUNS_DIR || join(HERE, 'data', 'runs');
// REPLAY=<run file> plays a recorded run instead of driving a live supervisor.
const REPLAY_FILE = process.env.REPLAY ? resolve(process.env.REPLAY) : null;
const MAX_BODY = 20_000;
const MAX_MESSAGE = 8_000;
const BOARD_POLL_MS = 30_000;
const PUSH_THROTTLE_MS = 150;
const SAVE_DEBOUNCE_MS = 1_000;
const ASSETS = {
  '/': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css'],
  '/team.js': ['team.js', 'text/javascript'],
  '/markdown.js': ['markdown.js', 'text/javascript'],
  '/timeline.js': ['timeline.js', 'text/javascript'],
  '/pane.js': ['pane.js', 'text/javascript'],
  '/ui.js': ['ui.js', 'text/javascript'],
};

async function loadConfig() {
  try {
    const raw = JSON.parse(await readFile(join(PROJECT, '.claude', 'agent-system.json'), 'utf8'));
    return { projectName: process.env.PROJECT_NAME || raw.projectName || basename(PROJECT), statusFile: raw.statusFile || 'docs/delivery/status.md', dashboard: raw.dashboard || {} };
  } catch {
    return { projectName: process.env.PROJECT_NAME || basename(PROJECT), statusFile: 'docs/delivery/status.md', dashboard: {} };
  }
}

async function loadState() {
  try {
    const saved = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    const state = { ...initialState(), ...saved };
    const interrupted = Object.values(state.agents).some((agent) => agent.status === 'running') || state.session.status === 'running';
    return interrupted ? stopAll(state, 'Dashboard restarted; running work was interrupted') : state;
  } catch (error) {
    if (error.code !== 'ENOENT') process.stderr.write(`[dashboard] could not read state, starting fresh: ${error.message}\n`);
    return initialState();
  }
}

const config = await loadConfig();
const player = REPLAY_FILE ? new ReplayPlayer(loadRun(REPLAY_FILE)) : null;
const recorder = new RunRecorder(RUNS_DIR);
let state = player ? player.world.state : await loadState();
let board = { gate: '', tickets: [], pulls: [], error: null, updatedAt: null };
const clients = new Set();
const session = new SupervisorSession({
  cwd: PROJECT,
  model: process.env.SUPERVISOR_MODEL || config.dashboard.model,
  ...(config.dashboard.allowedTools ? { allowedTools: config.dashboard.allowedTools } : {}),
});

// Billing guard: agents only run on the signed-in Claude subscription, never an API key.
let billing = { ok: false, plan: null, reason: 'Checking Claude sign-in…', checkedAt: null };
async function refreshBilling() {
  if (player) return billing;
  billing = { ...(await checkPlanAuth()), checkedAt: new Date().toISOString() };
  recorder.write('billing', { billing });
  push();
  return billing;
}

const snapshot = () => (player
  ? { ...player.world.state, board: player.world.board, billing: player.world.billing, running: player.world.state.session.status === 'running', now: player.now(), replay: player.info(), project: { name: config.projectName, path: PROJECT } }
  : { ...state, board, billing, running: session.running, now: new Date().toISOString(), replay: null, project: { name: config.projectName, path: PROJECT } });

let pushTimer = null;
function push() {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const data = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const res of clients) res.write(data);
  }, PUSH_THROTTLE_MS);
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(dirname(DATA_FILE), { recursive: true });
      await writeFile(`${DATA_FILE}.tmp`, JSON.stringify(state));
      await rename(`${DATA_FILE}.tmp`, DATA_FILE);
    } catch (error) {
      process.stderr.write(`[dashboard] could not save state: ${error.message}\n`);
    }
  }, SAVE_DEBOUNCE_MS);
}

function setState(next) {
  state = next;
  push();
  save();
}

if (player) player.on('change', push);

async function refreshBoard() {
  if (player) return;
  try {
    board = await loadBoard(PROJECT, config.statusFile);
    recorder.write('board', { board });
  } catch (error) {
    board = { ...board, error: error.message, updatedAt: new Date().toISOString() };
  }
  push();
}

session.on('event', (event) => {
  if (event.type === 'system' && event.subtype === 'init' && event.apiKeySource && event.apiKeySource !== 'none') {
    session.stop();
    billing = { ...billing, ok: false, reason: `Stopped: the CLI used an API key (${event.apiKeySource}) instead of your subscription.` };
  }
  recorder.write('event', { event });
  setState(reduce(state, event));
  if (event.type === 'result' || event.subtype === 'task_notification') refreshBoard();
});
session.on('exit', ({ reason, expected }) => {
  recorder.write('exit', { reason });
  setState(stopAll(state, reason));
  if (!expected) process.stderr.write(`[dashboard] ${reason}\n`);
});
session.on('log', (line) => process.stderr.write(`[dashboard] ${line}\n`));

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

// Loopback only: reject other Host headers (DNS rebinding) and cross-site POSTs.
function isTrusted(req) {
  const host = String(req.headers.host || '');
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return false;
  if (req.method !== 'POST') return true;
  const origin = req.headers.origin;
  return !origin || origin === `http://${host}`;
}

const routes = {
  'GET /api/state': (req, res) => send(res, 200, snapshot()),
  'GET /api/stream': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  },
  'POST /api/message': async (req, res) => {
    const text = String((await readBody(req)).text ?? '').trim();
    if (!text) return send(res, 400, { error: 'Message required' });
    if (player) return send(res, 409, { error: 'This is a replay of a recorded run' });
    if (!session.running && !(await refreshBilling()).ok) return send(res, 412, { error: billing.reason });
    if (!recorder.active) {
      recorder.start();
      recorder.write('billing', { billing });
      recorder.write('board', { board });
    }
    recorder.write('human', { text: text.slice(0, MAX_MESSAGE) });
    setState(addUserMessage(state, text.slice(0, MAX_MESSAGE)));
    session.send(text.slice(0, MAX_MESSAGE), state.session.id);
    return send(res, 202, { accepted: true });
  },
  'POST /api/stop': (req, res) => send(res, session.stop() ? 202 : 409, session.running ? { stopping: true } : { error: 'Supervisor is not running' }),
  'POST /api/reset': (req, res) => {
    if (session.running) return send(res, 409, { error: 'Stop the supervisor before starting a new session' });
    if (player) return send(res, 409, { error: 'This is a replay of a recorded run' });
    recorder.end();
    setState(initialState());
    return send(res, 200, { reset: true });
  },
  // Replay director: {action: 'play'|'pause'|'seek', speed?, to?} (ms from the start of the run).
  'POST /api/replay': async (req, res) => {
    if (!player) return send(res, 409, { error: 'Not in replay mode' });
    const { action, speed, to } = await readBody(req);
    if (action === 'seek') player.seek(Number(to) || 0);
    else if (action === 'play') player.play(speed);
    else if (action === 'pause') player.pause();
    else return send(res, 400, { error: 'action must be play, pause or seek' });
    return send(res, 200, player.info());
  },
  'GET /api/replay/markers': (req, res) => (player ? send(res, 200, player.markers()) : send(res, 409, { error: 'Not in replay mode' })),
  'POST /api/board/refresh': async (req, res) => {
    await refreshBoard();
    return send(res, 200, board);
  },
};

const server = createServer(async (req, res) => {
  try {
    if (!isTrusted(req)) return send(res, 403, { error: 'Forbidden' });
    const { pathname } = new URL(req.url, `http://${HOST}`);
    const route = routes[`${req.method} ${pathname}`];
    if (route) return await route(req, res);
    const asset = req.method === 'GET' && ASSETS[pathname];
    if (!asset) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    return res.end(await readFile(join(HERE, 'public', asset[0])));
  } catch (error) {
    return send(res, error.status || 500, { error: error.message });
  }
});

if (!player) {
  refreshBoard();
  refreshBilling();
}
if (!player) setInterval(refreshBoard, BOARD_POLL_MS).unref();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    session.stop();
    process.exit(0);
  });
}
server.listen(PORT, HOST, () => process.stdout.write(`Agent dashboard: http://${HOST}:${PORT}  (project: ${PROJECT})${player ? `  REPLAY ${REPLAY_FILE}` : ''}\n`));
