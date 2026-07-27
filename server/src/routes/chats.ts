import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatSession, message, canvasSnapshot, agentRun } from "../db/schema.js";
import { attachSession, requireAuth } from "../middleware/session.js";
import { getOwnedChat } from "../lib/owned-chat.js";
import { runAgentTask } from "../agent/orchestrator.js";
import { generateChatReply } from "../agent/chatReply.js";
import { parseRepo, listPullRequests } from "../agent/github.js";
import { startDesktop, stopDesktop } from "../agent/desktop.js";
import { registerPreview, stopPreview } from "../agent/previewRegistry.js";

export const chatsRouter = Router();

chatsRouter.use(attachSession, requireAuth);

// GET /api/chats — list the signed-in user's chat sessions, most recent first
chatsRouter.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(chatSession)
    .where(eq(chatSession.userId, req.session!.user.id))
    .orderBy(desc(chatSession.updatedAt));

  res.json(rows);
});

// POST /api/chats — create a new chat session
chatsRouter.post("/", async (req, res) => {
  const { title, type } = req.body as { title?: string; type?: string };
  if (!title || !type) {
    return res.status(400).json({ error: "title and type are required" });
  }

  const [row] = await db
    .insert(chatSession)
    .values({
      userId: req.session!.user.id,
      title,
      type: type as "agent" | "canvas" | "design" | "image",
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/chats/:id — fetch one chat session (only if it belongs to the caller)
chatsRouter.get("/:id", async (req, res) => {
  const row = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// GET /api/chats/:id/messages — full message thread for a chat, oldest first
chatsRouter.get("/:id/messages", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select()
    .from(message)
    .where(eq(message.chatSessionId, chat.id))
    .orderBy(asc(message.createdAt));

  res.json(rows);
});

// POST /api/chats/:id/messages — append a message to the thread
chatsRouter.post("/:id/messages", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const { role, content, kind } = req.body as {
    role?: "user" | "assistant";
    content?: string;
    kind?: "text" | "action";
  };
  if (!role || !content) {
    return res.status(400).json({ error: "role and content are required" });
  }

  const [row] = await db
    .insert(message)
    .values({ chatSessionId: chat.id, role, content, kind: kind ?? "text" })
    .returning();

  await db
    .update(chatSession)
    .set({ updatedAt: new Date() })
    .where(eq(chatSession.id, chat.id));

  res.status(201).json(row);
});

// GET /api/chats/:id/canvas — latest canvas/design snapshot (by version) for a chat
chatsRouter.get("/:id/canvas", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const [row] = await db
    .select()
    .from(canvasSnapshot)
    .where(eq(canvasSnapshot.chatSessionId, chat.id))
    .orderBy(desc(canvasSnapshot.version))
    .limit(1);

  res.json(row ?? null);
});

// POST /api/chats/:id/canvas — save a new snapshot version (never overwrites old ones)
chatsRouter.post("/:id/canvas", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const { kind, data } = req.body as { kind?: "canvas" | "design"; data?: unknown };
  if (!kind || data === undefined) {
    return res.status(400).json({ error: "kind and data are required" });
  }

  const [latest] = await db
    .select({ version: canvasSnapshot.version })
    .from(canvasSnapshot)
    .where(eq(canvasSnapshot.chatSessionId, chat.id))
    .orderBy(desc(canvasSnapshot.version))
    .limit(1);

  const [row] = await db
    .insert(canvasSnapshot)
    .values({
      chatSessionId: chat.id,
      kind,
      version: (latest?.version ?? 0) + 1,
      data,
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/chats/:id/agent-runs — every attempt/re-run for an agent task, most recent first
chatsRouter.get("/:id/agent-runs", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select()
    .from(agentRun)
    .where(eq(agentRun.chatSessionId, chat.id))
    .orderBy(desc(agentRun.createdAt));

  res.json(rows);
});

// POST /api/chats/:id/agent-runs — start a new run (e.g. on retry)
chatsRouter.post("/:id/agent-runs", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const { repo } = req.body as { repo?: string };

  const [row] = await db
    .insert(agentRun)
    .values({ chatSessionId: chat.id, repo, status: "queued" })
    .returning();

  res.status(201).json(row);
});

// PATCH /api/chats/:id/agent-runs/:runId — update run status/PR info as it progresses
chatsRouter.patch("/:id/agent-runs/:runId", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const { status, branch, prUrl, filesChanged } = req.body as {
    status?: "queued" | "running" | "success" | "failed";
    branch?: string;
    prUrl?: string;
    filesChanged?: number;
  };

  const [row] = await db
    .update(agentRun)
    .set({
      ...(status && { status }),
      ...(branch !== undefined && { branch }),
      ...(prUrl !== undefined && { prUrl }),
      ...(filesChanged !== undefined && { filesChanged }),
      updatedAt: new Date(),
    })
    .where(and(eq(agentRun.id, req.params.runId), eq(agentRun.chatSessionId, chat.id)))
    .returning();

  if (!row) return res.status(404).json({ error: "Run not found" });
  res.json(row);
});

// POST /api/chats/:id/agent-runs/:runId/execute — actually runs the agent (Gemini + real
// file/shell tools in a scratch workspace), persisting each step as a message and the final
// diff/summary on the run. Synchronous: the response waits for the whole run to finish.
// POST /api/chats/:id/agent-runs/:runId/execute — actually runs the agent, streaming each
// step over Server-Sent Events as it happens (so the Shell tab shows commands live) while also
// persisting every step as a message and the final result on the run.
chatsRouter.post("/:id/agent-runs/:runId/execute", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const [run] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.id, req.params.runId), eq(agentRun.chatSessionId, chat.id)));
  if (!run) return res.status(404).json({ error: "Run not found" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  await db
    .update(agentRun)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(agentRun.id, run.id));
  await db.update(chatSession).set({ status: "running" }).where(eq(chatSession.id, chat.id));

  try {
    const result = await runAgentTask(
      chat.title,
      { repo: run.repo, githubToken: process.env.GITHUB_TOKEN },
      async (step) => {
        const [saved] = await db
          .insert(message)
          .values({
            chatSessionId: chat.id,
            role: "assistant",
            kind: step.type === "text" ? "text" : "action",
            content: step.content,
          })
          .returning();
        send({ type: "step", message: saved });
      }
    );

    const [updatedRun] = await db
      .update(agentRun)
      .set({
        status: "success",
        summary: result.summary,
        diff: result.diff,
        filesChanged: result.filesChanged,
        files: result.files,
        previewUrl: result.previewUrl,
        branch: result.branch ?? run.branch,
        prUrl: result.prUrl ?? run.prUrl,
        updatedAt: new Date(),
      })
      .where(eq(agentRun.id, run.id))
      .returning();

    if (result.previewUrl && result.previewWorkspaceDir) {
      registerPreview(run.id, result.previewWorkspaceDir, result.previewPid);
    }

    const [summaryMessage] = await db
      .insert(message)
      .values({ chatSessionId: chat.id, role: "assistant", kind: "text", content: result.summary })
      .returning();
    send({ type: "step", message: summaryMessage });

    await db.update(chatSession).set({ status: "done" }).where(eq(chatSession.id, chat.id));

    send({ type: "done", run: updatedRun });
    res.end();
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Agent run failed";
    await db
      .update(agentRun)
      .set({ status: "failed", summary: errMessage, updatedAt: new Date() })
      .where(eq(agentRun.id, run.id));
    await db.update(chatSession).set({ status: "error" }).where(eq(chatSession.id, chat.id));
    send({ type: "error", error: errMessage });
    res.end();
  }
});

