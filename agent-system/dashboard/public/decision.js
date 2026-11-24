// Turns a supervisor's request for a human decision into quick-reply options.
// Preferred format (the supervisor is asked to end decision requests with it):
//
//   ```decision
//   Accept ADR-0003?
//   - Accept with all five defaults (recommended)
//   - Accept, but change decision 2
//   - Hold: I'll read it first
//   ```
//
// Fallback: quoted answers the supervisor suggests, e.g. reply "accept ADR-0003 with all five defaults".

const BLOCK = /```decision[ \t]*\n([\s\S]*?)```/i;
const RECOMMENDED = /\s*\((recommended|recommend)\)\s*$/i;
const QUOTED = /[“"]([^“”"\n]{6,90})[”"]/g;
const ASK_CONTEXT = /(reply|say|answer|tell me|respond|type)\b[^\n]{0,60}$/i;
const MAX_OPTIONS = 4;

/**
 * @typedef {{ label: string, recommended: boolean }} Option
 * @typedef {{ question: string, options: Option[], source: 'block' | 'quotes' }} Decision
 */

/** Remove the decision block so it isn't also shown as a code block in the message. */
export function stripDecision(text) {
  return String(text ?? '').replace(BLOCK, '').trimEnd();
}

function fromBlock(text) {
  const match = BLOCK.exec(text);
  if (!match) return null;
  const lines = match[1].split('\n').map((line) => line.trim()).filter(Boolean);
  const question = lines.find((line) => !/^[-*•]\s+/.test(line)) ?? '';
  const options = lines.filter((line) => /^[-*•]\s+/.test(line)).map((line) => {
    const raw = line.replace(/^[-*•]\s+/, '');
    return { label: raw.replace(RECOMMENDED, '').trim(), recommended: RECOMMENDED.test(raw) };
  }).filter((option) => option.label);
  return options.length ? { question, options: options.slice(0, MAX_OPTIONS), source: 'block' } : null;
}

function fromQuotes(text) {
  const options = [];
  for (const match of text.matchAll(QUOTED)) {
    const before = text.slice(Math.max(0, match.index - 80), match.index);
    if (!ASK_CONTEXT.test(before) && !/\bor\s*\**$/i.test(before.trim())) continue;
    const label = match[1].trim();
    if (!options.some((option) => option.label.toLowerCase() === label.toLowerCase())) options.push({ label, recommended: options.length === 0 });
  }
  return options.length ? { question: '', options: options.slice(0, MAX_OPTIONS), source: 'quotes' } : null;
}

/**
 * Quick replies for a supervisor message, or null when it doesn't ask for a decision.
 * @param {string} text
 * @returns {Decision|null}
 */
export function parseDecision(text) {
  const value = String(text ?? '');
  const decision = fromBlock(value) ?? fromQuotes(value);
  if (!decision) return null;
  if (!decision.options.some((option) => option.recommended)) decision.options[0].recommended = true;
  // Recommended answer first.
  decision.options.sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return decision;
}
