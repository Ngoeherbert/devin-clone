import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, MessageCircle, ArrowRight, FolderGit2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { api, ApiError } from "@/lib/api";
import { chatPath } from "@/lib/routes";
import type { ChatSession } from "@/types";
import { Button } from "@/components/ui/button";

export function ChatsView() {
  const { chatMode, setChatMode, addChat } = useAppStore();
  const [task, setTask] = useState("");
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!task.trim()) {
      toast.error("Describe a task before starting.");
      return;
    }
    setLoading(true);
    try {
      const chat = await api.post<ChatSession>("/api/chats", {
        title: task,
        type: chatMode === "agent" ? "agent" : "chat",
      });
      if (chatMode === "chat") {
        await api.post(`/api/chats/${chat.id}/messages`, { role: "user", content: task });
      } else if (repo.trim()) {
        // Pre-create the run with a repo so the agent workspace clones and
        // pushes to it (real PR) instead of falling back to a scratch workspace.
        await api.post(`/api/chats/${chat.id}/agent-runs`, { repo: repo.trim() });
      }
      addChat(chat);
      setTask("");
      navigate(chatPath(chat));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start that task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <h1 className="mb-1.5 text-[22px] font-medium">What should Omni work on?</h1>
      <p className="mb-5 text-sm text-text-secondary">
        Assign a task and I'll plan, code, test, and open a PR.
      </p>

      <div className="mb-4 inline-flex rounded-md border border-border bg-surface-1 p-0.5">
        <button
          onClick={() => setChatMode("agent")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3.5 py-1.5 text-[12.5px] transition-colors",
            chatMode === "agent"
              ? "bg-surface-2 text-text-primary"
              : "text-text-secondary"
          )}
        >
          <Bot className="size-3.5" />
          Agent
        </button>
        <button
          onClick={() => setChatMode("chat")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3.5 py-1.5 text-[12.5px] transition-colors",
            chatMode === "chat"
              ? "bg-surface-2 text-text-primary"
              : "text-text-secondary"
          )}
        >
          <MessageCircle className="size-3.5" />
          Chat
        </button>
      </div>

      <div className="w-full max-w-[440px] rounded-md border border-border bg-surface-1 p-3">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder={
            chatMode === "agent"
              ? "Describe a task, paste an issue link, or drop a repo"
              : "Ask anything, or brainstorm an idea"
          }
          className="w-full resize-none bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          {chatMode === "agent" && (
            <span className="flex flex-1 items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1">
              <FolderGit2 className="size-3 shrink-0 text-text-secondary" />
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo (optional)"
                className="w-full bg-transparent text-xs text-text-secondary outline-none placeholder:text-text-muted"
              />
            </span>
          )}
          <Button size="sm" className="ml-auto shrink-0" onClick={handleStart} disabled={loading}>
            {loading ? "Starting…" : "Start"}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
      {chatMode === "agent" && (
        <p className="mt-2.5 max-w-[440px] text-[11.5px] text-text-muted">
          Leave the repo blank to let the agent work in a throwaway scratch workspace — no push,
          no PR. Fill it in (and set GITHUB_TOKEN on the server) for a real branch + pull request.
        </p>
      )}
    </div>
  );
}
