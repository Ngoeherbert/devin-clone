import { useEffect, useState } from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { ChatSession, LibraryItem } from "@/types";
import { ImageGenSkeleton } from "@/components/library/ImageGenSkeleton";
import { Button } from "@/components/ui/button";

// Pollinations.ai: free, no API key, generates an image directly from a URL.
// The browser fetches it directly — no backend involvement, nothing to configure.
function buildImageUrl(prompt: string): string {
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true`;
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image generation failed or timed out."));
    img.src = url;
  });
}

export function LibraryView() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const { chats, addChat, fetchChats } = useAppStore();

  useEffect(() => {
    fetchChats();
    api
      .get<LibraryItem[]>("/api/library")
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load your library.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOrCreateImageChat = async (): Promise<ChatSession> => {
    const existing = chats.find((c) => c.type === "image");
    if (existing) return existing;
    const created = await api.post<ChatSession>("/api/chats", {
      title: "Generated images",
      type: "image",
    });
    addChat(created);
    return created;
  };

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Describe an image first.");
      return;
    }
    setPrompt("");
    setPendingCount((n) => n + 1);
    try {
      const chat = await getOrCreateImageChat();
      const imageUrl = buildImageUrl(text);
      await preloadImage(imageUrl);
      const saved = await api.post<LibraryItem>("/api/library", {
        chatSessionId: chat.id,
        title: text,
        imageUrl,
      });
      setItems((prev) => [saved, ...prev]);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Couldn't generate that image."
      );
    } finally {
      setPendingCount((n) => Math.max(0, n - 1));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <h1 className="mb-1 text-lg font-medium">Library</h1>
      <p className="mb-4 text-sm text-text-secondary">
        Generate images, or browse what you've made before.
      </p>

      <div className="mb-5 flex gap-2 rounded-md border border-border bg-surface-1 p-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="Describe an image to generate…"
          className="h-8 flex-1 bg-transparent px-1.5 text-[13px] outline-none placeholder:text-text-muted"
        />
        <Button size="sm" onClick={handleGenerate} disabled={pendingCount > 0 && !prompt}>
          <Sparkles className="size-3.5" />
          Generate
        </Button>
      </div>

      {(loading || pendingCount > 0) && <ImageGenSkeleton count={loading ? 6 : pendingCount} />}

      {!loading && pendingCount === 0 && items.length === 0 && (
        <p className="text-[13px] text-text-secondary">
          Nothing here yet — describe an image above to generate one.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-surface-1"
            >
              <div className="flex h-24 items-center justify-center bg-bg-accent">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-6 text-text-accent" />
                )}
              </div>
              <div className="truncate p-2.5 text-[12.5px] text-text-primary">{item.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
