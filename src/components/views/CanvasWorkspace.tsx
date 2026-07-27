import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { api, ApiError } from "@/lib/api";
import type { ChatMessage, ChatSession } from "@/types";
import { ChatIsland } from "@/components/chat/ChatIsland";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { DesignEditor } from "@/components/canvas/DesignEditor";

export function CanvasWorkspace({ kind }: { kind: "canvas" | "design" }) {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const setIslandOpen = useAppStore((s) => s.setIslandOpen);
  const isDesign = kind === "design";

  const [chat, setChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setIslandOpen(false);
    if (!chatId) {
      setChat(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.get<ChatSession>(`/api/chats/${chatId}`),
      api.get<ChatMessage[]>(`/api/chats/${chatId}/messages`),
    ])
      .then(([chatRow, messageRows]) => {
        if (cancelled) return;
        setChat(chatRow);
        setMessages(messageRows);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load this chat.");
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, kind, setIslandOpen]);

  const handleSend = async (content: string) => {
    if (!chatId) return;
    try {
      const sent = await api.post<ChatMessage>(`/api/chats/${chatId}/messages`, {
        role: "user",
        content,
      });
      setMessages((m) => [...m, sent]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send that message.");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3.5 py-2.5">
        <button
          onClick={() => navigate("/chats")}
          className="flex items-center gap-1.5 text-[12.5px] text-text-primary hover:text-text-accent"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
        <span className="truncate text-[12.5px] text-text-secondary">
          {chat?.title ?? (isDesign ? "New design" : "New canvas")}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden bg-surface-0">
        {chatId ? (
          isDesign ? (
            <DesignEditor chatId={chatId} />
          ) : (
            <CanvasEditor chatId={chatId} />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            Start a canvas or design chat from the welcome screen to begin.
          </div>
        )}
        <ChatIsland
          title={isDesign ? "Design chat" : "Canvas chat"}
          messages={messages}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
