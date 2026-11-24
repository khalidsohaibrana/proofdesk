// Sage's voice: decides what is new and worth speaking, queues it, and plays it
// (Kokoro from the server, or the browser's own voice when that fails).
import { parseDecision } from './decision.js';
import { spokenLine } from './say.js';

const DECISION_SUFFIX = 'I need a decision from you.';
const LOAD_TIMEOUT_MS = 8_000;
const FAILURE_WORDS = 8;

export const initialMemory = () => ({ ready: false, msgSeq: 0, agents: {}, rotations: 0, error: null });

const isFinal = (message, snapshot) => (snapshot.seq ?? 0) > (message.seq ?? 0) || snapshot.session.status !== 'running';
const statuses = (snapshot) => Object.fromEntries(Object.values(snapshot.agents).map((agent) => [agent.id, agent.status]));

/**
 * Compare a snapshot with what was already handled. Returns the new memory and the lines to speak.
 * The first snapshot only sets the baseline, so history is never read out. Pass enabled=false
 * (toggle off, or a replay) to keep the baseline moving without speaking anything.
 */
export function planSpeech(memory, snapshot, enabled) {
  const rotations = snapshot.usage?.rotations ?? 0;
  const error = snapshot.session.error ?? null;
  if (!memory.ready) {
    const msgSeq = Math.max(0, ...snapshot.messages.map((message) => message.seq ?? 0));
    return { memory: { ready: true, msgSeq, agents: statuses(snapshot), rotations, error }, lines: [] };
  }
  const lines = [];
  let msgSeq = Math.min(memory.msgSeq, snapshot.seq ?? memory.msgSeq);
  for (const message of snapshot.messages) {
    if (message.role !== 'supervisor' || message.seq <= msgSeq) continue;
    if (!isFinal(message, snapshot)) break;
    msgSeq = message.seq;
    const line = spokenLine(message.text);
    if (line) lines.push(parseDecision(message.text) ? `${line} ${DECISION_SUFFIX}` : line);
  }
  for (const agent of Object.values(snapshot.agents)) {
    if (agent.status === 'failed' && memory.agents[agent.id] !== 'failed') {
      lines.push(`An agent failed: ${String(agent.description || 'a task').split(/\s+/).slice(0, FAILURE_WORDS).join(' ')}.`);
    }
  }
  if (error && error !== memory.error) lines.push('Sage hit an error.');
  if (rotations > memory.rotations) lines.push('Sage saved a checkpoint. Your next message starts a fresh session.');
  return { memory: { ready: true, msgSeq, agents: statuses(snapshot), rotations, error }, lines: enabled ? lines : [] };
}

/** Plays lines one at a time; a new line never cuts off the current one. */
export class SpeechQueue {
  #pending = [];
  #busy = false;
  #generation = 0;
  constructor(play, cancel = () => {}) {
    this.play = play;
    this.cancel = cancel;
  }

  get size() { return this.#pending.length + (this.#busy ? 1 : 0); }

  push(...lines) {
    this.#pending.push(...lines);
    if (!this.#busy) this.#drain();
  }

  /** Drop everything queued and cut off the line being spoken. */
  stop() {
    this.#generation += 1;
    this.#pending = [];
    this.cancel();
  }

  async #drain() {
    this.#busy = true;
    const generation = this.#generation;
    while (this.#pending.length && generation === this.#generation) {
      try { await this.play(this.#pending.shift()); } catch { /* one bad line must not stall the queue */ }
    }
    this.#busy = false;
    if (this.#pending.length) this.#drain();
  }
}

/**
 * Browser player: Kokoro audio from /api/tts, falling back to speechSynthesis on an error
 * or when the engine takes longer than 8 s. Reports "Kokoro" / "system" and "preparing".
 */
export function createPlayer({ onMode, onPreparing, fetchImpl = fetch, synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, makeAudio = (url) => new Audio(url) }) {
  let audio = null;
  let kokoroReady = false;
  let stopped = null;
  let epoch = 0;

  async function viaKokoro(text) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
      const response = await fetchImpl('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal });
      if (!response.ok) throw new Error(`TTS failed (${response.status})`);
      return await response.blob();
    } finally {
      clearTimeout(timer);
    }
  }

  const playBlob = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    audio = makeAudio(url);
    const done = (fn, value) => { URL.revokeObjectURL(url); stopped = null; audio = null; fn(value); };
    audio.onended = () => done(resolve);
    audio.onerror = () => done(reject, new Error('Audio failed'));
    stopped = () => done(resolve);
    audio.play().catch((error) => done(reject, error));
  });

  const speakSystem = (text) => new Promise((resolve) => {
    if (!synth || !Utterance) return resolve();
    const utterance = new Utterance(text);
    utterance.onend = resolve;
    utterance.onerror = resolve;
    stopped = () => resolve();
    synth.speak(utterance);
  });

  return {
    async play(text) {
      const started = epoch;
      onPreparing(!kokoroReady);
      try {
        const blob = await viaKokoro(text);
        kokoroReady = true;
        onPreparing(false);
        if (started !== epoch) return; // Stop was pressed while the line was being prepared
        onMode('Kokoro');
        await playBlob(blob);
      } catch {
        onPreparing(false);
        if (started !== epoch) return;
        onMode('system');
        await speakSystem(text);
      }
    },
    cancel() {
      epoch += 1;
      if (audio) audio.pause();
      synth?.cancel();
      stopped?.();
    },
  };
}