// GET /api/chats/:id/pull-requests — every PR (open/closed/merged) on the run's repo
chatsRouter.get("/:id/pull-requests", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const repoQuery = typeof req.query.repo === "string" ? req.query.repo : undefined;
  const repoValue =
    repoQuery ??
    (
      await db
        .select({ repo: agentRun.repo })
        .from(agentRun)
        .where(eq(agentRun.chatSessionId, chat.id))
        .orderBy(desc(agentRun.createdAt))
        .limit(1)
    )[0]?.repo;

  if (!repoValue) return res.json([]);
  if (!process.env.GITHUB_TOKEN) {
    return res.status(400).json({ error: "GITHUB_TOKEN is not set on the server" });
  }

  const parsed = parseRepo(repoValue);
  if (!parsed) return res.status(400).json({ error: `Not a valid repo: ${repoValue}` });

  try {
    const prs = await listPullRequests(process.env.GITHUB_TOKEN, parsed);
    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Couldn't list PRs" });
  }
});

// POST /api/chats/:id/agent-runs/:runId/preview/stop — manually tear down a live
// Browser-tab preview (dev server + its scratch workspace) instead of waiting for the TTL.
chatsRouter.post("/:id/agent-runs/:runId/preview/stop", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const [run] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.id, req.params.runId), eq(agentRun.chatSessionId, chat.id)));
  if (!run) return res.status(404).json({ error: "Run not found" });

  await stopPreview(run.id);
  const [updated] = await db
    .update(agentRun)
    .set({ previewUrl: null })
    .where(eq(agentRun.id, run.id))
    .returning();
  res.json(updated);
});

