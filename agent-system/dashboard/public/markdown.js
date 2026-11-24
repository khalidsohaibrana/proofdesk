// Minimal Markdown → DOM renderer for agent replies.
// Builds elements with textContent only (never innerHTML), so agent output can't inject markup.

const el = (tag, className, children = []) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
};

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/;

/** Render inline code, bold, italic and http(s) links. */
export function inline(text) {
  const parts = [];
  let rest = String(text);
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      parts.push(document.createTextNode(rest));
      break;
    }
    if (match.index) parts.push(document.createTextNode(rest.slice(0, match.index)));
    const [token] = match;
    if (match[1]) parts.push(el('code', '', [token.slice(1, -1)]));
    else if (match[2]) parts.push(el('strong', '', inline(token.slice(2, -2))));
    else if (match[3]) parts.push(el('em', '', inline(token.slice(1, -1))));
    else {
      const link = el('a', '', [token.slice(1, token.indexOf(']('))]);
      link.href = match[5];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      parts.push(link);
    }
    rest = rest.slice(match.index + token.length);
  }
  return parts;
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
const isDivider = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

function table(lines) {
  const [head, , ...body] = lines;
  const thead = el('thead', '', [el('tr', '', cells(head).map((cell) => el('th', '', inline(cell))))]);
  const tbody = el('tbody', '', body.map((row) => el('tr', '', cells(row).map((cell) => el('td', '', inline(cell))))));
  return el('div', 'md-table', [el('table', '', [thead, tbody])]);
}

function list(lines, ordered) {
  const items = lines.map((line) => el('li', '', inline(line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''))));
  return el(ordered ? 'ol' : 'ul', '', items);
}

/**
 * Render a Markdown string into a fragment.
 * @param {string} source
 * @returns {DocumentFragment}
 */
export function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  const lines = String(source ?? '').replace(/\r/g, '').split('\n');
  let i = 0;
  const take = (test) => {
    const block = [];
    while (i < lines.length && test(lines[i])) block.push(lines[i++]);
    return block;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const fence = /^\s*```(\w*)/.exec(line);
    if (fence) {
      i += 1;
      const code = take((item) => !/^\s*```/.test(item));
      i += 1;
      fragment.append(el('pre', 'md-code', [el('code', '', [code.join('\n')])]));
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      fragment.append(el(`h${Math.min(heading[1].length + 2, 6)}`, 'md-h', inline(heading[2])));
      i += 1;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { fragment.append(el('hr')); i += 1; continue; }
    if (isTableRow(line) && isDivider(lines[i + 1] ?? '')) { fragment.append(table(take(isTableRow))); continue; }
    if (/^\s*[-*+]\s+/.test(line)) { fragment.append(list(take((item) => /^\s*[-*+]\s+/.test(item)), false)); continue; }
    if (/^\s*\d+[.)]\s+/.test(line)) { fragment.append(list(take((item) => /^\s*\d+[.)]\s+/.test(item)), true)); continue; }
    if (/^\s*>/.test(line)) {
      const quote = take((item) => /^\s*>/.test(item)).map((item) => item.replace(/^\s*>\s?/, ''));
      fragment.append(el('blockquote', '', inline(quote.join(' '))));
      continue;
    }
    const paragraph = take((item) => item.trim() && !/^\s*(```|#{1,4}\s|[-*+]\s|\d+[.)]\s|>)/.test(item) && !isTableRow(item));
    if (!paragraph.length) { fragment.append(el('p', '', inline(lines[i]))); i += 1; continue; }
    fragment.append(el('p', '', paragraph.flatMap((item, index) => (index ? [el('br'), ...inline(item)] : inline(item)))));
  }
  return fragment;
}
