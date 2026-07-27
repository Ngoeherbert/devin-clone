import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Code2,
  TerminalSquare,
  Globe,
  GitPullRequest,
  GitCompare,
  MonitorSmartphone,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, streamPost, ApiError, type StreamEvent } from "@/lib/api";
import type { ChatMessage, ChatSession } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileTree, type FileNode } from "@/components/agent/FileTree";
import { DiffAccordion } from "@/components/agent/DiffAccordion";
import { PullRequestList } from "@/components/agent/PullRequestList";
import { DesktopPane } from "@/components/agent/DesktopPane";
import { TypingText } from "@/components/chat/TypingText";

const tabs = [
  { id: "ide", label: "IDE", icon: Code2 },
  { id: "shell", label: "Shell", icon: TerminalSquare },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "desktop", label: "Desktop", icon: MonitorSmartphone },
  { id: "pr", label: "PR", icon: GitPullRequest },
  { id: "diff", label: "Diff", icon: GitCompare },
] as const;

interface AgentRun {
  id: string;
  status: "queued" | "running" | "success" | "failed";
  summary: string | null;
  diff: string | null;
  files: FileNode[] | null;
  previewUrl: string | null;
  desktopUrl: string | null;
  filesChanged: number;
  repo: string | null;
  branch: string | null;
  prUrl: string | null;
}

