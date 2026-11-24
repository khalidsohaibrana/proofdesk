// Dashboard shell: sidebar team, chat with Sage, side pane, composer. Live via Server-Sent Events.
import { renderPane } from './pane.js';
import { CORE_TEAM, assignPersonas, persona } from './team.js';
import { renderTimeline } from './timeline.js';
import { asksHuman, avatar, elapsed, h, humanize, relPath, setClock, statusOf } from './ui.js';

const $ = (id) => document.getElementById(id);
const THEME_KEY = 'agent-dashboard-theme';
const MAX_INPUT_HEIGHT = 220;
const NARROW = window.matchMedia('(max-width: 1100px)');

let snapshot = null;
let personas = new Map();
const view = { tab: 'activity', selectedAgent: null, paneOpen: !NARROW.matches };

function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('show'), 4000);
}

async function post(path, body = {}) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}

// ---- team roster in the sidebar ----------------------------------------------------------
function teamRows() {
  const agents = Object.values(snapshot.agents).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const sage = snapshot.session.status === 'running' ? 'running' : snapshot.running ? 'waiting' : 'idle';
  const rows = [{ who: persona('supervisor'), status: sage, line: snapshot.session.detail || (sage === 'running' ? 'Planning and delegating' : 'Ready for you'), id: null }];
  const types = [...CORE_TEAM.slice(1), ...new Set(agents.map((agent) => agent.type).filter((type) => !CORE_TEAM.includes(type)))];
  for (const type of types) {
    const instances = agents.filter((agent) => agent.type === type);
    if (!instances.length) rows.push({ who: persona(type), status: 'idle', line: 'Not assigned yet', id: null });
    for (const agent of instances) {
      rows.push({
        who: personas.get(agent.id) ?? persona(type),
        status: agent.status,
        line: relPath(agent.status === 'running' ? agent.progress || agent.lastTool || agent.description : agent.description, snapshot.project.path),
        id: agent.id,
      });
    }
  }
  return rows;
}

function renderTeam() {
  $('team').replaceChildren(...teamRows().map((row) => {
    const state = statusOf(row.status);
    return h('li', {},
      h('button', {
        class: `member tone-${state.tone}${row.id && row.id === view.selectedAgent ? ' selected' : ''}`,
        type: 'button',
        'aria-label': `${row.who.name}, ${row.who.role}: ${state.label}`,
        on: { click: () => (row.id ? openAgent(row.id) : row.who.type === 'supervisor' ? focusInput() : toast(`${row.who.name} hasn’t been assigned work yet.`)) },
      },
      h('span', { class: 'member-avatar' }, avatar(row.who, 'avatar-sm'), h('span', { class: `presence tone-${state.tone}` })),
      h('span', { class: 'member-text' },
        h('span', { class: 'member-name' }, row.who.name, h('span', { class: 'member-role' }, row.who.role)),
        h('span', { class: 'member-line' }, row.status === 'idle' ? row.line : row.status === 'waiting' ? state.label : `${state.label} · ${row.line}`))));
  }));
}

// ---- "Now" strip: always-visible live status ------------------------------------------------
function sageStep() {
  const step = snapshot.activity.find((entry) => entry.agentId === 'supervisor' && ['tool', 'dispatch', 'followup'].includes(entry.kind));
  return step ? humanize(relPath(step.text, snapshot.project.path)) : 'Thinking…';
}

function liveRow(who, text, timer, tone) {
  return h('div', { class: `live-row tone-${tone}` },
    h('span', { class: 'live-spin', 'aria-hidden': 'true' }), avatar(who, 'avatar-xs'),
    h('b', {}, who.name), h('span', { class: 'live-text' }, text), timer && h('span', { class: 'live-time' }, timer));
}

