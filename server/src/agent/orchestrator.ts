import type { Content, Part } from "@google/genai";
import { getGeminiClient, GEMINI_MODEL } from "./gemini.js";
import { toolDeclarations, runTool, type ToolContext } from "./tools.js";
import {
  createWorkspace,
  diffWorkspace,
  cleanupWorkspace,
  captureFileTree,
  type FileNode,
} from "./workspace.js";
import { parseRepo, cloneRepo, pushBranch, openPullRequest, type ParsedRepo } from "./github.js";

const MAX_STEPS = 8;

const SYSTEM_INSTRUCTION = `You are an autonomous coding agent working alone in a git repository.
You have tools to read/write files, run one-off shell commands, and start long-running dev
servers. Complete the user's task by writing real, working code — don't just describe what you
would do. If the task involves a web app, consider starting it with start_dev_server so it can be
previewed. Call one tool at a time. When the task is genuinely done, call the "finish" tool with a
short summary of what you built.`;

export interface AgentStep {
  type: "tool_call" | "tool_result" | "text";
  content: string;
}

export interface AgentRunOptions {
  /** "owner/repo" or a GitHub URL. Ignored if githubToken isn't also set. */
  repo?: string | null;
  githubToken?: string | null;
}

export interface AgentRunResult {
  summary: string;
  diff: string;
  filesChanged: number;
  files: FileNode[];
  previewUrl?: string;
  previewWorkspaceDir?: string;
  previewPid?: number;
  branch?: string;
  prUrl?: string;
}

export async function runAgentTask(
  task: string,
  options: AgentRunOptions = {},
  onStep?: (step: AgentStep) => void | Promise<void>
): Promise<AgentRunResult> {
  const ai = getGeminiClient();
  const emit = async (step: AgentStep) => {
    await onStep?.(step);
  };
  const ctx: ToolContext = { spawnedProcesses: [] };

  let workspaceDir: string;
  let baseBranch = "main";
  let repoContext: ParsedRepo | null = null;

  if (options.repo && options.githubToken) {
    const parsed = parseRepo(options.repo);
    if (parsed) {
      try {
        await emit({ type: "text", content: `Cloning ${parsed.owner}/${parsed.repo}…` });
        const cloned = await cloneRepo(parsed, options.githubToken);
        workspaceDir = cloned.dir;
        baseBranch = cloned.baseBranch;
        repoContext = parsed;
      } catch (err) {
        await emit({
          type: "text",
          content: `Couldn't clone ${options.repo} (${(err as Error).message}) — working in a scratch workspace instead.`,
        });
        workspaceDir = await createWorkspace();
      }
    } else {
      workspaceDir = await createWorkspace();
    }
  } else {
    workspaceDir = await createWorkspace();
  }

  try {
    const contents: Content[] = [{ role: "user", parts: [{ text: task }] }];
    let summary = "";

    for (let i = 0; i < MAX_STEPS; i++) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      const calls = response.functionCalls;

      if (!calls || calls.length === 0) {
        const text = response.text ?? "";
        if (text) await emit({ type: "text", content: text });
        contents.push({ role: "model", parts: [{ text: text || "(no response)" }] });
        contents.push({
          role: "user",
          parts: [{ text: "Continue the task, or call finish if you're done." }],
        });
        continue;
      }

      contents.push({
        role: "model",
        parts: calls.map((call): Part => ({ functionCall: call })),
      });

      const responseParts: Part[] = [];
      let finished = false;

      for (const call of calls) {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, unknown>;
        await emit({ type: "tool_call", content: `${name}(${JSON.stringify(args)})` });

        if (name === "finish") {
          summary = String(args.summary ?? "Task complete.");
          finished = true;
          responseParts.push({ functionResponse: { name, response: { output: "acknowledged" } } });
          continue;
        }

        const output = await runTool(workspaceDir, name, args, ctx);
        await emit({ type: "tool_result", content: output });
        responseParts.push({ functionResponse: { name, response: { output } } });
      }

      contents.push({ role: "user", parts: responseParts });

      if (finished) break;
    }

    if (!summary) {
      summary = "Reached the step limit before the agent called finish.";
    }

    // Diff + file tree BEFORE any branch/commit — stages changes against the current
    // HEAD (the base branch tip for a cloned repo, or the empty init commit for scratch).
    const { diff, filesChanged } = await diffWorkspace(workspaceDir);
    const files = await captureFileTree(workspaceDir);

    let branch: string | undefined;
    let prUrl: string | undefined;

    if (repoContext && options.githubToken && filesChanged > 0) {
      branch = `devin-agent/${Date.now()}`;
      try {
        const pushed = await pushBranch(
          workspaceDir,
          repoContext,
          options.githubToken,
          branch,
          `Agent: ${summary.slice(0, 72)}`
        );
        if (pushed) {
          await emit({ type: "text", content: `Pushed branch ${branch}, opening a PR…` });
          try {
            prUrl = await openPullRequest({
              token: options.githubToken,
              repo: repoContext,
              head: branch,
              base: baseBranch,
              title: task,
              body: summary,
            });
            await emit({ type: "text", content: `Opened PR: ${prUrl}` });
          } catch (err) {
            summary += `\n\nPushed branch ${branch}, but opening the PR failed: ${(err as Error).message}`;
          }
        } else {
          branch = undefined;
        }
      } catch (err) {
        summary += `\n\nCouldn't push to ${repoContext.owner}/${repoContext.repo}: ${(err as Error).message}`;
        branch = undefined;
      }
    }

    return {
      summary,
      diff,
      filesChanged,
      files,
      previewUrl: ctx.previewUrl,
      previewWorkspaceDir: ctx.previewUrl ? workspaceDir : undefined,
      previewPid: ctx.previewUrl ? ctx.spawnedProcesses.at(-1)?.pid : undefined,
      branch,
      prUrl,
    };
  } finally {
    if (ctx.previewUrl) {
      // A dev server is still running and serving from this workspace for the
      // Browser tab preview — leave both alive. The route handler registers this
      // with the preview reaper so it's cleaned up automatically after a TTL
      // instead of accumulating forever (see agent/previewRegistry.ts).
      await emit({
        type: "text",
        content: `Leaving the dev server running for preview at ${ctx.previewUrl}. It'll be cleaned up automatically after 30 minutes of inactivity.`,
      });
    } else {
      for (const proc of ctx.spawnedProcesses) {
        try {
          if (proc.pid) process.kill(-proc.pid, "SIGKILL");
        } catch {
          // already exited
        }
      }
      await cleanupWorkspace(workspaceDir);
    }
  }
}
