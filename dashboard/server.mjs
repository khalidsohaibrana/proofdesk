import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, "..");
const dataPath =
  process.env.DASHBOARD_DATA_PATH || join(root, "data", "state.json");
const port = Number(process.env.PORT || 4173);
const active = new Map();
const launching = new Set();
let queue = Promise.resolve();
let supervisorBusy = false;

async function state() {
  try {
    const value = JSON.parse(await readFile(dataPath, "utf8"));
    return { tickets: [], messages: [], runs: [], events: [], ...value };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { tickets: [], messages: [], runs: [], events: [] };
  }
}
async function update(change) {
  const task = queue.then(async () => {
    const value = await state();
    const result = await change(value);
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(value, null, 2));
    return result ?? value;
  });
  queue = task.catch(() => {});
  return task;
}
function event(value, type, message, ticketId) {
  value.events.unshift({
    id: randomUUID(),
    type,
    message,
    ticketId,
    at: new Date().toISOString(),
  });
  value.events = value.events.slice(0, 100);
}
function send(res, code, value) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function input(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Request too large");
  }
  return JSON.parse(raw || "{}");
}
function command(program, args, cwd) {
  return new Promise((done) => {
    const child = spawn(program, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        output = (output + chunk).slice(-20_000);
      });
    child.on("error", (error) => done({ code: -1, output: error.message }));
    child.on("close", (code) => done({ code, output: output.trim() }));
  });
}
async function requireCodexLogin() {
  const result = await command("codex", ["login", "status"], repo);
  if (result.code !== 0) {
    throw new Error(
      "Codex CLI is not signed in. Run `codex login` in a terminal, complete account verification, then restart the dashboard.",
    );
  }
}
function codexFailure(output) {
  if (/401 Unauthorized|Missing bearer or basic authentication/i.test(output)) {
    return "Codex authentication was rejected. Run `codex login status` and sign in again with `codex login`, then restart the dashboard.";
  }
  return output.slice(-1000);
}
function ticketById(value, id) {
  const ticket = value.tickets.find((item) => item.id === id);
  if (!ticket) throw new Error("Ticket not found");
  return ticket;
}
async function launch(ticket, role) {
  await requireCodexLogin();
  const id = randomUUID();
  const branch =
    ticket.branch ||
    `agent/${ticket.id}-${ticket.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 35)}`;
  const worktree =
    ticket.worktree || resolve(repo, "..", ".proofdesk-worktrees", ticket.id);
  if (role === "builder" && !ticket.worktree) {
    await mkdir(dirname(worktree), { recursive: true });
    const result = await command(
      "git",
      ["worktree", "add", "-b", branch, worktree, "HEAD"],
      repo,
    );
    if (result.code !== 0) throw new Error(result.output);
  }
  const roleFiles = {
    builder: "builder.md",
    reviewer: "reviewer.md",
    qa: "qa.md",
  };
  const roleInstructions = `Read AGENTS.md, agent-system/agents/${roleFiles[role]}, docs/delivery/project-profile.md, and governing ADRs. Work only on ticket ${ticket.id}: ${ticket.title}. ${ticket.description}`;
  const prompts = {
    builder: `${roleInstructions}\nWork in this isolated branch. Implement the ticket or address the latest review findings. Run relevant tests. Commit changes. Do not merge. Report the exact commands and results. Latest findings: ${ticket.reviewNotes || "none"}`,
    reviewer: `${roleInstructions}\nYou are independent of the builder. Inspect the current branch and its diff against main. Do not edit code. End your response with exactly REVIEW: APPROVE or REVIEW: REQUEST CHANGES, followed by concrete findings. This is review round ${(ticket.reviewRounds || 0) + 1}.`,
    qa: `${roleInstructions}\nRun relevant tests and exercise the feature. Inspect the recorded feature evidence at ${ticket.recording || "NO RECORDING SUPPLIED"}. Do not claim to have viewed evidence unless you did. End with exactly QA: PASS only when tests and the recorded feature both verify the acceptance criteria. Otherwise end with QA: FAIL and explain what is missing.`,
  };
  const runRecord = {
    id,
    ticketId: ticket.id,
    role,
    status: "running",
    output: "",
    branch,
    worktree,
    startedAt: new Date().toISOString(),
  };
  await update((value) => {
    const current = ticketById(value, ticket.id);
    current.branch = branch;
    current.worktree = worktree;
    current.status =
      role === "builder"
        ? "building"
        : role === "reviewer"
          ? "reviewing"
          : "verifying";
    value.runs.unshift(runRecord);
    event(value, "start", `${role} started on ${ticket.title}`, ticket.id);
  });
  const outputFile = join(root, "data", `${id}.answer`);
  const child = spawn(
    "codex",
    [
      "exec",
      "-C",
      worktree,
      "-s",
      role === "reviewer" ? "read-only" : "workspace-write",
      "-o",
      outputFile,
      "-",
    ],
    {
      cwd: worktree,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  child.role = role;
  active.set(id, child);
  child.stdin.end(prompts[role]);
  let output = "";
  let pending = false;
  const capture = (chunk) => {
    output = (output + chunk).slice(-30_000);
    if (!pending) {
      pending = true;
      setTimeout(async () => {
        pending = false;
        await update((value) => {
          const run = value.runs.find((item) => item.id === id);
          if (run) run.output = output.trim();
        });
      }, 500);
    }
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("error", (error) => capture(`\n${error.message}`));
  child.on("close", async (code) => {
    active.delete(id);
    let answer = "";
    try {
      answer = await readFile(outputFile, "utf8");
    } catch {
      /* The CLI may fail before writing an answer. */
    }
    await update((value) => {
      const current = ticketById(value, ticket.id);
      const run = value.runs.find((item) => item.id === id);
      run.status = code === 0 ? "completed" : "failed";
      run.output = code === 0 ? output.trim() : codexFailure(output);
      run.answer = answer.trim();
      run.finishedAt = new Date().toISOString();
      if (code !== 0) current.status = "blocked";
      else if (role === "builder") current.status = "review";
      else if (role === "reviewer") {
        current.reviewRounds = (current.reviewRounds || 0) + 1;
        current.reviewNotes = answer.trim();
        current.status = /REVIEW:\s*APPROVE/i.test(answer)
          ? "qa"
          : current.reviewRounds >= 3
            ? "blocked"
            : "changes";
      } else
        current.status =
          /QA:\s*PASS/i.test(answer) && current.recording ? "mergeable" : "qa";
      event(
        value,
        code === 0 ? "complete" : "error",
        `${role} ${code === 0 ? "finished" : "failed"} on ${current.title}`,
        ticket.id,
      );
    });
  });
  return { runId: id };
}
async function supervisor(message) {
  if (supervisorBusy) throw new Error("Supervisor is already responding");
  supervisorBusy = true;
  try {
    await requireCodexLogin();
    const current = await update((value) => {
      value.messages.push({
        role: "user",
        content: message,
        at: new Date().toISOString(),
      });
      event(value, "message", "New supervisor request");
    });
    const prompt = `You are the supervisor for ProofDesk. Read AGENTS.md, agent-system/agents/supervisor.md, docs/delivery/status.md and accepted ADRs. Plan, assign and unblock. Never write code. Return a JSON object with reply and tickets. Put proposed executable tickets in tickets only when the user asks you to create them. Each ticket description must include acceptance criteria, tests, dependencies, and governing ADRs. Otherwise tickets is an empty array. Current tickets: ${JSON.stringify(current.tickets)}\nConversation:\n${current.messages
      .slice(-12)
      .map((item) => `${item.role}: ${item.content}`)
      .join("\n\n")}`;
    const outputFile = join(root, "data", `${randomUUID()}.answer`);
    const child = spawn(
      "codex",
      [
        "exec",
        "-C",
        repo,
        "-s",
        "read-only",
        "--output-schema",
        join(root, "supervisor.schema.json"),
        "-o",
        outputFile,
        "-",
      ],
      {
        cwd: repo,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    child.stdin.end(prompt);
    let errorText = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        errorText = (errorText + chunk).slice(-10_000);
      });
    const code = await new Promise((done) => {
      child.on("error", (error) => {
        errorText += error.message;
        done(-1);
      });
      child.on("close", done);
    });
    let answer = "";
    try {
      answer = await readFile(outputFile, "utf8");
    } catch {
      /* Codex may fail before replying. */
    }
    let proposed = [];
    if (code === 0) {
      try {
        const parsed = JSON.parse(answer);
        answer = parsed.reply;
        proposed = parsed.tickets;
      } catch {
        /* Preserve the CLI answer if schema parsing fails. */
      }
    } else answer = `Supervisor could not respond. ${codexFailure(errorText)}`;
    await update((value) => {
      for (const item of Array.isArray(proposed) ? proposed.slice(0, 10) : []) {
        if (
          typeof item.title !== "string" ||
          typeof item.description !== "string" ||
          !item.title.trim() ||
          !item.description.trim()
        )
          continue;
        const ticket = {
          id: randomUUID().slice(0, 8),
          title: item.title.trim().slice(0, 120),
          description: item.description.trim().slice(0, 8000),
          status: "ready",
          reviewRounds: 0,
          createdAt: new Date().toISOString(),
        };
        value.tickets.unshift(ticket);
        event(
          value,
          "ticket",
          `Supervisor created: ${ticket.title}`,
          ticket.id,
        );
      }
      value.messages.push({
        role: "supervisor",
        content: answer.trim(),
        at: new Date().toISOString(),
      });
      event(
        value,
        code === 0 ? "complete" : "error",
        code === 0 ? "Supervisor replied" : "Supervisor failed",
      );
    });
    return { answer: answer.trim(), code };
  } finally {
    supervisorBusy = false;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/state")
      return send(res, 200, {
        ...(await state()),
        supervisorBusy,
        activeRuns: [...active.keys()],
      });
    if (req.method === "POST" && url.pathname === "/api/tickets") {
      const data = await input(req);
      if (!data.title?.trim() || !data.description?.trim())
        return send(res, 400, { error: "Title and brief are required" });
      const ticket = {
        id: randomUUID().slice(0, 8),
        title: data.title.trim().slice(0, 120),
        description: data.description.trim().slice(0, 8000),
        status: "ready",
        reviewRounds: 0,
        createdAt: new Date().toISOString(),
      };
      await update((value) => {
        value.tickets.unshift(ticket);
        event(value, "ticket", `Ticket created: ${ticket.title}`, ticket.id);
      });
      return send(res, 201, ticket);
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const data = await input(req);
      const current = await state();
      const ticket = ticketById(current, data.ticketId);
      const allowed = {
        builder: ["ready", "changes", "blocked"],
        reviewer: ["review"],
        qa: ["qa"],
      };
      if (!allowed[data.role]?.includes(ticket.status))
        return send(res, 409, {
          error: "This agent cannot start at the current gate",
        });
      if (launching.has(ticket.id))
        return send(res, 409, { error: "Agent launch already in progress" });
      if (
        data.role === "builder" &&
        [...active.values()].filter((child) => child.role === "builder")
          .length +
          launching.size >=
          5
      )
        return send(res, 409, { error: "Five builders are already running" });
      if (data.role === "reviewer" && ticket.reviewRounds >= 3)
        return send(res, 409, { error: "Review limit reached" });
      if (data.role === "reviewer" && !ticket.prUrl)
        return send(res, 409, {
          error: "Attach the ticket pull request before review",
        });
      if (data.role === "qa" && !ticket.recording)
        return send(res, 409, {
          error: "Attach the feature recording before QA",
        });
      launching.add(ticket.id);
      try {
        return send(res, 202, await launch(ticket, data.role));
      } finally {
        launching.delete(ticket.id);
      }
    }
    if (req.method === "POST" && url.pathname === "/api/evidence") {
      const data = await input(req);
      const updated = await update((value) => {
        const ticket = ticketById(value, data.ticketId);
        if (ticket.status === "merged")
          throw new Error("Merged ticket is closed");
        if (
          data.prUrl &&
          !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(data.prUrl)
        )
          throw new Error("Enter a GitHub pull request URL");
        if (
          data.prUrl &&
          value.tickets.some(
            (item) => item.id !== ticket.id && item.prUrl === data.prUrl,
          )
        )
          throw new Error("PR already belongs to another ticket");
        ticket.prUrl = data.prUrl?.trim() || ticket.prUrl || "";
        ticket.recording =
          data.recording?.trim().slice(0, 500) || ticket.recording || "";
        event(
          value,
          "evidence",
          `Evidence updated for ${ticket.title}`,
          ticket.id,
        );
        return ticket;
      });
      return send(res, 200, updated);
    }
    if (req.method === "POST" && url.pathname === "/api/stop") {
      const data = await input(req);
      const child = active.get(data.runId);
      if (!child) return send(res, 404, { error: "Run is no longer active" });
      child.kill("SIGTERM");
      return send(res, 202, { stopped: true });
    }
    if (req.method === "POST" && url.pathname === "/api/supervisor") {
      const data = await input(req);
      if (!data.message?.trim())
        return send(res, 400, { error: "Message required" });
      const result = await supervisor(data.message.trim().slice(0, 8000));
      return send(res, result.code === 0 ? 200 : 502, {
        answer: result.answer,
      });
    }
    const assets = {
      "/": ["index.html", "text/html"],
      "/app.js": ["app.js", "text/javascript"],
      "/style.css": ["style.css", "text/css"],
    };
    if (req.method === "GET" && assets[url.pathname]) {
      const [file, type] = assets[url.pathname];
      res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
      return res.end(await readFile(join(root, "public", file)));
    }
    send(res, 404, { error: "Not found" });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
});
await update((value) => {
  for (const run of value.runs) {
    if (run.status !== "running") continue;
    run.status = "interrupted";
    run.finishedAt = new Date().toISOString();
    const ticket = value.tickets.find((item) => item.id === run.ticketId);
    if (ticket) ticket.status = "blocked";
    event(
      value,
      "error",
      `Interrupted ${run.role} run after server restart`,
      run.ticketId,
    );
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`ProofDesk dashboard listening on 127.0.0.1:${port}`),
);