function renderLive() {
  const root = snapshot.project.path;
  const working = Object.values(snapshot.agents).filter((agent) => agent.status === 'running')
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const rows = [];
  const lastSage = [...snapshot.messages].reverse().find((message) => message.role === 'supervisor');
  if (snapshot.session.status === 'running') rows.push(liveRow(persona('supervisor'), sageStep(), '', 'live'));
  else if (!snapshot.replay && snapshot.running && !working.length && lastSage && asksHuman(lastSage.text)) {
    rows.push(liveRow(persona('supervisor'), 'is waiting for your decision. Reply below.', '', 'wait'));
  }
  for (const agent of working) {
    const who = personas.get(agent.id) ?? persona(agent.type);
    rows.push(liveRow(who, humanize(relPath(agent.progress || agent.lastTool || 'Getting started…', root)), elapsed(agent), 'live'));
  }
  $('live').hidden = !rows.length;
  $('live').replaceChildren(...rows);
  $('live-count').hidden = !working.length;
  $('live-count').textContent = String(working.length);
}

// ---- header, sidebar footer, composer -----------------------------------------------------
function renderChrome() {
  const { billing, session, board, usage } = snapshot;
  $('brand-name').textContent = snapshot.project.name;
  document.title = `${snapshot.project.name} · Agent Team`;
  $('gate').textContent = board.gate || 'No gate found';
  const open = [...board.pulls, ...board.tickets].filter((item) => item.stage !== 'done');
  $('gate-counts').textContent = `${board.tickets.length} open issues · ${board.pulls.filter((pr) => pr.stage !== 'done').length} open PRs${open.some((i) => i.stage === 'human') ? ' · needs you' : ''}`;

  $('plan').className = `plan ${billing.ok ? 'ok' : 'bad'}`;
  $('plan-text').textContent = billing.ok ? `Claude ${billing.plan} plan${session.model ? ` · ${session.model.replace(/^claude-/, '')}` : ''}` : 'Not on your plan';
  $('billing-banner').hidden = billing.ok || !billing.checkedAt;
  $('billing-banner').textContent = billing.reason ?? '';

  const working = session.status === 'running';
  const busy = Object.values(snapshot.agents).filter((agent) => agent.status === 'running').length;
  $('sage-status').textContent = working ? `Working${busy ? ` · ${busy} teammate${busy > 1 ? 's' : ''} on it` : ''}` : busy ? `${busy} teammate${busy > 1 ? 's' : ''} working` : snapshot.running ? 'Waiting for you' : 'Idle';
  $('sage-status').className = `who-status ${working || busy ? 'live' : ''}`;
  $('usage').textContent = usage.costUsd ? `≈ $${usage.costUsd.toFixed(2)} API-equivalent · on plan` : '';
  $('stop').hidden = Boolean(snapshot.replay) || !(snapshot.running && (working || busy));
  renderReplay(snapshot.replay);
  $('send').disabled = !billing.ok && !snapshot.running;
  $('reset').disabled = snapshot.running;
}

