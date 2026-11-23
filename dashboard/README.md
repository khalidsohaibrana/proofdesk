# ProofDesk Agent Command

On your computer, install Node.js 20 or newer, Git, and Codex CLI. Run `codex login` once. From the ProofDesk repository root run `npm --prefix dashboard start`, then open `http://127.0.0.1:4173` in a browser on the same computer. On Windows, use WSL for Git worktrees. The server binds to loopback and has no npm dependencies.

The supervisor can answer questions and create ready tickets when asked. The dashboard shows five builder slots, a reviewer, QA, ticket gates, live agent output, and an event history. Dispatching a builder creates an isolated branch and Git worktree in `.proofdesk-worktrees` beside the repository. The branch is based on the dashboard checkout's current HEAD. Keep the dashboard branch aligned with the desired PR base before dispatching builders.

After a builder run, attach its GitHub PR URL to the ticket. The reviewer runs as a separate read-only Codex session and can approve or request changes. A request for changes returns the ticket to the builder. The system limits review to three rounds. Attach a feature recording path or URL before starting QA. QA checks tests and the recording, then records a pass or failure. A QA pass moves the ticket to **Merge ready**. Confirm GitHub checks and approvals before merging in GitHub.

Run output and board state are saved under `dashboard/data/`, which Git ignores. If the dashboard restarts during an agent run, that run becomes interrupted and its ticket becomes blocked. The UI offers a stop control for running agents. The dashboard does not push branches, create PRs, or merge code on its own. The repository's existing delivery rules continue to govern those steps.

Set `PORT` to change the listener port and `DASHBOARD_DATA_PATH` to store board state elsewhere. Keep the server on loopback. It has no user authentication and can launch local Codex processes.
