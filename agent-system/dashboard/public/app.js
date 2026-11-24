// Dashboard client: renders the live snapshot streamed by the server. Text nodes only (no innerHTML).
const $ = (id) => document.getElementById(id);
const node = (tag, className = '', text = '') => {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== '') item.textContent = text;
  return item;
};

const STAGES = [
  ['ready', 'Ready'], ['building', 'Building'], ['review', 'Review'],
  ['qa', 'QA'], ['human', 'Awaiting you'], ['done', 'Done'],
];
const ROLE_CLASS = { supervisor: 'role-supervisor', builder: 'role-builder', reviewer: 'role-reviewer', 'security-reviewer': 'role-security', qa: 'role-qa' };
const STATUS_LABEL = { running: '● RUNNING', completed: '✓ DONE', failed: '✕ FAILED', stopped: '■ STOPPED', killed: '■ STOPPED' };
const KIND_LABEL = { dispatch: 'DISPATCH', tool: 'TOOL', say: 'SAYS', start: 'START', done: 'DONE', error: 'ERROR', denied: 'BLOCKED' };
const MAX_EVENTS = 80;

let snapshot = null;
let selectedAgent = null;
let openAgent = null;

// Show paths relative to the project root so activity stays readable.
const rel = (text) => (snapshot?.project?.path ? String(text ?? '').split(`${snapshot.project.path}/`).join('').split(snapshot.project.path).join('.') : String(text ?? ''));
const roleClass = (type) => ROLE_CLASS[type] || 'role-other';
const initial = (type) => (type === 'security-reviewer' ? '⛨' : (type || '?')[0].toUpperCase());
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
const elapsed = (agent) => {
  if (!agent.startedAt) return '';
  const end = agent.endedAt ? new Date(agent.endedAt) : new Date();
  const secs = Math.max(0, Math.round((end - new Date(agent.startedAt)) / 1000));
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

function toast(message) {
  const item = $('toast');
  item.textContent = message;
  item.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { item.style.display = 'none'; }, 4500);
}

async function post(path, body = {}) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}

const agentsList = () => Object.values(snapshot.agents).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));

function renderHeader() {
  const name = snapshot.project.name.toUpperCase();
  $('brand-name').textContent = name;
  $('brand-symbol').textContent = name[0] || 'A';
  $('location-name').textContent = name;
  document.title = `${snapshot.project.name} · Agent Command`;
  const { billing } = snapshot;
  const plan = billing.ok ? `${billing.plan} plan` : 'not on plan';
  $('runtime').textContent = `Claude Code · ${plan}${snapshot.session.model ? ` · ${snapshot.session.model}` : ''}`;
  $('runtime').className = billing.ok ? 'billing-ok' : 'billing-bad';
  $('billing-banner').hidden = billing.ok || !billing.checkedAt;
  $('billing-banner').textContent = billing.reason ?? '';
  $('chat-form').querySelector('button').disabled = !billing.ok && !snapshot.running;
  $('gate').textContent = snapshot.board.gate || 'No gate found in the status file.';
  $('stop').hidden = !snapshot.running;
  $('reset').disabled = snapshot.running;

  const agents = agentsList();
  const running = agents.filter((a) => a.status === 'running').length;
  const busy = snapshot.session.status === 'running';
  $('running-count').textContent = String(running + (busy ? 1 : 0));
  $('running-note').textContent = busy ? 'supervisor working' : snapshot.running ? 'supervisor waiting' : 'supervisor idle';
  $('dispatch-count').textContent = String(agents.length);
  $('checking-count').textContent = String(snapshot.board.pulls.filter((p) => ['review', 'qa'].includes(p.stage)).length);
  $('cost').textContent = `$${snapshot.usage.costUsd.toFixed(2)}`;
  $('turns').textContent = billing.ok
    ? `${snapshot.usage.turns} turns · on your ${billing.plan} plan, not billed per token`
    : `${snapshot.usage.turns} turns`;
}

function agentCard({ id, type, title, task, status, meta, onOpen }) {
  const card = node('button', `agent-card ${roleClass(type)} status-${status}`);
  card.type = 'button';
  card.setAttribute('aria-label', `${title}: ${status}. ${task}`);
  if (onOpen) card.onclick = onOpen;
  const top = node('div', 'agent-top');
  top.append(node('div', 'agent-icon', initial(type)), node('span', `badge badge-${status}`, STATUS_LABEL[status] || (status === 'idle' ? '○ IDLE' : '● WAITING')));
  card.append(top, node('div', 'agent-role', title), node('div', 'agent-task', task));
  if (meta) card.append(node('div', 'agent-meta', meta));
  if (id && selectedAgent === id) card.classList.add('selected');
  return card;
}