function renderPaneShell() {
  $('shell').classList.toggle('pane-open', view.paneOpen);
  $('toggle-pane').setAttribute('aria-expanded', String(view.paneOpen));
  for (const tab of document.querySelectorAll('.tab')) {
    const active = !view.selectedAgent && tab.dataset.tab === view.tab;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  renderPane($('pane-body'), view, snapshot, personas, {
    onBack: () => { view.selectedAgent = null; render(); },
    onRefresh: () => post('/api/board/refresh').then(() => toast('Board refreshed')).catch((error) => toast(error.message)),
  });
}

// Live updates replace DOM nodes; hold them while a pointer is pressed so clicks always land.
let pointerDown = false;
let renderPending = false;

function render() {
  if (!snapshot) return;
  if (pointerDown) { renderPending = true; return; }
  renderPending = false;
  setClock(snapshot.now);
  personas = assignPersonas(Object.values(snapshot.agents));
  const chat = $('chat');
  const pinned = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 80;
  renderChrome();
  renderTeam();
  renderLive();
  renderTimeline($('timeline'), snapshot, personas, {
    onOpen: openAgent,
    onSuggest: (text) => { $('input').value = text; send(); },
    team: CORE_TEAM.map((type) => persona(type)),
  });
  renderPaneShell();
  if (pinned) chat.scrollTop = chat.scrollHeight;
}

// ---- replay badge and controls ----------------------------------------------------------
const clockText = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function renderReplay(replay) {
  $('replay').hidden = !replay;
  $('input').disabled = Boolean(replay);
  if (!replay) return;
  $('input').placeholder = 'Replay of a recorded run';
  $('replay').textContent = `Replay · real run ${clockText(replay.position)} / ${clockText(replay.duration)}${replay.playing && replay.speed !== 1 ? ` · ×${replay.speed}` : ''}`;
}
const REPLAY_SEEK_MS = 15_000;
document.addEventListener('keydown', (event) => {
  const replay = snapshot?.replay;
  if (!replay || event.target === $('input')) return;
  if (event.key === ' ') { event.preventDefault(); post('/api/replay', { action: replay.playing ? 'pause' : 'play' }).catch((error) => toast(error.message)); }
  if (event.key === 'ArrowRight') post('/api/replay', { action: 'seek', to: replay.position + REPLAY_SEEK_MS }).catch((error) => toast(error.message));
  if (event.key === 'ArrowLeft') post('/api/replay', { action: 'seek', to: replay.position - REPLAY_SEEK_MS }).catch((error) => toast(error.message));
});

// ---- actions ----------------------------------------------------------------------------------
function openAgent(id) {
  view.selectedAgent = id;
  view.paneOpen = true;
  $('shell').classList.remove('sidebar-open');
  render();
}

function focusInput() {
  $('shell').classList.remove('sidebar-open');
  $('input').focus();
}

function autosize() {
  const input = $('input');
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`;
}

async function send() {
  const input = $('input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  autosize();
  try {
    await post('/api/message', { text });
  } catch (error) {
    input.value = text;
    autosize();
    toast(error.message);
  }
}

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function connect() {
  const status = $('connection');
  const source = new EventSource('/api/stream');
  source.onopen = () => { status.className = 'conn live'; status.querySelector('b').textContent = 'Live'; };
  let last = '';
  source.onmessage = (event) => {
    if (event.data === last) return;
    last = event.data;
    snapshot = JSON.parse(event.data);
    render();
  };
  source.onerror = () => { status.className = 'conn down'; status.querySelector('b').textContent = 'Reconnecting'; };
}

// ---- wiring -----------------------------------------------------------------------------------
$('composer').addEventListener('submit', (event) => { event.preventDefault(); send(); });
$('input').addEventListener('input', autosize);
$('input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); }
});
$('stop').addEventListener('click', () => post('/api/stop').then(() => toast('Stopping Sage and the team…')).catch((error) => toast(error.message)));
$('reset').addEventListener('click', () => {
  if (window.confirm('Start a new session with Sage? This clears the conversation and team history from the dashboard.')) {
    post('/api/reset').then(() => { view.selectedAgent = null; toast('New session ready'); }).catch((error) => toast(error.message));
  }
});
$('toggle-pane').addEventListener('click', () => { view.paneOpen = !view.paneOpen; render(); });
$('close-pane').addEventListener('click', () => { view.paneOpen = false; render(); });
$('gate-card').addEventListener('click', () => { view.tab = 'board'; view.selectedAgent = null; view.paneOpen = true; $('shell').classList.remove('sidebar-open'); render(); });
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => { view.tab = tab.dataset.tab; view.selectedAgent = null; render(); });
}
$('open-sidebar').addEventListener('click', () => $('shell').classList.add('sidebar-open'));
$('close-sidebar').addEventListener('click', () => $('shell').classList.remove('sidebar-open'));
$('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: theme lasts this visit */ }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && view.selectedAgent) { view.selectedAgent = null; render(); }
});

document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
for (const type of ['pointerup', 'pointercancel']) {
  document.addEventListener(type, () => {
    pointerDown = false;
    // Let the click event fire on the original node before re-rendering.
    if (renderPending) setTimeout(render, 0);
  }, true);
}

try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* storage unavailable: follow the system theme */ }
setInterval(() => { if (snapshot && Object.values(snapshot.agents).some((agent) => agent.status === 'running')) render(); }, 1000);
connect();
