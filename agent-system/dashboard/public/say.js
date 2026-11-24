// The spoken line of a Sage message: its ```say block, or else a plain first sentence.
import { stripDecision } from './decision.js';

const BLOCK = /```say[ \t]*\n([\s\S]*?)```/i;
const MAX_WORDS = 30;

/** The text of the say block, or '' when the message has none. */
export function extractSay(text) {
  const match = BLOCK.exec(String(text ?? ''));
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

/** Remove the say block so it isn't also shown as a code block in the message. */
export function stripSay(text) {
  return String(text ?? '').replace(BLOCK, '').trim();
}

/** Markdown, links, code and URLs removed, so nothing is read out as punctuation. */
export function plainSpeech(markdown) {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .split('\n')
    .filter((line) => !/^\s*\|/.test(line) && !/^\s*-{3,}\s*$/.test(line))
    .map((line) => line.replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s+/, ''))
    .join(' ')
    .replace(/[*_~#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First sentence of a message, up to about 30 words. */
export function firstSentence(markdown) {
  const plain = plainSpeech(stripSay(stripDecision(markdown)));
  const sentence = /^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain;
  const words = sentence.split(' ');
  return words.length > MAX_WORDS ? `${words.slice(0, MAX_WORDS).join(' ')}.` : sentence;
}

/** What to read aloud for a Sage message. */
export const spokenLine = (text) => plainSpeech(extractSay(text)) || firstSentence(text);
