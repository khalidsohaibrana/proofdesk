// Runs the supervisor as one long-lived Claude Code process and streams its events.
import { execFile, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';

// Tools the headless supervisor and its subagents may use without a prompt.
// The project's deny list and guard hook still apply on top of this.
export const DEFAULT_ALLOWED_TOOLS = [
  'Agent', 'Read', 'Glob', 'Grep', 'Write', 'Edit', 'MultiEdit', 'TodoWrite', 'WebSearch', 'WebFetch',
  'Bash(git *)', 'Bash(gh *)', 'Bash(npm *)', 'Bash(npx *)', 'Bash(node *)', 'Bash(pnpm *)',
  'Bash(ls *)', 'Bash(cat *)', 'Bash(mkdir *)', 'Bash(docker compose *)',
];
// Interactive-only tools: the supervisor asks the human in plain text instead.
const DISALLOWED_TOOLS = ['AskUserQuestion'];
const STOP_GRACE_MS = 3000;
const AUTH_TIMEOUT_MS = 15_000;

// Variables that would make the CLI bill an API key or another provider instead of
// the signed-in Claude subscription. They are removed from the child environment.
export const API_BILLING_ENV = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY',
  'AWS_BEARER_TOKEN_BEDROCK',
];

/** Copy of the environment with API-billing overrides removed. */
export function planOnlyEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !API_BILLING_ENV.includes(key)));
}

/**
 * Confirm the CLI is signed in with a Claude subscription (not an API key or Console login).
 * @param {string} [command]
 * @returns {Promise<{ok: boolean, plan: string|null, reason: string|null}>}
 */
export function checkPlanAuth(command = 'claude') {
  return new Promise((resolveCheck) => {
    execFile(command, ['auth', 'status'], { env: planOnlyEnv(), timeout: AUTH_TIMEOUT_MS }, (error, stdout) => {
      let status = {};
      try {
        status = JSON.parse(stdout);
      } catch {
        return resolveCheck({ ok: false, plan: null, reason: `Could not read \`${command} auth status\`${error ? `: ${error.message}` : ''}` });
      }
      if (!status.loggedIn) return resolveCheck({ ok: false, plan: null, reason: 'Claude CLI is signed out. Run `claude auth login --claudeai` in a terminal.' });
      if (status.authMethod !== 'claude.ai') {
        return resolveCheck({ ok: false, plan: null, reason: `Claude CLI is signed in with "${status.authMethod}", which bills API usage. Run \`claude auth login --claudeai\` to use your subscription.` });
      }
      return resolveCheck({ ok: true, plan: status.subscriptionType ?? 'subscription', reason: null });
    });
  });
}

/**
 * @typedef {object} SessionOptions
 * @property {string} cwd          project root the supervisor runs in
 * @property {string} [agent]      agent name (default "supervisor")
 * @property {string} [model]      optional model override
 * @property {string[]} [allowedTools]
 * @property {string} [command]    CLI binary (default "claude")
 */

export class SupervisorSession extends EventEmitter {
  /** @param {SessionOptions} options */
  constructor(options) {
    super();
    this.options = { agent: 'supervisor', command: 'claude', allowedTools: DEFAULT_ALLOWED_TOOLS, ...options };
    this.child = null;
    this.stopping = false;
  }

  get running() {
    return Boolean(this.child);
  }

  /** @param {string|null} resumeId */
  buildArgs(resumeId) {
    const { agent, model, allowedTools } = this.options;
    return [
      '--agent', agent, '-p',
      '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
      '--include-hook-events', '--forward-subagent-text',
      '--permission-mode', 'acceptEdits',
      '--allowedTools', allowedTools.join(','),
      '--disallowedTools', DISALLOWED_TOOLS.join(','),
      ...(model ? ['--model', model] : []),
      ...(resumeId ? ['--resume', resumeId] : []),
    ];
  }

  start(resumeId) {
    if (this.child) return;
    this.stopping = false;
    const child = spawn(this.options.command, this.buildArgs(resumeId), {
      cwd: this.options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: planOnlyEnv(),
    });
    this.child = child;
    let stderrTail = '';

    createInterface({ input: child.stdout }).on('line', (line) => {
      if (!line.trim()) return;
      try {
        this.emit('event', JSON.parse(line));
      } catch {
        this.emit('log', `non-JSON output: ${line.slice(0, 200)}`);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-2000);
    });
    child.on('error', (error) => this.emit('log', `failed to start ${this.options.command}: ${error.message}`));
    child.on('close', (code, signal) => {
      this.child = null;
      const reason = this.stopping
        ? 'Stopped by the human'
        : `Supervisor process exited (${signal ?? code})${stderrTail ? `: ${stderrTail.trim().slice(-300)}` : ''}`;
      this.emit('exit', { code, signal, reason, expected: this.stopping });
    });
  }

  /**
   * Send a human message. Starts (or resumes) the process if needed.
   * @param {string} text
   * @param {string|null} resumeId
   */
  send(text, resumeId) {
    if (!this.child) this.start(resumeId);
    const payload = { type: 'user', message: { role: 'user', content: text } };
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  /** Stop the process; running subagents stop with it. */
  stop() {
    if (!this.child) return false;
    this.stopping = true;
    const child = this.child;
    child.stdin.end();
    child.kill('SIGINT');
    setTimeout(() => {
      if (this.child === child) child.kill('SIGTERM');
    }, STOP_GRACE_MS).unref();
    return true;
  }
}
