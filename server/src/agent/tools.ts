import { promises as fs } from "fs";
import path from "path";
import { execFile, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import type { FunctionDeclaration } from "@google/genai";

const execFileAsync = promisify(execFile);
const OUTPUT_CHAR_LIMIT = 4_000;
const COMMAND_TIMEOUT_MS = 20_000;
const SERVER_DETECT_TIMEOUT_MS = 6_000;

/** Shared per-run state so tools can report a detected dev-server URL and get cleaned up. */
export interface ToolContext {
  spawnedProcesses: ChildProcess[];
  previewUrl?: string;
}

function resolveInWorkspace(workspaceDir: string, relPath: string): string {
  const resolved = path.resolve(workspaceDir, relPath);
  if (!resolved.startsWith(path.resolve(workspaceDir) + path.sep) && resolved !== workspaceDir) {
    throw new Error(`Path escapes the workspace: ${relPath}`);
  }
  return resolved;
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "write_file",
    description: "Create a file or overwrite its full contents.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path, e.g. src/index.js" },
        content: { type: "string", description: "Full file contents" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "read_file",
    description: "Read the full contents of a file in the workspace.",
    parametersJsonSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description: "List every tracked file in the workspace.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "run_command",
    description:
      "Run a shell command inside the workspace and wait for it to finish (e.g. 'npm init -y', 'npm test'). 20s timeout — do NOT use this for long-running servers, use start_dev_server instead.",
    parametersJsonSchema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "start_dev_server",
    description:
      "Start a long-running dev/preview server in the background (e.g. 'npm run dev', 'python -m http.server 3000'). Returns once a URL is detected in its output, or after a few seconds. Use this instead of run_command for anything that doesn't exit on its own.",
    parametersJsonSchema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "finish",
    description: "Call this once the task is complete, with a short summary of what you built.",
    parametersJsonSchema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
];

export async function runTool(
  workspaceDir: string,
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (name) {
      case "write_file": {
        const filePath = resolveInWorkspace(workspaceDir, String(args.path));
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, String(args.content ?? ""), "utf8");
        return `Wrote ${args.path}`;
      }
      case "read_file": {
        const filePath = resolveInWorkspace(workspaceDir, String(args.path));
        const content = await fs.readFile(filePath, "utf8");
        return content.slice(0, OUTPUT_CHAR_LIMIT);
      }
      case "list_files": {
        const { stdout } = await execFileAsync(
          "git",
          ["ls-files", "--others", "--cached", "--exclude-standard"],
          { cwd: workspaceDir }
        );
        return stdout.trim() || "(empty workspace)";
      }
      case "run_command": {
        const { stdout, stderr } = await execFileAsync("bash", ["-lc", String(args.command)], {
          cwd: workspaceDir,
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: 1024 * 1024,
        });
        return `${stdout}${stderr}`.slice(0, OUTPUT_CHAR_LIMIT) || "(no output)";
      }
      case "start_dev_server": {
        return await startDevServer(workspaceDir, String(args.command), ctx);
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return `Error: ${e.stderr || e.stdout || e.message}`.slice(0, OUTPUT_CHAR_LIMIT);
  }
}

const URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[:\d]*\S*/i;
const PORT_PATTERN = /(?:port|listening on|running at)\D{0,10}(\d{2,5})/i;

function startDevServer(workspaceDir: string, command: string, ctx: ToolContext): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: workspaceDir,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    ctx.spawnedProcesses.push(child);

    let output = "";
    let settled = false;
    const finish = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(message);
    };

    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const urlMatch = output.match(URL_PATTERN);
      if (urlMatch) {
        ctx.previewUrl = urlMatch[0].replace(/0\.0\.0\.0/, "localhost");
        finish(`Server started: ${ctx.previewUrl}`);
        return;
      }
      const portMatch = output.match(PORT_PATTERN);
      if (portMatch) {
        ctx.previewUrl = `http://localhost:${portMatch[1]}`;
        finish(`Server started, guessed URL from output: ${ctx.previewUrl}`);
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => finish(`Failed to start: ${err.message}`));
    child.on("exit", (code) => {
      if (!settled) finish(`Process exited early (code ${code}): ${output.slice(-500)}`);
    });

    const timer = setTimeout(() => {
      finish(
        ctx.previewUrl
          ? `Server started: ${ctx.previewUrl}`
          : `Started "${command}" but couldn't detect a URL from its output yet. Output so far: ${output.slice(-500) || "(none)"}`
      );
    }, SERVER_DETECT_TIMEOUT_MS);
  });
}
