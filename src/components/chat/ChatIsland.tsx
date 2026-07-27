import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

export function ChatIsland({
  title,
  messages,
  onSend,
}: {
  title: string;
  messages: ChatMessage[];
  onSend?: (content: string) => void;
}) {
  const { islandOpen, setIslandOpen } = useAppStore();
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend?.(draft);
    setDraft("");
  };

  return (
    <div className="absolute bottom-4 left-4 z-10">
      {!islandOpen && (
        <button
          onClick={() => setIslandOpen(true)}
          aria-label="Open chat"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="size-[18px]" />
        </button>
      )}

      {islandOpen && (
        <div className="flex w-[min(280px,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-surface-2 p-3 shadow-lg">
          <div className="mb-2 flex items-center">
            <span className="flex-1 text-[12.5px] font-medium">{title}</span>
            <button
              onClick={() => setIslandOpen(false)}
              aria-label="Close chat"
              className="flex size-5.5 items-center justify-center rounded text-text-secondary hover:bg-surface-3"
            >
              <X className="size-[15px]" />
            </button>
          </div>
          <div className="mb-2 flex max-h-[180px] flex-col gap-2 overflow-y-auto no-scrollbar">
            {messages.length === 0 && (
              <p className="text-[12px] text-text-muted">No messages yet.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[88%] rounded-md px-2.5 py-1.5 text-[12.5px]",
                  m.role === "user"
                    ? "self-end bg-bg-accent text-text-accent"
                    : "bg-surface-1 text-text-primary"
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Send a message"
            className="h-8 rounded-md border border-border bg-surface-1 px-2.5 text-[12.5px] outline-none placeholder:text-text-muted focus:border-border-accent"
          />
        </div>
      )}
    </div>
  );
}
