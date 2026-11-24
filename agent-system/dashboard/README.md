# Agent dashboard

A local web dashboard for the supervised multi-agent system. You chat with the **supervisor** and watch it delegate to subagents (builder, reviewer, security reviewer, QA, discovery agents) live: who is running, what tools each one calls, what they report back, and where each pull request is in the delivery gates.

It runs the real **Claude Code CLI**, so the same agents (`.claude/agents/`), deny list, guard hook and `CLAUDE.md` rules apply as in a terminal session. Nothing is simulated.

## Requirements
- Node.js 20+
- Claude Code CLI, signed in: `claude auth status` should show `"loggedIn": true`. Sign in with `claude auth login --claudeai` to use your Claude subscription rather than API billing.
- `gh` signed in to the repo's GitHub account (for the board).

## Run
From the repository root:

```bash
npm --prefix agent-system/dashboard start
```

Open http://127.0.0.1:4173.

| Setting | How |
|---|---|
| Port | `PORT=4180 npm --prefix agent-system/dashboard start` |
| Project folder | `PROJECT_DIR=/path/to/repo` (default: two levels up, the repo root) |
| Supervisor model | `SUPERVISOR_MODEL=sonnet`, or `"dashboard": {"model": "sonnet"}` in `.claude/agent-system.json` (default: the model in the supervisor agent file) |
| Allowed tools | `"dashboard": {"allowedTools": [...]}` in `.claude/agent-system.json` (defaults are in `lib/session.mjs`) |
| State file | `DASHBOARD_DATA_PATH` (default `data/state.json`, git-ignored) |

## How it works
```
Browser ──SSE──▶ server.mjs ──spawns──▶ claude --agent supervisor -p
   │  POST /api/message                  --input-format stream-json
   │                                     --output-format stream-json
   │                                     --include-hook-events --forward-subagent-text
   ▼                                     --permission-mode acceptEdits --allowedTools …
lib/normalize.mjs  pure reducer: stream events → messages, agent tree, activity, cost
lib/board.mjs      gh issues + PRs + first-line verdict comments (REVIEW:/SECURITY:/QA:) + gate from status.md
```

- **One supervisor process** stays alive across messages; after a restart it resumes the same session (`--resume`).
- **Agents** appear when the supervisor dispatches them (`Agent` tool) and update from `task_started` / `task_progress` / `task_notification` events. Click a card for the brief, the result and its tool calls.
- **Permissions:** headless runs can't show prompts. Tools outside the allow list are refused and show as **BLOCKED** in the activity feed. The project deny list and guard hook still apply. `AskUserQuestion` is disabled, so the supervisor asks in plain text; replies starting with `QUESTION:` are highlighted as *waiting on you*.
- **Stop** ends the supervisor process and every agent it is running. **New session** clears the dashboard and starts a fresh conversation.
- **Cost** is the CLI's estimate at API prices; on a subscription it is not billed per token.

## Safety
The server binds to `127.0.0.1` only, rejects other `Host` headers and cross-site POSTs, and has no login. Never expose the port or tunnel it: anyone who reaches it can direct agents that edit code and run commands in this repository.

## Test
```bash
npm --prefix agent-system/dashboard test
```
The reducer is tested against a recorded, sanitized supervisor session (`test/fixtures/probe-session.jsonl`). `scripts/probe.mjs` records a new one.
