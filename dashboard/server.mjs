import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, symlink, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, '..');
const dataPath = join(root, 'data', 'state.json');
const port = Number(process.env.PORT || 4173);
const active = new Map();
const codexHome = process.env.CODEX_HOME || resolve(root, 'data', 'codex-home');
async function codexEnvironment() {
  await mkdir(codexHome, { recursive: true });
  const auth = join(codexHome, 'auth.json');
  try { await access(auth); }
  catch {
    const original = join(homedir(), '.codex', 'auth.json');
    try { await access(original); await symlink(original, auth); }
    catch { /* Codex will report an authentication error if no login is available. */ }
  }
  return { ...process.env, CODEX_HOME: codexHome };
}
let queue = Promise.resolve();

async function state() {
  try { return JSON.parse(await readFile(dataPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { tickets: [], messages: [], runs: [] };
  }
}
async function update(change) {
  const task = queue.then(async () => {
    const current = await state();
    await change(current);
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(current, null, 2));
    return current;
  });
  queue = task.catch(() => {});
  return task;
}
function respond(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = '';
  for await (const part of req) {
    raw += part;
    if (raw.length > 100_000) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}
async function run(command, args, cwd, input = '') {
  const env = command === 'codex' ? await codexEnvironment() : process.env;
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-30_000); });
    child.on('error', error => done({ code: -1, output: error.message }));
    child.on('close', code => done({ code, output: output.trim() }));
    child.stdin.end(input);
  });
}
async function launch(ticket) {
  const runId = randomUUID();
  const branch = `agent/${ticket.id}-${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 35)}`;
  const worktree = resolve(repo, '..', '.proofdesk-worktrees', runId);
  await mkdir(dirname(worktree), { recursive: true });
  const created = await run('git', ['worktree', 'add', '-b', branch, worktree, 'HEAD'], repo);
  if (created.code !== 0) throw new Error(created.output);
  await update(s => {
    s.runs.unshift({ id: runId, ticketId: ticket.id, branch, worktree, status: 'running', output: '', startedAt: new Date().toISOString() });
    s.tickets.find(t => t.id === ticket.id).status = 'building';
  });
  const prompt = `You are a builder for ProofDesk. Read CLAUDE.md, agent-system/agents/builder.md, and governing ADRs. Implement only this ticket in your current isolated worktree. Run relevant tests. Commit changes on the current branch. Do not merge or deploy. Report work, tests, and remaining issues. Ticket ${ticket.id}: ${ticket.title}\n\n${ticket.description}`;
  const child = spawn('codex', ['exec', '-C', worktree, '-s', 'workspace-write', '-'], { cwd: worktree, env: await codexEnvironment(), stdio: ['pipe', 'pipe', 'pipe'] });
  active.set(runId, child);
  child.stdin.end(prompt);
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-30_000); });
  child.on('error', error => { output += `\n${error.message}`; });
  child.on('close', async code => {
    active.delete(runId);
    await update(s => {
      const record = s.runs.find(r => r.id === runId);
      record.status = code === 0 ? 'completed' : 'failed';
      record.output = output.trim();
      record.finishedAt = new Date().toISOString();
      s.tickets.find(t => t.id === ticket.id).status = code === 0 ? 'review' : 'blocked';
    });
  });
  return runId;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/state') return respond(res, 200, await state());
    if (req.method === 'POST' && url.pathname === '/api/tickets') {
      const data = await body(req);
      if (!data.title?.trim() || !data.description?.trim()) return respond(res, 400, { error: 'Title and brief are required' });
      const ticket = { id: randomUUID().slice(0, 8), title: data.title.trim().slice(0, 120), description: data.description.trim().slice(0, 8000), status: 'ready', createdAt: new Date().toISOString() };
      await update(s => s.tickets.unshift(ticket));
      return respond(res, 201, ticket);
    }
    if (req.method === 'POST' && url.pathname === '/api/dispatch') {
      const data = await body(req);
      const current = await state();
      const ticket = current.tickets.find(t => t.id === data.ticketId);
      if (!ticket || ticket.status !== 'ready') return respond(res, 409, { error: 'Ticket must be ready' });
      if (active.size >= 5) return respond(res, 409, { error: 'Five builders are already running' });
      const runId = await launch(ticket);
      return respond(res, 202, { runId });
    }
    if (req.method === 'POST' && url.pathname === '/api/supervisor') {
      const data = await body(req);
      if (!data.message?.trim()) return respond(res, 400, { error: 'Message required' });
      const message = data.message.trim().slice(0, 8000);
      const current = await update(s => s.messages.push({ role: 'user', content: message, at: new Date().toISOString() }));
      const history = current.messages.slice(-12).map(m => `${m.role}: ${m.content}`).join('\n\n');
      const prompt = `You are the ProofDesk supervisor. Read agent-system/agents/supervisor.md, docs/delivery/status.md, docs/delivery/project-profile.md, and the accepted ADRs. Plan, assign and unblock. Never write application code. Reply to the user directly. The dashboard ticket board is managed by the user through its form. Current tickets: ${JSON.stringify(current.tickets)}\n\nConversation:\n${history}`;
      const result = await run('codex', ['exec', '-C', repo, '-s', 'read-only', '-'], repo, prompt);
      const answer = result.code === 0 ? result.output : `Supervisor run failed: ${result.output}`;
      await update(s => s.messages.push({ role: 'supervisor', content: answer, at: new Date().toISOString() }));
      return respond(res, result.code === 0 ? 200 : 502, { answer });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(join(root, 'public', 'index.html')));
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(await readFile(join(root, 'public', 'app.js')));
    }
    if (req.method === 'GET' && url.pathname === '/style.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      return res.end(await readFile(join(root, 'public', 'style.css')));
    }
    respond(res, 404, { error: 'Not found' });
  } catch (error) { respond(res, 500, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`ProofDesk dashboard listening on 127.0.0.1:${port}`));
