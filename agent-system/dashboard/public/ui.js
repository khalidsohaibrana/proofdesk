// Tiny DOM helpers shared by the dashboard modules. Text is always set via text nodes.

/**
 * Create an element. attrs: { class, text, on: {event: fn}, ...attributes }.
 * Children may be nodes, strings, arrays or falsy (skipped).
 */
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'on') for (const [event, fn] of Object.entries(value)) node.addEventListener(event, fn);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child)));
  return node;
}

export const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

// The server's clock (the virtual clock during a replay), so durations match what happened.
let clockIso = null;
export const setClock = (iso) => { clockIso = iso; };

export function elapsed(agent) {
  if (!agent?.startedAt) return '';
  const end = agent.endedAt ? new Date(agent.endedAt) : clockIso ? new Date(clockIso) : new Date();
  const secs = Math.max(0, Math.round((end - new Date(agent.startedAt)) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return mins < 60 ? `${mins}m ${secs % 60}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Strip the project root from paths so text stays readable. */
export function relPath(text, root) {
  const value = String(text ?? '');
  if (!root) return value;
  return value.split(`${root}/`).join('').split(root).join('.');
}

export const STATUS = {
  running: { label: 'Working', tone: 'live' },
  waiting: { label: 'Waiting for you', tone: 'wait' },
  completed: { label: 'Done', tone: 'done' },
  failed: { label: 'Failed', tone: 'bad' },
  stopped: { label: 'Stopped', tone: 'bad' },
  killed: { label: 'Stopped', tone: 'bad' },
  idle: { label: 'Idle', tone: 'idle' },
};
export const statusOf = (status) => STATUS[status] ?? { label: status, tone: 'idle' };

// Items already on screen don't replay their entrance animation on live re-renders.
const seenKeys = new Set();
/** Returns ' enter' the first time a key is rendered, '' afterwards. */
export function enterClass(key) {
  if (seenKeys.has(key)) return '';
  seenKeys.add(key);
  return ' enter';
}

/** Avatar bubble with the persona's emoji and colour. */
export const avatar = (who, size = '') => h('span', { class: `avatar ${size} hue-${who.hue}`, 'aria-hidden': 'true' }, who.emoji);

/** Does a supervisor reply end with a question to the human? */
export const asksHuman = (text) => /(^|\n)\s*\**\s*(QUESTION|NEEDS HUMAN|DECISION NEEDED)\b/i.test(String(text ?? ''));