function renderFleet() {
  const list = $('agent-list');
  const agents = agentsList();
  const busy = snapshot.session.status === 'running';
  const supervisorStatus = busy ? 'running' : snapshot.running ? 'waiting' : 'idle';
  list.replaceChildren(agentCard({
    id: 'supervisor', type: 'supervisor', title: 'Supervisor', status: supervisorStatus,
    task: snapshot.session.detail || (busy ? 'Planning and delegating…' : 'Waiting for your instruction'),
    meta: `${agents.length} dispatched`,
    onOpen: () => selectAgent('supervisor'),
  }));
  for (const agent of agents) {
    list.append(agentCard({
      id: agent.id, type: agent.type, title: agent.type, status: agent.status,
      task: agent.description || 'No description',
      meta: [rel(agent.status === 'running' ? agent.progress || agent.lastTool : agent.summary), elapsed(agent), agent.toolUses ? `${agent.toolUses} tools` : '', agent.background ? 'background' : '']
        .filter(Boolean).join(' · '),
      onOpen: () => openAgentDetail(agent.id),
    }));
  }
  if (!agents.length) list.append(node('div', 'empty fleet-empty', 'No agents dispatched yet. Ask the supervisor to plan or run a ticket.'));
  const running = agents.filter((a) => a.status === 'running').length;
  $('agent-meta').textContent = `${running} running · ${agents.length} total`;
}

function verdictPills(verdicts = {}) {
  return ['review', 'security', 'qa'].filter((k) => verdicts[k]).map((k) => {
    const ok = ['APPROVE', 'PASS'].includes(verdicts[k].result);
    return node('span', `pill ${ok ? 'pill-ok' : 'pill-bad'}`, `${k.toUpperCase()}: ${verdicts[k].result}`);
  });
}

function renderBoard() {
  const { tickets, pulls, error, updatedAt } = snapshot.board;
  const items = [...pulls, ...tickets];
  const pipeline = $('pipeline');
  pipeline.replaceChildren(...STAGES.map(([key, label]) => {
    const stage = node('div', `stage stage-${key}`);
    stage.append(node('strong', '', String(items.filter((i) => i.stage === key).length)), node('span', '', label));
    return stage;
  }));
  const list = $('ticket-list');
  list.replaceChildren();
  if (!items.length) list.append(node('div', 'empty', error ? `GitHub unavailable: ${error}` : 'No open issues or pull requests yet. The supervisor files tickets as GitHub issues.'));
  for (const item of items) {
    const link = node('a', 'ticket');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const head = node('div', 'ticket-head');
    const name = node('div');
    name.append(node('span', 'ticket-id', `${item.branch ? 'PR' : 'ISSUE'} #${item.number}${item.branch ? ` · ${item.branch}` : ''}`), node('h3', '', item.title));
    head.append(name, node('span', `pill stage-pill-${item.stage}`, STAGES.find(([key]) => key === item.stage)?.[1] ?? item.stage));
    link.append(head);
    const pills = verdictPills(item.verdicts);
    if (pills.length) {
      const row = node('div', 'ticket-actions');
      row.append(...pills);
      link.append(row);
    }
    list.append(link);
  }
  $('board-meta').textContent = updatedAt ? `Updated ${time(updatedAt)}${error ? ` · ${error}` : ''}` : 'Loading GitHub…';
}

function renderMessages() {
  const box = $('messages');
  const nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 60;
  box.replaceChildren();
  if (!snapshot.messages.length) box.append(node('div', 'empty', 'Try: "What is your role and what did you read first?" or "Start Phase 0 and report against G0."'));
  for (const message of snapshot.messages) {
    const asks = message.role === 'supervisor' && /(^|\n)\s*(QUESTION|NEEDS HUMAN|DECISION NEEDED)\b/i.test(message.text);
    const item = node('div', `message ${message.role}${asks ? ' asks' : ''}`);
    item.append(node('small', '', `${asks ? 'waiting on you · ' : ''}${message.role} · ${time(message.at)}`), node('div', 'message-text', rel(message.text)));
    box.append(item);
  }
  if (snapshot.session.status === 'running') box.append(node('div', 'message supervisor typing', 'Supervisor is working…'));
  if (snapshot.session.error) box.append(node('div', 'message error', snapshot.session.error));
  if (nearBottom) box.scrollTop = box.scrollHeight;
}

