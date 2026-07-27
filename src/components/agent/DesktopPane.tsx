import { useState } from "react";
import { MonitorSmartphone, Square } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface DesktopState {
  desktopUrl: string | null;
}

export function DesktopPane({
  chatId,
  runId,
  desktopUrl,
  onChange,
}: {
  chatId: string;
  runId: string | null;
  desktopUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const run = await api.post<DesktopState>(
        `/api/chats/${chatId}/agent-runs/${runId}/desktop/start`
      );
      onChange(run.desktopUrl);
      if (!run.desktopUrl) toast.error("Desktop didn't return a URL.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't start the desktop — Docker may not be available on the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      await api.post(`/api/chats/${chatId}/agent-runs/${runId}/desktop/stop`);
      onChange(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't stop the desktop.");
    } finally {
      setLoading(false);
    }
  };

  if (desktopUrl) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="text-[11.5px] text-text-muted">Live desktop</span>
          <Button size="sm" variant="secondary" onClick={stop} disabled={loading}>
            <Square className="size-3.5" />
            Stop
          </Button>
        </div>
        <iframe
          src={desktopUrl}
          title="Agent desktop"
          className="flex-1 border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <MonitorSmartphone className="size-8 text-text-muted" />
      <p className="max-w-xs text-text-secondary">
        No desktop session running. This starts a Docker container with a full XFCE desktop over
        noVNC — it needs the <code className="font-mono text-text-primary">docker</code> CLI
        available on the server host.
      </p>
      <Button size="sm" onClick={start} disabled={loading || !runId}>
        {loading ? "Starting…" : "Start desktop"}
      </Button>
    </div>
  );
}
