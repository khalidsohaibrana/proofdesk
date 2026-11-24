#!/usr/bin/env node
// S1 spike: drive the supervisor headless and record the raw event stream.
// Usage: node agent-system/dashboard/scripts/probe.mjs [--project <path>] [--model sonnet] [--out <file>]
// Writes raw stream-json lines to data/ (git-ignored; may contain local paths) and prints a summary of what the stream exposes.

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TIMEOUT_MS = 6 * 60 * 1000;
const ALLOWED_TOOLS = 'Agent,Read,Glob,Grep';

const PROBE_PROMPT = [
  'PROBE RUN for the dashboard spike. Do NOT create, edit or commit any files, and do not update status.md.',
  '1. Dispatch one `general-purpose` subagent (model haiku) in the foreground: read README.md and reply with its first heading only.',
  '2. Dispatch one `Explore` subagent (model haiku) in the background: count the files in agent-system/agents/ and reply with the number.',
  '3. When both are done, give a 3-line STATUS, then end with exactly one question to the human, prefixed "QUESTION:".',
].join('\n');

function parseArgs(argv) {
  const args = { project: process.cwd(), model: 'sonnet', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === '--project') { args.project = resolve(value); i += 1; }
    else if (flag === '--model') { args.model = value; i += 1; }
    else if (flag === '--out') { args.out = resolve(value); i += 1; }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return { ...args, out: args.out ?? join(HERE, '..', 'data', `probe-${stamp}.jsonl`) };
}

function userMessage(text) {
  return `${JSON.stringify({ type: 'user', message: { role: 'user', content: text } })}\n`;
}

function summarize(events) {
  const byKind = {};
  const agentCalls = [];
  const childCounts = {};
  const toolCallsByParent = {};
  let result = null;

  for (const ev of events) {
    const kind = [ev.type, ev.subtype, ev.hook_event].filter(Boolean).join('/');
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    const parent = ev.parent_tool_use_id ?? 'supervisor';
    if (ev.parent_tool_use_id) childCounts[parent] = (childCounts[parent] ?? 0) + 1;

    for (const block of ev.message?.content ?? []) {
      if (block?.type !== 'tool_use') continue;
      toolCallsByParent[parent] = [...(toolCallsByParent[parent] ?? []), block.name];
      if (block.name === 'Agent' || block.name === 'Task') {
        agentCalls.push({ id: block.id, parent, input: block.input });
      }
    }
    if (ev.type === 'result') result = ev;
  }

  return {
    byKind,
    agentCalls: agentCalls.map(({ id, parent, input }) => ({
      id, parent,
      subagent_type: input?.subagent_type,
      description: input?.description,
      run_in_background: input?.run_in_background ?? false,
      childMessages: childCounts[id] ?? 0,
    })),
    toolCallsByParent,
    result: result && {
      subtype: result.subtype, is_error: result.is_error,
      cost_usd: result.total_cost_usd, duration_ms: result.duration_ms,
      text: String(result.result ?? '').slice(0, 400),
    },
  };
}

function run({ project, model, out }) {
  mkdirSync(dirname(out), { recursive: true });
  const file = createWriteStream(out);
  const events = [];

  const child = spawn('claude', [
    '--agent', 'supervisor', '-p', '--model', model,
    '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--include-hook-events', '--forward-subagent-text',
    '--allowedTools', ALLOWED_TOOLS,
  ], { cwd: project, stdio: ['pipe', 'pipe', 'pipe'] });

  const timer = setTimeout(() => {
    console.error(`[probe] timeout after ${DEFAULT_TIMEOUT_MS / 1000}s, stopping`);
    child.kill('SIGTERM');
  }, DEFAULT_TIMEOUT_MS);

  createInterface({ input: child.stdout }).on('line', (line) => {
    file.write(`${line}\n`);
    try {
      const ev = JSON.parse(line);
      events.push(ev);
      const tag = ev.parent_tool_use_id ? `sub:${ev.parent_tool_use_id.slice(-6)}` : 'supervisor';
      process.stderr.write(`[${tag}] ${ev.type}${ev.subtype ? `/${ev.subtype}` : ''}\n`);
      if (ev.type === 'result') child.stdin.end();
    } catch (err) {
      console.error(`[probe] non-JSON line skipped: ${err.message}`);
    }
  });
  child.stderr.on('data', (d) => process.stderr.write(`[stderr] ${d}`));

  child.on('close', (code) => {
    clearTimeout(timer);
    file.end();
    console.log(JSON.stringify({ exitCode: code, fixture: out, ...summarize(events) }, null, 2));
    process.exitCode = code ?? 1;
  });

  child.stdin.write(userMessage(PROBE_PROMPT));
}

run(parseArgs(process.argv.slice(2)));
