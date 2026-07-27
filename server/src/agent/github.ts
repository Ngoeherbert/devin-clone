import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { Octokit } from "@octokit/rest";

const execFileAsync = promisify(execFile);

export interface ParsedRepo {
  owner: string;
  repo: string;
}

/** Accepts "owner/repo" or a full GitHub URL. Returns null if it doesn't look like a repo. */
export function parseRepo(input: string): ParsedRepo | null {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, "");
  const match = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function authedCloneUrl(owner: string, repo: string, token: string): string {
  return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
}

/** Shallow-clones the repo into a fresh temp dir and returns { dir, baseBranch }. */
export async function cloneRepo(
  parsed: ParsedRepo,
  token: string
): Promise<{ dir: string; baseBranch: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "devin-agent-repo-"));
  await execFileAsync(
    "git",
    ["clone", "--depth", "1", authedCloneUrl(parsed.owner, parsed.repo, token), dir],
    { timeout: 30_000 }
  );
  await execFileAsync("git", ["config", "user.email", "agent@local"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Devin Agent"], { cwd: dir });
  const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: dir,
  });
  return { dir, baseBranch: stdout.trim() };
}

/**
 * Commits whatever's currently staged onto a new branch and pushes it.
 * Returns false (no-op) if there's nothing staged to commit.
 */
export async function pushBranch(
  dir: string,
  parsed: ParsedRepo,
  token: string,
  branch: string,
  commitMessage: string
): Promise<boolean> {
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], { cwd: dir });
  if (!status.trim()) return false;

  await execFileAsync("git", ["checkout", "-b", branch], { cwd: dir });
  await execFileAsync("git", ["commit", "-q", "-m", commitMessage], { cwd: dir });
  await execFileAsync("git", ["push", authedCloneUrl(parsed.owner, parsed.repo, token), branch], {
    cwd: dir,
    timeout: 30_000,
  });
  return true;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  url: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listPullRequests(
  token: string,
  repo: ParsedRepo
): Promise<PullRequestSummary[]> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.list({
    owner: repo.owner,
    repo: repo.repo,
    state: "all",
    per_page: 30,
    sort: "updated",
    direction: "desc",
  });

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state as "open" | "closed",
    merged: Boolean(pr.merged_at),
    url: pr.html_url,
    author: pr.user?.login ?? null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  }));
}

export async function openPullRequest(opts: {
  token: string;
  repo: ParsedRepo;
  head: string;
  base: string;
  title: string;
  body: string;
}): Promise<string> {
  const octokit = new Octokit({ auth: opts.token });
  const { data } = await octokit.pulls.create({
    owner: opts.repo.owner,
    repo: opts.repo.repo,
    head: opts.head,
    base: opts.base,
    title: opts.title.slice(0, 120),
    body: opts.body,
  });
  return data.html_url;
}
