// Records a run as timestamped JSON lines so it can be replayed exactly (for demos and audits).
// Line shapes: {t, kind: 'event', event} | {t, kind: 'human', text} | {t, kind: 'board', board}
//              | {t, kind: 'billing', billing} | {t, kind: 'exit', reason}
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export class RunRecorder {
  /** @param {string} dir folder for run files (git-ignored data/ by default) */
  constructor(dir) {
    this.dir = dir;
    this.file = null;
    this.queue = Promise.resolve();
  }

  get active() {
    return Boolean(this.file);
  }

  /** Start a new run file; later writes go there. */
  start(now = new Date()) {
    this.file = join(this.dir, `run-${now.toISOString().replace(/[:.]/g, '-')}.jsonl`);
    return this.file;
  }

  /** Close the current run; the next start() opens a new file. */
  end() {
    this.file = null;
  }

  /**
   * Append one record. Writes are serialized so lines never interleave.
   * @param {string} kind
   * @param {Record<string, unknown>} payload
   */
  write(kind, payload) {
    if (!this.file) return this.queue;
    const line = `${JSON.stringify({ t: Date.now(), kind, ...payload })}\n`;
    const file = this.file;
    this.queue = this.queue
      .then(() => mkdir(this.dir, { recursive: true }))
      .then(() => appendFile(file, line))
      .catch((error) => process.stderr.write(`[dashboard] could not record run: ${error.message}\n`));
    return this.queue;
  }
}
