import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import type { ChatMessage, ChatSession } from "@/types";
import { TypingText } from "@/components/chat/TypingText";

export function ChatWorkspace() {
  const { chatId } = useParams();
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<ChatSession>(`/api/chats/${chatId}`),
      api.get<ChatMessage[]>(`/api/chats/${chatId}/messages`),
    ])
      .then(async ([chatRow, messageRows]) => {
        if (cancelled) return;
        setChat(chatRow);
        setMessages(messageRows);
        // Freshly created chat: one user message, no reply yet — kick it off.
        if (messageRows.length === 1 && messageRows[0].role === "user") {
          setSending(true);
          const reply = await api.post<ChatMessage>(`/api/chats/${chatId}/reply`);
          if (!cancelled) {
            setMessages((m) => [...m, reply]);
            setAnimatingIds((s) => new Set(s).add(reply.id));
          }
          setSending(false);
        }
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load this chat.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const handleSend = async () => {
    if (!draft.trim() || !chatId || sending) return;
    setSending(true);
    const content = draft;
    setDraft("");
    try {
      const sent = await api.post<ChatMessage>(`/api/chats/${chatId}/messages`, {
        role: "user",
        content,
      });
      setMessages((m) => [...m, sent]);
      const reply = await api.post<ChatMessage>(`/api/chats/${chatId}/reply`);
      setMessages((m) => [...m, reply]);
      setAnimatingIds((s) => new Set(s).add(reply.id));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't reach the assistant — is GEMINI_API_KEY set?"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border px-3.5 py-2.5 text-[12.5px] text-text-secondary">
        {chat?.title ?? (loading ? "Loading…" : "Chat")}
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">
        {!loading && messages.length === 0 && (
          <p className="text-center text-[13px] text-text-muted">
            Say something to start the conversation.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[88%] whitespace-pre-wrap rounded-lg px-3.5 py-2 text-[13.5px] leading-relaxed sm:max-w-[80%]",
              m.role === "user"
                ? "self-end bg-bg-accent text-text-accent"
                : "self-start bg-surface-1 text-text-primary"
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
        {sending && (
          <div className="flex items-center gap-1 self-start rounded-lg bg-surface-1 px-3.5 py-2.5">
            <span className="size-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-text-muted" />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl px-3 pb-4 sm:px-4 sm:pb-5">
        <div className="flex gap-2 rounded-md border border-border bg-surface-1 p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message the assistant"
            disabled={sending}
            className="h-8 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-text-muted"
          />
        </div>
      </div>
    </div>
  );
}
