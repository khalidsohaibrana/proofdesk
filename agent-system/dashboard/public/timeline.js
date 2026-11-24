// The main chat: your messages, Sage's replies, Sage's own tool steps and
// inline delegation cards for every teammate Sage assigns, in the order they happened.
import { renderMarkdown } from './markdown.js';
import { persona } from './team.js';
import { asksHuman, avatar, elapsed, enterClass, h, relPath, statusOf } from './ui.js';

const SAGE = persona('supervisor');
const SUGGESTIONS = [
  'Introduce the team and what each of you does.',
  'What did you read first, and what gate are we at?',
  'Start Phase 0 and report status against G0.',
  'Plan the next wave of tickets, but don’t dispatch yet.',
];
/** First readable sentence of a Markdown result, for the compact card. */
export function firstLine(markdown) {
  const line = String(markdown ?? '').split('\n').map((item) => item.trim())
    .find((item) => item && !/^(\||```|-{3,}|#{1,6}\s*$)/.test(item));
  return (line ?? '').replace(/^#{1,6}\s+|^[-*+]\s+|\*\*|`/g, '').trim();
}

const STEP_KINDS = new Set(['tool', 'denied', 'error']);
// Expanded step groups survive live re-renders.
const openGroups = new Set();

/** Merge messages, supervisor steps and top-level dispatches into one ordered list. */
export function buildTimeline(snapshot) {
  const items = [
    ...snapshot.messages.map((message) => ({ kind: 'message', seq: message.seq ?? 0, message })),
    ...Object.values(snapshot.agents)
      .filter((agent) => !agent.parentId || agent.parentId === 'supervisor')
      .map((agent) => ({ kind: 'agent', seq: agent.seq ?? 0, agent })),
    ...snapshot.activity
      .filter((entry) => entry.agentId === 'supervisor' && STEP_KINDS.has(entry.kind))
      .map((entry) => ({ kind: 'step', seq: entry.seq ?? 0, entry })),
    ...snapshot.activity
      .filter((entry) => entry.agentId === 'supervisor' && entry.kind === 'followup')
      .map((entry) => ({ kind: 'followup', seq: entry.seq ?? 0, entry })),
  ].sort((a, b) => a.seq - b.seq);

  // Group consecutive steps, like Claude's "Used N tools".
  return items.reduce((out, item) => {
    const last = out.at(-1);
    if (item.kind === 'step' && last?.kind === 'steps') return [...out.slice(0, -1), { ...last, entries: [...last.entries, item.entry] }];
    if (item.kind === 'step') return [...out, { kind: 'steps', seq: item.seq, entries: [item.entry] }];
    return [...out, item];
  }, []);
}

function emptyState(team, onSuggest) {
  return h('div', { class: 'welcome' },
    h('div', { class: 'welcome-mark', 'aria-hidden': 'true' }, SAGE.emoji),
    h('h1', { class: 'welcome-title' }, 'Hi, I’m Sage.'),
    h('p', { class: 'welcome-sub' }, 'Your delivery supervisor. Tell me what you need; I plan it, hand it to the team, and check every gate.'),
    h('div', { class: 'welcome-team', 'aria-label': 'Your team' }, team.map((who) => h('span', { class: 'welcome-member', title: `${who.name} · ${who.role}` }, avatar(who, 'avatar-sm'), who.name))),
    h('div', { class: 'suggestions' }, SUGGESTIONS.map((text) => h('button', { class: 'suggestion', type: 'button', on: { click: () => onSuggest(text) } }, text))),
  );
}

function messageView(message, root) {
  if (message.role === 'user') return h('div', { class: 'msg msg-user' }, h('div', { class: 'bubble' }, message.text));
  const asks = asksHuman(message.text);
  const prose = h('div', { class: 'prose' });
  prose.append(renderMarkdown(relPath(message.text, root)));
  return h('div', { class: `msg msg-agent${asks ? ' asks' : ''}` },
    h('div', { class: 'msg-head' }, avatar(SAGE, 'avatar-sm'), h('span', { class: 'msg-name' }, SAGE.name),
      asks && h('span', { class: 'chip chip-wait' }, 'Waiting on you')),
    prose);
}

function stepsView(entries, root, key) {
  const blocked = entries.filter((entry) => entry.kind !== 'tool');
  const tools = entries.filter((entry) => entry.kind === 'tool');
  return h('div', { class: 'steps-wrap' },
    tools.length > 0 && h('details', {
      class: 'steps', open: openGroups.has(key),
      on: { toggle: (event) => (event.currentTarget.open ? openGroups.add(key) : openGroups.delete(key)) },
    },
      h('summary', {}, h('span', { class: 'steps-icon', 'aria-hidden': 'true' }, '⚙'), `Sage used ${tools.length} tool${tools.length > 1 ? 's' : ''}`),
      h('ul', {}, tools.map((entry) => h('li', {}, relPath(entry.text, root))))),
    blocked.map((entry) => h('div', { class: `notice notice-${entry.kind}` }, entry.kind === 'denied' ? '⛔ Blocked: ' : '⚠ ', relPath(entry.text, root))));
}

function delegationView(agent, who, root, onOpen) {
  const state = statusOf(agent.status);
  const live = agent.status === 'running' ? relPath(agent.progress || agent.lastTool || 'Getting started…', root) : '';
  const summary = agent.status !== 'running' && agent.summary ? relPath(firstLine(agent.summary), root) : '';
  return h('article', { class: `delegation hue-${who.hue} tone-${state.tone}${enterClass(`d-${agent.id}`)}` },
    h('div', { class: 'deleg-head' },
      avatar(SAGE, 'avatar-xs'), h('span', { class: 'deleg-arrow', 'aria-hidden': 'true' }, '→'), avatar(who, 'avatar-sm'),
      h('div', { class: 'deleg-who' }, h('span', { class: 'deleg-name' }, `Sage assigned ${who.name}`), h('span', { class: 'deleg-role' }, `${who.role}${agent.rounds > 1 ? ` · round ${agent.rounds}` : ''}`)),
      h('span', { class: `chip chip-${state.tone}` }, state.tone === 'live' && h('span', { class: 'spinner', 'aria-hidden': 'true' }), state.label)),
    h('div', { class: 'deleg-title' }, agent.description || 'Untitled task'),
    live && h('div', { class: 'deleg-live' }, live),
    summary && h('div', { class: 'deleg-summary' }, summary),
    h('div', { class: 'deleg-foot' },
      h('span', {}, [elapsed(agent), agent.toolUses ? `${agent.toolUses} tool calls` : '', agent.background ? 'in background' : ''].filter(Boolean).join(' · ')),
      h('button', { class: 'link-btn', type: 'button', on: { click: () => onOpen(agent.id) } }, 'Open ›')));
}

function followupView(entry, snapshot, personas, onOpen) {
  const target = entry.targetAgentId && snapshot.agents[entry.targetAgentId];
  const who = target ? personas.get(target.id) ?? persona(target.type) : null;
  const text = entry.text.replace(/^SendMessage · /, '');
  return h('div', { class: `followup${enterClass(`f-${entry.id}`)}` },
    avatar(SAGE, 'avatar-xs'), h('span', { class: 'followup-arrow', 'aria-hidden': 'true' }, '↩'),
    who && avatar(who, 'avatar-xs'),
    h('span', { class: 'followup-text' }, h('b', {}, `Sage sent ${who ? who.name : 'a teammate'} back`), ` · ${text}`),
    target && h('button', { class: 'link-btn', type: 'button', on: { click: () => onOpen(target.id) } }, 'Open ›'));
}

function workingView(snapshot, personas) {
  const busy = Object.values(snapshot.agents).filter((agent) => agent.status === 'running');
  if (snapshot.session.status !== 'running' && !busy.length) return null;
  const names = busy.map((agent) => personas.get(agent.id)?.name).filter(Boolean);
  const text = snapshot.session.status === 'running'
    ? `Sage is working${names.length ? ` · ${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} on it` : ''}…`
    : `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} still working…`;
  return h('div', { class: 'working' }, h('span', { class: 'spark', 'aria-hidden': 'true' }, '✻'), text);
}

/**
 * Render the conversation.
 * @param {HTMLElement} container
 * @param {object} snapshot
 * @param {Map<string, object>} personas
 * @param {{onOpen: (id: string) => void, onSuggest: (text: string) => void, team: object[]}} handlers
 */
export function renderTimeline(container, snapshot, personas, { onOpen, onSuggest, team }) {
  const root = snapshot.project.path;
  if (!snapshot.messages.length) {
    container.replaceChildren(emptyState(team, onSuggest));
    return;
  }
  const views = buildTimeline(snapshot).map((item) => {
    if (item.kind === 'message') return messageView(item.message, root);
    if (item.kind === 'steps') return stepsView(item.entries, root, item.seq);
    if (item.kind === 'followup') return followupView(item.entry, snapshot, personas, onOpen);
    return delegationView(item.agent, personas.get(item.agent.id) ?? persona(item.agent.type), root, onOpen);
  });
  const error = snapshot.session.error && h('div', { class: 'notice notice-error' }, `⚠ ${snapshot.session.error}`);
  container.replaceChildren(...views, workingView(snapshot, personas) ?? '', error || '');
}
