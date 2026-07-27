import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LogOut,
  User,
  Palette,
  Bell,
  CreditCard,
  Database,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient, useSession } from "@/lib/auth-client";
import { api, ApiError } from "@/lib/api";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "personalization", label: "Personalization", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "data", label: "Data controls", icon: Database },
  { id: "account", label: "Account", icon: Trash2 },
] as const;

type SectionId = (typeof sections)[number]["id"];

interface Subscription {
  plan: "free" | "team" | "enterprise";
  status: "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  configured: boolean;
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function SettingsView() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState<SectionId>("profile");
  const [theme, setThemeState] = useState<Theme>(getStoredTheme());
  const [sub, setSub] = useState<Subscription | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    api
      .get<Subscription>("/api/billing/subscription")
      .then(setSub)
      .catch(() => {
        // billing not reachable/configured — sections below handle the null state
      });
  }, []);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") toast.success("Subscription updated.");
    if (billing === "cancel") toast("Checkout canceled.");
    if (billing) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/signin");
  };

  const handleThemeChange = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  const handleUpgrade = async () => {
    setBillingLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/checkout");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start checkout.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/portal");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't open the billing portal.");
    } finally {
      setBillingLoading(false);
    }
  };

  const trialDays = sub?.status === "trialing" ? daysLeft(sub.trialEndsAt) : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-[200px] sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                active === s.id
                  ? "bg-surface-2 text-text-primary"
                  : "text-text-secondary hover:bg-surface-2"
              )}
            >
              <Icon className="size-[15px]" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="mx-auto max-w-lg">
          {active === "profile" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Profile</h2>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-bg-accent text-[15px] font-medium text-text-accent">
                  {session?.user.name?.slice(0, 1).toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-[13.5px] font-medium">{session?.user.name}</p>
                  <p className="text-xs text-text-secondary">{session?.user.email}</p>
                </div>
              </div>
            </div>
          )}

          {active === "personalization" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Personalization</h2>
              <p className="mb-2 text-xs font-medium text-text-secondary">Theme</p>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] capitalize",
                      theme === t
                        ? "border-border-accent bg-bg-accent text-text-accent"
                        : "border-border text-text-secondary hover:bg-surface-2"
                    )}
                  >
                    {theme === t && <Check className="size-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Notifications</h2>
              <div className="flex flex-col gap-3">
                {["Email me when a run finishes", "Email me about product updates"].map(
                  (label) => (
                    <label
                      key={label}
                      className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5"
                    >
                      <span className="text-[13px] text-text-primary">{label}</span>
                      <input type="checkbox" defaultChecked className="size-4" />
                    </label>
                  )
                )}
              </div>
            </div>
          )}

          {active === "billing" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Billing</h2>
              {!sub ? (
                <p className="text-[13px] text-text-secondary">Loading…</p>
              ) : (
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[13.5px] font-medium capitalize">{sub.plan} plan</span>
                    <span className="text-xs capitalize text-text-secondary">{sub.status}</span>
                  </div>
                  {trialDays !== null && (
                    <p className="mb-3 text-[12.5px] text-text-secondary">
                      {trialDays > 0
                        ? `${trialDays} day${trialDays === 1 ? "" : "s"} left in your trial.`
                        : "Your trial has ended."}
                    </p>
                  )}
                  {!sub.configured && (
                    <p className="mb-3 text-[12px] text-text-muted">
                      Billing isn't configured on the server yet (missing Stripe keys).
                    </p>
                  )}
                  {sub.plan === "team" ? (
                    <Button size="sm" onClick={handleManageBilling} disabled={billingLoading}>
                      Manage subscription
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleUpgrade}
                      disabled={billingLoading || !sub.configured}
                    >
                      Upgrade to Team
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {active === "data" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Data controls</h2>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
                  <span className="text-[13px] text-text-primary">Export your data</span>
                  <Button size="sm" variant="secondary" onClick={() => toast("Export queued")}>
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
                  <span className="text-[13px] text-text-primary">Delete all chats</span>
                  <Button size="sm" variant="secondary" onClick={() => toast("Not implemented yet")}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {active === "account" && (
            <div>
              <h2 className="mb-4 text-[15px] font-medium">Account</h2>
              <div className="flex flex-col gap-2.5">
                <Button variant="secondary" onClick={handleSignOut} className="w-full justify-center">
                  <LogOut className="size-3.5" />
                  Sign out
                </Button>
                <button
                  onClick={() => toast.error("Account deletion isn't implemented yet")}
                  className="rounded-md border border-border px-3 py-2 text-[12.5px] text-text-danger hover:bg-bg-danger"
                >
                  Delete account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
