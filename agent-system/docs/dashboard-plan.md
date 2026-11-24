# Agent Dashboard: feasibility and implementation plan

**Status:** Draft, awaiting human approval
**Date:** 2026-11-23
**Goal:** a local web dashboard for running and demoing the supervised multi-agent system. You chat with the supervisor and watch it delegate to subagents live: who is running, what each is doing, gate progress and cost.

---

## 1. Feasibility findings (checked 2026-11-23, Claude Code v2.1.220)

| Question | Finding | Evidence |
|---|---|---|
| Can a server drive the supervisor programmatically? | **Yes.** `claude --agent supervisor -p --input-format stream-json --output-format stream-json` is a long-lived process: messages go in on stdin as JSON lines, and events stream out on stdout. | `claude --help` |
| Can we see subagent activity, not just the supervisor's? | **Yes, in principle.** `--forward-subagent-text` emits subagent messages tagged with `parent_tool_use_id`, the id of the supervisor's `Agent` call. Every message also carries `session_id`. | `claude --help`; probe output shows `parent_tool_use_id` on messages |
| Can we see hook lifecycle (session start, tool calls)? | **Yes.** `--include-hook-events` emits `system/hook_started` and `hook_response` events with `hook_event`, `hook_name`, `exit_code`, `outcome`. | Probe captured `SessionStart` events |
| Do project agents load headless? | **Yes.** The `init` event lists `supervisor`, `builder`, `reviewer`, `qa`, `security-reviewer` and the others. It also lists about 70 global/ECC agents, which is noise. | Probe `init` event |
| Multi-turn chat and restarts | Keep stdin open for multi-turn. After a server restart, use `--resume <session_id>`. | `claude --help` |
| Auth via your subscription (no API billing) | **Blocked right now.** The CLI is logged out (`claude auth status` → `loggedIn: false`), and the probe failed with "OAuth session expired". Fix: run `claude auth login` once. | Probe `result` event |
| Permission prompts in headless mode | No interactive prompts appear headless. Use `--allowedTools` plus the existing deny list and guard hook. A dashboard "Approve" button via `--permission-prompt-tool` isn't in `--help`, so it's **unverified**. Treat it as a Phase 2 stretch goal. | `claude --help` |
| Supervisor questions to the human | `AskUserQuestion` may not work headless, so the supervisor must ask in plain text, and the dashboard renders it as a "Waiting on you" card. Needs one line added to `supervisor.md`. | Inference; verify in spike |
| Local tooling | Node 20.19, npm 10, Bun 1.1, Docker 29.9 and `gh` (active: khalidsohaibrana) are all available. | Shell checks |
| Global hook error | The broken `${CLAUDE_PLUGIN_ROOT}` SessionStart hook in `~/.claude/settings.json` fires in every headless run too, adding an error event each time. Fix before the demo. | Probe `hook_response` with `exit_code: 1` |

**Verdict: feasible.** Two human actions unblock it: log in, and fix the global hook. One spike confirms the subagent event detail before any UI work.

**Rejected alternative:** Claude Agent SDK as the runtime. It's cleaner to code against, but it needs an API key and per-token billing, and it would duplicate the agents, hooks and settings the CLI already loads.

---

## 2. Architecture

```
Browser  http://localhost:4000
  Chat | Agent tree | Timeline | Delivery board | Usage
        ▲ Server-Sent Events          │ POST /api/message
        │                             ▼
Dashboard server (Node, node:http, zero dependencies)
  ├─ SupervisorProcess: spawns
  │    claude --agent supervisor -p --input-format stream-json
  │      --output-format stream-json --verbose
  │      --include-hook-events --forward-subagent-text
  │      --allowedTools <allowlist>  [--resume <id>]
  ├─ EventNormalizer: raw stream → normalized events, builds the agent tree
  ├─ RunStore: appends every event to runs/<session_id>.jsonl (replay)
  └─ BoardPoller (every 30 s): status.md + `gh pr list` + PR verdict comments
```

**Normalized event:**
`{ ts, sessionId, agentId, parentId, agentType, kind, summary, raw }`
- `agentId` is `"supervisor"`, or the `tool_use_id` of the `Agent` call that started the subagent.
- `kind` is one of `message`, `tool_call`, `tool_result`, `agent_start`, `agent_end`, `hook`, `question`, `result`.

**Agent tree rules:**
- An `Agent` tool_use creates a node with `subagent_type`, `description` and the brief.
- Messages whose `parent_tool_use_id` is that id belong to that node.
- The matching `tool_result` marks the node done, or failed if `is_error`.
- Result events carry `total_cost_usd` and `usage`, which feed the usage strip.

**Location:** `agent-system/dashboard/`, project-neutral, consistent with the extraction rule. It is configured by `--project <path>` and reads `.claude/agent-system.json` for the profile and status paths.

**UI:** plain HTML, CSS and ES modules with no build step and no framework. This keeps it extractable, dependency-free and quick to change before a talk.

---

## 3. Dashboard panels

