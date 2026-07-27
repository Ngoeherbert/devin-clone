import { mkdtemp, rm, readdir, stat, readFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const DIFF_CHAR_LIMIT = 20_000;

export async function createWorkspace(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "devin-agent-"));
  await execFileAsync("git", ["init", "-q"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "agent@local"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Devin Agent"], { cwd: dir });
  // Empty initial commit so there's a baseline for `git diff` to compare against.
  await execFileAsync("git", ["commit", "--allow-empty", "-q", "-m", "init"], { cwd: dir });
  return dir;
}

export async function diffWorkspace(
  dir: string
): Promise<{ diff: string; filesChanged: number }> {
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  const { stdout: stat } = await execFileAsync("git", ["diff", "--cached", "--stat"], {
    cwd: dir,
  });
  const { stdout: diff } = await execFileAsync("git", ["diff", "--cached"], { cwd: dir });
  const filesChanged = stat.split("\n").filter((line) => line.includes("|")).length;
  return { diff: diff.slice(0, DIFF_CHAR_LIMIT), filesChanged };
}

export async function cleanupWorkspace(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  content?: string; // omitted for binary/oversized files
  truncated?: boolean;
}

const IGNORED = new Set([".git", "node_modules", "dist", "build", ".next"]);
const MAX_FILE_BYTES = 50_000;
const MAX_TOTAL_FILES = 300;

/** Walks the workspace into a tree the IDE tab can render, skipping .git/node_modules/etc. */
export async function captureFileTree(dir: string): Promise<FileNode[]> {
  let fileCount = 0;

  async function walk(currentDir: string, relPath: string): Promise<FileNode[]> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (IGNORED.has(entry.name) || fileCount >= MAX_TOTAL_FILES) continue;
      const entryPath = path.join(currentDir, entry.name);
      const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const children = await walk(entryPath, entryRelPath);
        if (children.length > 0) {
          nodes.push({ name: entry.name, path: entryRelPath, type: "dir", children });
        }
      } else {
        fileCount += 1;
        const stats = await stat(entryPath);
        let content: string | undefined;
        let truncated = false;
        if (stats.size <= MAX_FILE_BYTES) {
          try {
            content = await readFile(entryPath, "utf8");
          } catch {
            content = undefined; // likely binary
          }
        } else {
          truncated = true;
        }
        nodes.push({ name: entry.name, path: entryRelPath, type: "file", content, truncated });
      }
    }

    return nodes;
  }

  return walk(dir, "");
}