function eventRow(entry) {
  const item = node('div', `event kind-${entry.kind} ${roleClass(entry.agent)}`);
  const head = node('div', 'event-head');
  head.append(node('span', 'event-agent', entry.agent), node('span', 'event-kind', KIND_LABEL[entry.kind] || entry.kind), node('small', '', time(entry.at)));
  item.append(head, node('div', 'event-text', rel(entry.text)));
  return item;
}

function renderEvents() {
  const entries = snapshot.activity.filter((e) => !selectedAgent || e.agentId === selectedAgent).slice(0, MAX_EVENTS);
  const list = $('events');
  list.replaceChildren(...entries.map(eventRow));
  if (!entries.length) list.append(node('div', 'empty', 'Supervisor and agent activity appears here, live.'));
  $('activity-filter').hidden = !selectedAgent;
  $('activity-title').textContent = selectedAgent ? `Activity · ${selectedAgent === 'supervisor' ? 'supervisor' : snapshot.agents[selectedAgent]?.type ?? 'agent'}` : 'Activity';
}

function selectAgent(id) {
  selectedAgent = selectedAgent === id ? null : id;
  render();
}

function openAgentDetail(id) {
  const agent = snapshot.agents[id];
  if (!agent) return;
  openAgent = id;
  selectedAgent = id;
  $('detail-id').textContent = `${agent.type.toUpperCase()} · ${(STATUS_LABEL[agent.status] || agent.status)} · ${elapsed(agent)}`;
  $('detail-title').textContent = agent.description || agent.type;
  const body = $('detail-body');
  const grid = node('div', 'detail-grid');
  for (const [label, value] of [
    ['DISPATCHED BY', agent.parentId || 'supervisor'], ['MODE', agent.background ? 'Background' : 'Foreground'],
    ['TOOL CALLS', String(agent.toolUses || 0)], ['TOKENS', agent.tokens ? agent.tokens.toLocaleString() : '—'],
  ]) {
    const field = node('div', 'detail-field');
    field.append(node('small', '', label), document.createTextNode(value));
    grid.append(field);
  }
  const brief = node('details');
  brief.open = !agent.summary;
  brief.append(node('summary', '', 'BRIEF FROM SUPERVISOR'), node('pre', 'detail-output', rel(agent.prompt) || 'Not captured'));
  const children = [grid, brief];
  if (agent.summary) children.push(node('div', 'section-kicker', 'RESULT'), node('pre', 'detail-output', rel(agent.summary)));
  children.push(node('div', 'section-kicker', 'ACTIVITY'));
  const events = snapshot.activity.filter((e) => e.agentId === id).slice(0, 40);
  const feed = node('div', 'events');
  feed.append(...(events.length ? events.map(eventRow) : [node('div', 'empty', 'No tool calls yet.')]));
  children.push(feed);
  body.replaceChildren(...children);
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}

function render() {
  if (!snapshot) return;
  renderHeader();
  renderFleet();
  renderBoard();
  renderMessages();
  renderEvents();
  if (openAgent && $('detail-dialog').open) openAgentDetail(openAgent);
}

function connect() {
  const status = $('connection');
  const source = new EventSource('/api/stream');
  source.onopen = () => { status.className = 'connection live'; status.querySelector('b').textContent = 'LIVE'; };
  source.onmessage = (event) => {
    snapshot = JSON.parse(event.data);
    render();
  };
  source.onerror = () => { status.className = 'connection down'; status.querySelector('b').textContent = 'RECONNECTING'; };
}

async function sendMessage() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    await post('/api/message', { text });
  } catch (error) {
    input.value = text;
    toast(error.message);
  }
}

$('chat-form').onsubmit = (event) => { event.preventDefault(); sendMessage(); };
$('chat-input').onkeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
};
$('stop').onclick = () => post('/api/stop').then(() => toast('Stopping the supervisor and its agents…')).catch((e) => toast(e.message));
$('reset').onclick = () => {
  if (confirm('Start a new supervisor session? The current conversation and agent history will be cleared from the dashboard.')) {
    post('/api/reset').then(() => toast('New session ready')).catch((e) => toast(e.message));
  }
};
$('refresh-board').onclick = () => post('/api/board/refresh').then(() => toast('Board refreshed')).catch((e) => toast(e.message));
$('activity-filter').onclick = () => { selectedAgent = null; render(); };
$('close-detail').onclick = () => { $('detail-dialog').close(); };
$('detail-dialog').onclose = () => { openAgent = null; };

const tick = () => {
  $('clock').textContent = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (snapshot && agentsList().some((a) => a.status === 'running')) renderFleet();
};
tick();
setInterval(tick, 1000);
connect();