export function AgentWorkspace() {
  const { chatId } = useParams();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("ide");
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<AgentRun | null>(null);
  const [draft, setDraft] = useState("");
  const [repoDraft, setRepoDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!chatId) return;
    const [chatRow, messageRows, runRows] = await Promise.all([
      api.get<ChatSession>(`/api/chats/${chatId}`),
      api.get<ChatMessage[]>(`/api/chats/${chatId}/messages`),
      api.get<AgentRun[]>(`/api/chats/${chatId}/agent-runs`),
    ]);
    setChat(chatRow);
    setMessages(messageRows);
    setRun(runRows[0] ?? null);
    if (runRows[0]?.repo) setRepoDraft(runRows[0].repo);
    return { chatRow, runRows };
  }, [chatId]);

  const executeRun = useCallback(
    async (runId: string) => {
      if (!chatId) return;
      setRunning(true);
      try {
        await streamPost(`/api/chats/${chatId}/agent-runs/${runId}/execute`, (event: StreamEvent) => {
          if (event.type === "step") {
            const msg = event.message as ChatMessage;
            setMessages((m) => [...m, msg]);
            if (msg.kind === "text") {
              setAnimatingIds((s) => new Set(s).add(msg.id));
            }
          } else if (event.type === "done") {
            const finished = event.run as AgentRun;
            setRun(finished);
            setTab(finished.prUrl ? "pr" : finished.status === "success" ? "diff" : "shell");
          } else if (event.type === "error") {
            toast.error(event.error);
          }
        });
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Couldn't run the agent — is GEMINI_API_KEY set on the server?"
        );
      } finally {
        setRunning(false);
      }
    },
    [chatId]
  );

  const startRun = useCallback(async () => {
    if (!chatId) return;
    setRunning(true);
    try {
      const newRun = await api.post<AgentRun>(`/api/chats/${chatId}/agent-runs`, {
        repo: repoDraft.trim() || undefined,
      });
      setRun(newRun);
      await executeRun(newRun.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start a run.");
      setRunning(false);
    }
  }, [chatId, repoDraft, executeRun]);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    load()
      .then((result) => {
        if (!result) return;
        const latest = result.runRows[0];
        if (latest?.status === "queued") {
          executeRun(latest.id);
        } else if (result.runRows.length === 0 && result.chatRow.status === "idle") {
          startRun();
        }
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load this chat.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleSend = async () => {
    if (!draft.trim() || !chatId) return;
    setSending(true);
    try {
      const sent = await api.post<ChatMessage>(`/api/chats/${chatId}/messages`, {
        role: "user",
        content: draft,
      });
      setMessages((m) => [...m, sent]);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  const statusVariant =
    running || chat?.status === "running"
      ? "success"
      : chat?.status === "error"
      ? "danger"
      : "default";
  const statusLabel = running ? "running" : chat?.status ?? "idle";

  return (
    <div className="flex flex-1 min-w-0 flex-col sm:flex-row">
      <div className="flex max-h-[38vh] w-full shrink-0 flex-col border-b border-border bg-surface-1 p-3 sm:h-auto sm:max-h-none sm:w-[280px] sm:border-b-0 sm:border-r">
        <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
          <span className="flex-1 truncate text-xs text-text-muted">
            {chat?.title ?? (loading ? "Loading…" : "Untitled chat")}
          </span>
          <Button size="iconSm" variant="ghost" onClick={startRun} disabled={running}>
            <Play className="size-3.5" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto no-scrollbar">
          {!loading && messages.length === 0 && (
            <p className="text-[12.5px] text-text-muted">No messages yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[90%] whitespace-pre-wrap break-words rounded-md px-2.5 py-1.5 text-[12.5px]",
                m.role === "user"
                  ? "self-end bg-bg-accent text-text-accent"
                  : m.kind === "action"
                  ? "bg-surface-2 font-mono text-[11.5px] text-text-secondary"
                  : "bg-surface-2 text-text-primary"
              )}
            >
              {animatingIds.has(m.id) ? (
                <TypingText
                  text={m.content}
                  onDone={() =>
                    setAnimatingIds((s) => {
                      const next = new Set(s);
                      next.delete(m.id);
                      return next;
                    })
                  }
                />
              ) : (
                m.content
              )}
            </div>
          ))}
          {running && (
            <div className="max-w-[90%] rounded-md bg-surface-2 px-2.5 py-1.5 text-[12.5px] text-text-secondary">
              Working…
            </div>
          )}
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <input
            value={repoDraft}
            onChange={(e) => setRepoDraft(e.target.value)}
            placeholder="owner/repo for next run (optional)"
            disabled={running}
            className="h-7 rounded-md border border-border bg-surface-1 px-2.5 text-[11.5px] outline-none placeholder:text-text-muted focus:border-border-accent"
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Send a message"
            disabled={sending}
            className="h-8 rounded-md border border-border bg-surface-1 px-2.5 text-[12.5px] outline-none placeholder:text-text-muted focus:border-border-accent"
          />
        </div>
      </div>

      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex items-center gap-4 overflow-x-auto border-b border-border px-3.5 py-2 no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 pb-1.5 text-[12.5px] transition-colors",
                  active
                    ? "border-border-accent text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                <Icon className="size-[13px]" />
                {t.label}
              </button>
            );
          })}
          <Badge variant={statusVariant} className="ml-auto">
            {statusLabel}
          </Badge>
        </div>

        <div className="flex-1 overflow-auto text-[12px] leading-relaxed">
          {tab === "ide" && (
            <div className="h-full">
              <FileTree files={run?.files ?? []} />
            </div>
          )}

          {tab === "shell" && (
            <div className="flex flex-col gap-1.5 p-3.5 font-mono">
              {messages.filter((m) => m.kind === "action").length === 0 && (
                <p className="text-text-secondary">No shell output yet.</p>
              )}
              {messages
                .filter((m) => m.kind === "action")
                .map((m) => (
                  <div key={m.id} className="whitespace-pre-wrap text-text-secondary">
                    $ {m.content}
                  </div>
                ))}
              {running && <div className="animate-pulse text-text-muted">running…</div>}
            </div>
          )}

          {tab === "browser" &&
            (run?.previewUrl ? (
              <iframe
                src={run.previewUrl}
                title="App preview"
                className="h-full w-full border-0"
              />
            ) : (
              <p className="p-3.5 text-text-secondary">
                No preview yet — the agent needs to call{" "}
                <code className="font-mono">start_dev_server</code> on something that prints a
                localhost URL for this tab to show a live preview.
              </p>
            ))}

          {tab === "desktop" && chatId && (
            <DesktopPane
              chatId={chatId}
              runId={run?.id ?? null}
              desktopUrl={run?.desktopUrl ?? null}
              onChange={(url) => setRun((r) => (r ? { ...r, desktopUrl: url } : r))}
            />
          )}

          {tab === "pr" && chatId && (
            <div className="p-3.5">
              <PullRequestList chatId={chatId} />
            </div>
          )}

          {tab === "diff" && (
            <div className="p-3.5 font-mono">
              <DiffAccordion diff={run?.diff ?? ""} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-3.5 py-2">
          <span className="text-xs text-text-secondary">
            {run
              ? `${run.filesChanged} file(s) changed${run.branch ? ` · ${run.branch}` : ""}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