1. **Chat:** you ↔ supervisor. The supervisor's STATUS blocks render as cards. Questions to you show as a pinned "Waiting on you" card.
2. **Agent tree:** the supervisor with its dispatched agents as children. Each child shows its role, a running/done/failed badge, elapsed time, and the brief in an expander.
3. **Timeline:** one lane per agent, showing tool calls (Read, Bash, Edit, `gh pr create`…), colour-coded by agent. Hook blocks such as a guard-hook denial show in red, which is good demo material.
4. **Delivery board:** columns Ready → Building → Review → Security → QA → Awaiting human → Done. Built from PRs and their `REVIEW:` / `SECURITY:` / `QA:` first-line comments, plus the current gate from `status.md`.
5. **Usage strip:** cost and tokens per agent and per run.
6. **Replay:** choose a saved run and play it at 1×, 4× or 16× speed. This is the fallback if the live demo stalls.

---

## 4. Simplifications for the demo

- **Separate demo project.** ProofDesk is in Phase 0, where no feature code is allowed before G0, so a live "build a feature" demo can't run there. Instead, `agent-system/dashboard/scripts/create-demo-project.sh` creates a throwaway repo, for example `~/proofdesk-agent-demo`, with a tiny Node app. The script runs `agent-system/install.sh` and seeds one Ready ticket. This also shows that the system can be extracted to another project.
- **Demo ticket:** "Add a `/health` endpoint that returns `{status:"ok", version}`, with a unit test." Expected flow: supervisor → builder (worktree, PR) → reviewer → QA → waiting for your approval. Target time is 10–15 minutes.
- **Visible agents:** supervisor, builder, reviewer and QA. The security reviewer joins only if the ticket touches auth. The discovery agents stay available but aren't part of the demo.
- **Model mix for speed:** supervisor sonnet, builder sonnet, reviewer and QA haiku in demo mode. This is passed per dispatch through the brief and set in demo operating defaults.
- **Noise:** the dashboard shows only agents that were actually dispatched, so the ECC agents never appear.

---

## 5. Implementation plan

| Step | Work | Done when | Size |
|---|---|---|---|
| **H0** (human) | Run `claude auth login` with your subscription. Remove the broken `${CLAUDE_PLUGIN_ROOT}` SessionStart entry from `~/.claude/settings.json`. | `claude auth status` shows `loggedIn: true`, and a probe has no hook error | 5 min |
| **S1** Spike | Script `scripts/probe.mjs` runs the supervisor headless, dispatches one subagent, and saves the raw JSONL. Confirm: subagent messages carry `parent_tool_use_id`; tool calls inside subagents are visible; background or worktree agents report completion; how plain-text questions appear. | Fixture `fixtures/probe-*.jsonl` committed plus a findings note. **Go/no-go for the UI.** | 0.5 day |
| **S2** Server core | `server.mjs`: SupervisorProcess (spawn, stdin writer, restart with `--resume`), EventNormalizer with unit tests against the S1 fixtures, RunStore, SSE `/api/events`, `POST /api/message`. | `node --test` passes; curl shows a live event stream | 1 day |
| **S3** UI | `public/`: chat, agent tree, timeline, usage strip, with design tokens, keyboard-accessible, desktop-first layout plus a 768 px layout. | A real run renders correctly; screenshots at 1024 and 1440 | 1–1.5 days |
| **S4** Board | BoardPoller: `gh pr list --json`, verdict-comment parsing, `status.md` gate. | A PR with verdict comments appears in the right column | 0.5 day |
| **S5** Demo kit | `create-demo-project.sh`, demo ticket, demo model mix, replay controls, a `README` with a demo script and timings. | A full demo run end to end in ≤ 15 min, recorded as a replay | 0.5–1 day |
| **S6** Stretch | An "Approve" button for permission requests via `--permission-prompt-tool`, only if S1 confirms it works. Otherwise the allowlist stays. | Only if verified | optional |

**Total:** about 4–5 working days. S1 is the only risky step, and every later step depends on it.

**How we build it:** the dashboard is tooling in `agent-system/`, so each step is one PR to `main`, opened by me in this session or by a builder. Changes to `agent-system/**` need your approval to merge, per the self-governance rule. You merge.

### Allowlist for headless supervisor runs (draft)
`Agent, Read, Glob, Grep, Write, Edit, Bash(git *), Bash(gh pr *), Bash(gh issue *), Bash(npm test*), Bash(npm run *), Bash(node *)`. The existing deny list and guard hook still apply on top.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Subagent detail is thinner than expected, e.g. no tool calls from inside subagents | S1 checks this first. Fallback: project hooks (`PreToolUse`/`PostToolUse`/`SubagentStop`) POST to the server, since hook input includes `session_id` and the agent transcript path. |
| Headless runs hit a permission it can't ask about | Allowlist above. The run surfaces the denial as a red timeline event, and the supervisor reports it. |
| Live demo is slow or stalls on stage | Demo model mix, a small ticket, and recorded replay as a fallback |
| CLI stream format changes in a future version | Normalizer tested against committed fixtures; pin the CLI version used for the demo in the README |
| Subscription rate limits during a long run | Demo mode uses sonnet and haiku; the usage strip makes consumption visible |

## 7. Decisions for the human
1. Approve this plan and the `agent-system/dashboard/` location.
2. Approve a separate throwaway demo project, instead of demoing inside ProofDesk Phase 0.
3. Approve the demo model mix (sonnet + haiku).
