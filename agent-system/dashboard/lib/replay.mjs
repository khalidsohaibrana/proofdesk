// Replays a recorded run on a virtual clock: play, pause, seek and change speed.
// The same reducer that drives the live dashboard rebuilds the state, so a replay shows exactly what happened.
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { addUserMessage, initialState, reduce, stopAll } from './normalize.mjs';

const TICK_MS = 50;
const EMPTY_BOARD = { gate: '', tickets: [], pulls: [], error: null, updatedAt: null };

/** Parse a run file into records sorted by time. */
export function loadRun(file) {
  return readFileSync(file, 'utf8').split('\n').filter((line) => line.trim())
    .map((line) => JSON.parse(line))
    .sort((a, b) => a.t - b.t);
}

/** Fold one record into {state, board, billing}. Pure. */
export function applyRecord(world, record) {
  const at = new Date(record.t).toISOString();
  switch (record.kind) {
    case 'event': return { ...world, state: reduce(world.state, record.event, at) };
    case 'human': return { ...world, state: addUserMessage(world.state, record.text, at) };
    case 'board': return { ...world, board: record.board };
    case 'billing': return { ...world, billing: record.billing };
    case 'exit': return { ...world, state: stopAll(world.state, record.reason, at) };
    default: return world;
  }
}

export class ReplayPlayer extends EventEmitter {
  /** @param {Array<{t: number, kind: string}>} records */
  constructor(records) {
    super();
    if (!records.length) throw new Error('Run file has no records');
    this.records = records;
    this.start = records[0].t;
    this.duration = records.at(-1).t - this.start;
    this.speed = 1;
    this.playing = false;
    this.timer = null;
    this.reset();
  }

  reset() {
    this.index = 0;
    this.position = 0;
    this.world = { state: initialState(), board: EMPTY_BOARD, billing: { ok: true, plan: 'max', reason: null, checkedAt: null } };
  }

  /** Apply every record up to the current position. */
  catchUp() {
    let changed = false;
    while (this.index < this.records.length && this.records[this.index].t - this.start <= this.position) {
      this.world = applyRecord(this.world, this.records[this.index]);
      this.index += 1;
      changed = true;
    }
    return changed;
  }

  seek(positionMs) {
    const target = Math.max(0, Math.min(this.duration, positionMs));
    if (target < this.position) this.reset();
    this.position = target;
    this.catchUp();
    this.emit('change');
  }

  play(speed = this.speed) {
    this.speed = Math.max(0.25, Math.min(512, Number(speed) || 1));
    if (this.timer) clearInterval(this.timer);
    this.playing = true;
    this.timer = setInterval(() => {
      this.position = Math.min(this.duration, this.position + TICK_MS * this.speed);
      const changed = this.catchUp();
      if (this.position >= this.duration) this.pause();
      if (changed) this.emit('change');
    }, TICK_MS);
    this.emit('change');
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.emit('change');
  }

  /** Virtual "now" for elapsed-time displays. */
  now() {
    return new Date(this.start + this.position).toISOString();
  }

  info() {
    return { position: this.position, duration: this.duration, playing: this.playing, speed: this.speed, now: this.now() };
  }

  /** Index of records for building a scene plan: [{offset, kind, summary}]. */
  markers() {
    return this.records.map((record) => ({
      offset: record.t - this.start,
      kind: record.kind,
      summary: record.kind === 'human' ? record.text.slice(0, 80)
        : record.kind === 'event' ? [record.event.type, record.event.subtype, record.event.description ?? ''].filter(Boolean).join(' ')
          : record.kind,
    }));
  }
}
