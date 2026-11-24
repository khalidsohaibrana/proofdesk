// The virtual team: every agent type gets a name, an emoji and a role.
// Several agents of one type (e.g. 3 builders) get distinct names in dispatch order.

const ROSTER = {
  supervisor: { emoji: '🧭', names: ['Sage'], role: 'Delivery Supervisor', hue: 'coral' },
  builder: { emoji: '🔨', names: ['Bolt', 'Forge', 'Rivet', 'Weld', 'Spark'], role: 'Builder', hue: 'blue' },
  reviewer: { emoji: '🔍', names: ['Iris', 'Lens'], role: 'Code Reviewer', hue: 'amber' },
  'security-reviewer': { emoji: '🛡️', names: ['Aegis'], role: 'Security Reviewer', hue: 'red' },
  qa: { emoji: '🧪', names: ['Quinn', 'Tess'], role: 'QA Engineer', hue: 'green' },
  'product-analyst': { emoji: '📋', names: ['Nova'], role: 'Product Analyst', hue: 'violet' },
  'ux-designer': { emoji: '🎨', names: ['Pixel'], role: 'UX Designer', hue: 'pink' },
  'solution-architect': { emoji: '🏛️', names: ['Atlas'], role: 'Solution Architect', hue: 'teal' },
  Explore: { emoji: '🔭', names: ['Scout', 'Ranger'], role: 'Explorer', hue: 'teal' },
  Plan: { emoji: '🗺️', names: ['Compass'], role: 'Planner', hue: 'violet' },
  'general-purpose': { emoji: '🤖', names: ['Echo', 'Byte'], role: 'Generalist', hue: 'gray' },
};
const FALLBACK = { emoji: '🤖', names: [], role: 'Specialist', hue: 'gray' };

/** The standing team shown in the sidebar, in delivery order. */
export const CORE_TEAM = ['supervisor', 'product-analyst', 'ux-designer', 'solution-architect', 'builder', 'reviewer', 'security-reviewer', 'qa'];

const titleCase = (text) => String(text).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Persona for an agent type; `index` picks among several of the same type.
 * @param {string} type
 * @param {number} [index]
 */
export function persona(type, index = 0) {
  const entry = ROSTER[type] ?? FALLBACK;
  const names = entry.names.length ? entry.names : [titleCase(type)];
  const base = names[index % names.length];
  const name = index >= names.length ? `${base} ${Math.floor(index / names.length) + 1}` : base;
  return { type, name, emoji: entry.emoji, role: entry.role === 'Specialist' ? titleCase(type) : entry.role, hue: entry.hue };
}

/**
 * Give every dispatched agent its persona: n-th agent of a type gets the n-th name.
 * @param {Array<{id: string, type: string, seq: number}>} agents
 * @returns {Map<string, ReturnType<typeof persona>>}
 */
export function assignPersonas(agents) {
  const counts = {};
  const byId = new Map();
  for (const agent of [...agents].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    const index = counts[agent.type] ?? 0;
    counts[agent.type] = index + 1;
    byId.set(agent.id, persona(agent.type, index));
  }
  return byId;
}
