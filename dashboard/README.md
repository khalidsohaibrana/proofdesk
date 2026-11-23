# Agent dashboard

On your computer, install Node.js 20 or newer and Codex CLI, then run `codex login`. From the ProofDesk repository root run `npm --prefix dashboard start` and open `http://127.0.0.1:4173` in your browser. The server binds to loopback and uses Node.js built-ins, so no npm dependency installation is needed. On Windows, use WSL for the Git worktree workflow.

The dashboard provides a supervisor conversation, a local ticket queue, and up to five concurrent builder runs. Each builder gets its own Git worktree and branch in a `.proofdesk-worktrees` directory beside the repository. The board persists in `dashboard/data/state.json`, which is ignored by Git. Codex CLI must be installed and authenticated. The server creates a writable Codex state directory and links existing local CLI authentication when present. Network access to the Codex model service is also required.

The supervisor reads the repository's existing rules and runs with Codex's read-only sandbox. A builder reads the builder instructions and runs with workspace-write sandbox in its worktree. Builder completion moves a ticket to review; it does not constitute an approved PR. Review, QA evidence, and merge gates still require the repository's documented process.

The dashboard currently records builder output after the process exits. It does not create GitHub issues or PRs, run reviewer or QA sessions, or verify a feature recording automatically. Use the existing PR and QA templates for those steps.
