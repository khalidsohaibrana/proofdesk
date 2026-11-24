// Keeps Sage's context small: at a token budget the dashboard asks Sage to save a checkpoint,
// stops the process, and the next human message starts a fresh session.
import { beginCheckpoint, failCheckpoint, rotateSession } from './normalize.mjs';

export const DEFAULT_CONTEXT_BUDGET = 100_000;
export const CHECKPOINT_MESSAGE = 'CHECKPOINT';
export const CHECKPOINT_SAVED = 'CHECKPOINT SAVED';
export const CHECKPOINT_TIMEOUT_MS = 180_000;
export const STARTUP_PREFIX = 'New session. Read docs/delivery/status.md and docs/delivery/memory.md first, then: ';

/** Context budget in tokens: SAGE_CONTEXT_BUDGET if it is a positive number, else the default. */
export function contextBudget(env = process.env) {
  const value = Number(env.SAGE_CONTEXT_BUDGET);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_CONTEXT_BUDGET;
}

/** Rotate only when Sage is idle, over budget, alone (no subagents running) and not in replay. */
export function shouldRotate({ contextTokens, budget, status, agents, replay = false }) {
  if (replay || status !== 'idle' || contextTokens < budget) return false;
  return !Object.values(agents ?? {}).some((agent) => agent.status === 'running');
}

/** The first message of a fresh session carries the startup line. */
export const withStartupPrefix = (text, isFresh) => (isFresh ? `${STARTUP_PREFIX}${text}` : text);

export class Rotator {
  /**
   * @param {{session: import('./session.mjs').SupervisorSession, getState: () => any, setState: (s: any) => void,
   *   budget: number, replay?: boolean, timeoutMs?: number, onLog?: (line: string) => void}} deps
   */
  constructor({ session, getState, setState, budget, replay = false, timeoutMs = CHECKPOINT_TIMEOUT_MS, onLog = () => {} }) {
    Object.assign(this, { session, getState, setState, budget, replay, timeoutMs, onLog });
    this.pending = null;
    this.stopping = false;
    this.quietExit = false;
    this.suppressed = false;
  }

  /** True while a checkpoint is being saved or the process is being stopped. */
  get busy() {
    return Boolean(this.pending) || this.stopping;
  }

  /** A human message arrived: allow rotation again after an earlier failure. */
  noteHumanMessage() {
    this.suppressed = false;
  }

  /** Call for every result event, after the state has been updated. */
  onResult(event) {
    if (this.pending) return this.settle(event);
    const { usage, session, agents } = this.getState();
    if (this.suppressed || !shouldRotate({ contextTokens: usage.contextTokens, budget: this.budget, status: session.status, agents, replay: this.replay })) return;
    this.rotate();
  }

  /** The process exited. Returns true when the rotation caused it (so the caller skips the "stopped" notice). */
  onExit() {
    if (this.pending) this.fail('Sage stopped before saving a checkpoint.');
    const quiet = this.quietExit;
    this.quietExit = false;
    return quiet;
  }

  async rotate() {
    const result = await this.checkpointAndStop();
    if (result.ok) this.setState(rotateSession(this.getState()));
    else this.setState(failCheckpoint(this.getState(), result.error));
    return result;
  }

  /** Send CHECKPOINT, wait for CHECKPOINT SAVED, then stop the process. Never rejects. */
  checkpointAndStop() {
    if (this.busy || !this.session.running) return Promise.resolve({ ok: false, error: 'Sage is not ready to save a checkpoint.' });
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.fail(`Sage did not confirm the checkpoint within ${Math.round(this.timeoutMs / 1000)} s. The session was kept.`), this.timeoutMs);
      timer.unref?.();
      this.pending = { resolve, timer };
      this.setState(beginCheckpoint(this.getState()));
      this.session.send(CHECKPOINT_MESSAGE, this.getState().session.id);
    });
  }

  settle(event) {
    const saved = !event.is_error && String(event.result ?? '').includes(CHECKPOINT_SAVED);
    if (!saved) return this.fail('Sage did not save a checkpoint. The session was kept.');
    const { resolve, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    this.stopping = true;
    this.quietExit = true;
    this.session.once('exit', () => { this.stopping = false; resolve({ ok: true }); });
    this.session.stop();
  }

  fail(error) {
    if (!this.pending) return;
    const { resolve, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    this.suppressed = true;
    this.onLog(error);
    resolve({ ok: false, error });
  }
}
