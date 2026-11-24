// Right-hand pane: team activity feed, the GitHub board, or one teammate's detail.
import { renderMarkdown } from './markdown.js';
import { persona } from './team.js';
import { avatar, elapsed, enterClass, h, relPath, statusOf, time } from './ui.js';

const VERB = {
  dispatch: 'assigned work', tool: '', say: 'said', start: 'started', done: 'finished', error: 'hit an error', denied: 'was blocked',
};
const STAGES = [
  ['ready', 'Ready'], ['building', 'Building'], ['review', 'Review'], ['qa', 'QA'], ['human', 'Needs you'], ['done', 'Merged'],
];
const MAX_FEED = 120;
// Remember whether each agent's brief is expanded across live re-renders.
const briefOpen = new Map();

const whoFor = (agentId, snapshot, personas) => (agentId === 'supervisor' || !snapshot.agents[agentId]
  ? persona('supervisor')
  : personas.get(agentId) ?? persona(snapshot.agents[agentId].type));

function feedRow(entry, who, root) {
  return h('li', { class: `feed-row kind-${entry.kind}${enterClass(`f-${entry.id}`)}` },
    avatar(who, 'avatar-xs'),
    h('div', { class: 'feed-body' },
      h('div', { class: 'feed-line' }, h('b', {}, who.name), VERB[entry.kind] ? ` ${VERB[entry.kind]}` : '', h('time', {}, time(entry.at))),
      h('div', { class: 'feed-text' }, relPath(entry.text, root).replace(/^#{1,6}\s+/, ''))));
}

function activityView(snapshot, personas) {
  const entries = snapshot.activity.slice(0, MAX_FEED);
  if (!entries.length) return h('p', { class: 'pane-empty' }, 'When Sage assigns work, every step your teammates take shows up here, live.');
  return h('ul', { class: 'feed' }, entries.map((entry) => feedRow(entry, whoFor(entry.agentId, snapshot, personas), snapshot.project.path)));
}

function verdictChips(verdicts = {}) {
  return ['review', 'security', 'qa'].filter((key) => verdicts[key]).map((key) => {
    const ok = ['APPROVE', 'PASS'].includes(verdicts[key].result);
    const round = verdicts[key].round ? ` · round ${verdicts[key].round}/3` : '';
    return h('span', { class: `chip ${ok ? 'chip-done' : 'chip-bad'}` }, `${key}: ${verdicts[key].result.toLowerCase()}${round}`);
  });
}

function boardView(board, onRefresh) {
  const items = [...board.pulls, ...board.tickets];
  return h('div', { class: 'board' },
    h('div', { class: 'board-gate' }, h('span', { class: 'gate-label' }, 'Current gate'), h('p', {}, board.gate || 'No gate found in the status file.')),
    h('div', { class: 'stages' }, STAGES.map(([key, label]) => h('div', { class: `stage stage-${key}` },
      h('strong', {}, String(items.filter((item) => item.stage === key).length)), h('span', {}, label)))),
    items.length
      ? h('ul', { class: 'cards' }, items.map((item) => h('li', {},
        h('a', { class: 'card', href: item.url, target: '_blank', rel: 'noopener noreferrer' },
          h('div', { class: 'card-meta' }, `${item.branch ? 'PR' : 'Issue'} #${item.number}`, h('span', { class: `chip stage-chip-${item.stage}` }, STAGES.find(([key]) => key === item.stage)?.[1] ?? item.stage)),
          h('div', { class: 'card-title' }, item.title),
          h('div', { class: 'card-chips' }, verdictChips(item.verdicts))))))
      : h('p', { class: 'pane-empty' }, board.error ? `GitHub is unavailable: ${board.error}` : 'No open issues or pull requests yet. Sage files tickets as GitHub issues.'),
    h('div', { class: 'board-foot' }, h('span', {}, board.updatedAt ? `Updated ${time(board.updatedAt)}` : 'Loading…'),
      h('button', { class: 'link-btn', type: 'button', on: { click: onRefresh } }, 'Refresh')));
}

function agentView(agent, who, snapshot, onBack) {
  const root = snapshot.project.path;
  const state = statusOf(agent.status);
  const steps = snapshot.activity.filter((entry) => entry.agentId === agent.id).slice(0, 60);
  const result = h('div', { class: 'prose prose-sm' });
  if (agent.summary) result.append(renderMarkdown(relPath(agent.summary, root)));
  return h('div', { class: 'agent-detail' },
    h('button', { class: 'link-btn back', type: 'button', on: { click: onBack } }, '‹ Team activity'),
    h('div', { class: 'profile' }, avatar(who, 'avatar-xl'),
      h('div', {}, h('div', { class: 'profile-name' }, who.name), h('div', { class: 'profile-role' }, who.role),
        h('span', { class: `chip chip-${state.tone}` }, state.label))),
    h('h3', { class: 'detail-title' }, agent.description || 'Untitled task'),
    h('dl', { class: 'facts' },
      h('div', {}, h('dt', {}, 'Assigned by'), h('dd', {}, 'Sage')),
      h('div', {}, h('dt', {}, 'Time'), h('dd', {}, elapsed(agent) || '—')),
      h('div', {}, h('dt', {}, 'Tool calls'), h('dd', {}, String(agent.toolUses || 0))),
      h('div', {}, h('dt', {}, 'Mode'), h('dd', {}, agent.background ? 'Background' : 'Foreground'))),
    agent.summary && h('section', {}, h('h4', {}, 'Result'), result),
    h('details', {
      class: 'brief', open: briefOpen.get(agent.id) ?? !agent.summary,
      on: { toggle: (event) => briefOpen.set(agent.id, event.currentTarget.open) },
    },
      h('summary', {}, 'Brief from Sage'), h('pre', {}, relPath(agent.prompt, root) || 'Not captured')),
    h('section', {}, h('h4', {}, 'Steps'),
      steps.length ? h('ul', { class: 'feed' }, steps.map((entry) => feedRow(entry, who, root))) : h('p', { class: 'pane-empty' }, 'No steps yet.')));
}

/**
 * Render the pane body.
 * @param {HTMLElement} container
 * @param {{tab: string, selectedAgent: string|null}} view
 */
export function renderPane(container, view, snapshot, personas, { onBack, onRefresh }) {
  const agent = view.selectedAgent && snapshot.agents[view.selectedAgent];
  if (agent) {
    container.replaceChildren(agentView(agent, personas.get(agent.id) ?? persona(agent.type), snapshot, onBack));
    return;
  }
  container.replaceChildren(view.tab === 'board' ? boardView(snapshot.board, onRefresh) : activityView(snapshot, personas));
}
