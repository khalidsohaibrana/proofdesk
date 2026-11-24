// Delivery board: GitHub issues + PRs + verdict comments, and the gate from the status file.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const GH_TIMEOUT_MS = 20_000;
const VERDICT = /^(REVIEW|SECURITY|QA):\s*([A-Z][A-Z ]*[A-Z])/;

function gh(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile('gh', args, { cwd, timeout: GH_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || error.message).trim().slice(0, 300)));
      else resolve(JSON.parse(stdout || '[]'));
    });
  });
}

/** Latest verdict per kind, read from the first line of PR comments. */
export function verdictsFrom(comments = []) {
  const latest = {};
  for (const comment of comments) {
    const match = VERDICT.exec(String(comment.body ?? '').trim().split('\n')[0]);
    if (match) latest[match[1].toLowerCase()] = { result: match[2].trim(), at: comment.createdAt };
  }
  return latest;
}

/** Map a PR and its verdicts to a board stage. */
export function stageFor(pr, verdicts) {
  if (pr.state === 'MERGED') return 'done';
  if (pr.state === 'CLOSED') return 'closed';
  if (pr.isDraft) return 'building';
  if (verdicts.qa?.result === 'PASS') return 'human';
  if (verdicts.review?.result === 'APPROVE' && verdicts.security?.result !== 'FAIL') return 'qa';
  return 'review';
}

/** Current gate line under "## Current gate" in the status file. */
export function gateFrom(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => /^##\s+Current gate/i.test(line));
  if (start < 0) return '';
  const line = lines.slice(start + 1).find((item) => item.trim());
  return (line ?? '').replace(/\*\*/g, '').trim();
}

export async function loadBoard(cwd, statusPath) {
  const [issues, prs, status] = await Promise.allSettled([
    gh(['issue', 'list', '--state', 'open', '--limit', '30', '--json', 'number,title,url,labels'], cwd),
    gh(['pr', 'list', '--state', 'all', '--limit', '30', '--json', 'number,title,url,state,isDraft,headRefName,comments,mergedAt,updatedAt'], cwd),
    readFile(join(cwd, statusPath), 'utf8'),
  ]);
  const errors = [issues, prs].filter((item) => item.status === 'rejected').map((item) => item.reason.message);

  const pulls = prs.status === 'fulfilled'
    ? prs.value.filter((pr) => pr.state !== 'CLOSED').map((pr) => {
      const verdicts = verdictsFrom(pr.comments);
      return { number: pr.number, title: pr.title, url: pr.url, branch: pr.headRefName, updatedAt: pr.updatedAt, verdicts, stage: stageFor(pr, verdicts) };
    })
    : [];
  const tickets = issues.status === 'fulfilled'
    ? issues.value.map((issue) => ({ number: issue.number, title: issue.title, url: issue.url, labels: issue.labels.map((label) => label.name), stage: 'ready' }))
    : [];

  return {
    gate: status.status === 'fulfilled' ? gateFrom(status.value) : '',
    tickets,
    pulls,
    error: errors[0] ?? null,
    updatedAt: new Date().toISOString(),
  };
}
