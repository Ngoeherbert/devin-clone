import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FolderGit2, MessageSquare, ListChecks, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { IntegrationDef, IntegrationProvider } from "@/types";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const iconMap: Record<IntegrationProvider, typeof FolderGit2> = {
  github: FolderGit2,
  slack: MessageSquare,
  linear: ListChecks,
  jira: CheckSquare,
};

const labelMap: Record<IntegrationProvider, { name: string; description: string }> = {
  github: { name: "GitHub", description: "Open PRs and read issues" },
  slack: { name: "Slack", description: "Assign tasks from a channel" },
  linear: { name: "Linear", description: "Sync tickets and status" },
  jira: { name: "Jira", description: "Sync tickets and status" },
};

const OAUTH_PROVIDERS: IntegrationProvider[] = ["slack", "linear", "jira"];

export function IntegrationsView() {
  const [integrations, setIntegrations] = useState<IntegrationDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<IntegrationProvider | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const refresh = () =>
    api
      .get<IntegrationDef[]>("/api/integrations")
      .then(setIntegrations)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load integrations.");
      });

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Land here after the OAuth redirect with ?connected=slack or ?error=...
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast.success(`${labelMap[connected as IntegrationProvider]?.name ?? connected} connected`);
      refresh();
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
    }
    if (connected || error) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = (provider: IntegrationProvider, oauthConfigured: boolean) => {
    if (!oauthConfigured) {
      toast.error(
        `${labelMap[provider].name} isn't configured on the server yet — add its client id/secret to server/.env`
      );
      return;
    }
    // Real OAuth redirect — full page navigation, not a fetch call.
    window.location.href = `${API_URL}/api/integrations/${provider}/connect`;
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    setPending(provider);
    try {
      const updated = await api.post<IntegrationDef>(`/api/integrations/${provider}/toggle`);
      setIntegrations((rows) => rows.map((r) => (r.provider === provider ? updated : r)));
      toast(`${labelMap[provider].name} disconnected`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't disconnect.");
    } finally {
      setPending(null);
    }
  };

  const handleGithubToggle = async (provider: "github") => {
    setPending(provider);
    try {
      const updated = await api.post<IntegrationDef>(`/api/integrations/${provider}/toggle`);
      setIntegrations((rows) => rows.map((r) => (r.provider === provider ? updated : r)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update that connection.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="mb-1 text-lg font-medium">Integrations</h1>
      <p className="mb-4 text-sm text-text-secondary">
        Connect the tools Omni can work with.
      </p>
      {loading ? (
        <p className="text-[13px] text-text-secondary">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {integrations.map((integ) => {
            const Icon = iconMap[integ.provider];
            const label = labelMap[integ.provider];
            const isOAuth = OAUTH_PROVIDERS.includes(integ.provider);
            return (
              <div
                key={integ.provider}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-4"
              >
                <Icon className="size-6 text-text-secondary" />
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium">{label.name}</div>
                  <div className="text-xs text-text-secondary">
                    {integ.connected || integ.oauthConfigured
                      ? label.description
                      : `${label.description} — not configured`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={integ.connected ? "secondary" : "default"}
                  disabled={pending === integ.provider}
                  onClick={() => {
                    if (integ.connected) {
                      isOAuth ? handleDisconnect(integ.provider) : handleGithubToggle("github");
                    } else {
                      isOAuth
                        ? handleConnect(integ.provider, integ.oauthConfigured)
                        : handleGithubToggle("github");
                    }
                  }}
                >
                  {integ.connected ? "Connected" : "Connect"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