// POST /api/chats/:id/agent-runs/:runId/desktop/start — best-effort Docker/noVNC desktop.
// Requires the `docker` CLI on the server host; see server/README.md for the honest caveats.
chatsRouter.post("/:id/agent-runs/:runId/desktop/start", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const [run] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.id, req.params.runId), eq(agentRun.chatSessionId, chat.id)));
  if (!run) return res.status(404).json({ error: "Run not found" });

  try {
    const session = await startDesktop(run.id);
    const [updated] = await db
      .update(agentRun)
      .set({ desktopUrl: session.url, desktopContainerId: session.containerId })
      .where(eq(agentRun.id, run.id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(501).json({ error: err instanceof Error ? err.message : "Couldn't start desktop" });
  }
});

// POST /api/chats/:id/agent-runs/:runId/desktop/stop
chatsRouter.post("/:id/agent-runs/:runId/desktop/stop", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });

  const [run] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.id, req.params.runId), eq(agentRun.chatSessionId, chat.id)));
  if (!run) return res.status(404).json({ error: "Run not found" });

  if (run.desktopContainerId) {
    await stopDesktop(run.desktopContainerId);
  }

  const [updated] = await db
    .update(agentRun)
    .set({ desktopUrl: null, desktopContainerId: null })
    .where(eq(agentRun.id, run.id))
    .returning();
  res.json(updated);
});

// POST /api/chats/:id/reply — generate a real Gemini assistant reply for a plain "chat"-type
// session, using the existing thread as context, and persist it.
chatsRouter.post("/:id/reply", async (req, res) => {
  const chat = await getOwnedChat(req.params.id, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (chat.type !== "chat") {
    return res.status(400).json({ error: "Replies are only generated for chat-type sessions" });
  }

  const history = await db
    .select()
    .from(message)
    .where(eq(message.chatSessionId, chat.id))
    .orderBy(asc(message.createdAt));

  try {
    const replyText = await generateChatReply(
      history.map((m) => ({ role: m.role, content: m.content }))
    );

    const [row] = await db
      .insert(message)
      .values({ chatSessionId: chat.id, role: "assistant", content: replyText })
      .returning();

    await db
      .update(chatSession)
      .set({ updatedAt: new Date() })
      .where(eq(chatSession.id, chat.id));

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Reply failed" });
  }
});
