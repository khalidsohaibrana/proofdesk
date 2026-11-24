import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSay, firstSentence, spokenLine, stripSay } from '../public/say.js';

test('reads the say block and hides it from the body', () => {
  const text = '```say\nAll five pull requests are open.\n```\n\n## Status\nDetails here.';
  assert.equal(extractSay(text), 'All five pull requests are open.');
  assert.equal(stripSay(text), '## Status\nDetails here.');
  assert.equal(spokenLine(text), 'All five pull requests are open.');
});

test('without a say block, speaks the first sentence with markdown, links, code and URLs removed', () => {
  const text = '## Update\n**Atlas** finished [the ADR](https://x.io/a) in `docs/adr/0003.md`, see https://example.com now. More detail follows.';
  const line = spokenLine(text);
  assert.equal(line, 'Update Atlas finished the ADR in , see now.');
  assert.doesNotMatch(line, /[*`#]|http|\]\(/);
});

test('fallback is capped at about 30 words and skips tables and decision blocks', () => {
  const long = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
  assert.equal(firstSentence(long).split(' ').length, 30);
  assert.equal(firstSentence('| a | b |\n|---|---|\nReal sentence here. Next.\n```decision\nQ?\n- A\n```'), 'Real sentence here.');
});

test('says nothing for an empty message', () => {
  assert.equal(spokenLine('```js\ncode\n```'), '');
});
