import { Router } from "express";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { integration, integrationProviderEnum } from "../db/schema.js";
import { attachSession, requireAuth } from "../middleware/session.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  isProviderConfigured,
  type OAuthProvider,
} from "../integrations/oauth-providers.js";

export const integrationsRouter = Router();

const KNOWN_PROVIDERS = integrationProviderEnum.enumValues; // ["github", "slack", "linear", "jira"]
const OAUTH_PROVIDERS: OAuthProvider[] = ["slack", "linear", "jira"];

function isOAuthProvider(p: string): p is OAuthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(p);
}

// In-memory CSRF state store for the OAuth handshake. Single-process only —
// fine for a dev/demo deployment; move to the DB or Redis for multi-instance.
const pendingStates = new Map<string, { userId: string; provider: OAuthProvider; expiresAt: number }>();
const STATE_TTL_MS = 5 * 60 * 1000;

function callbackUrl(req: import("express").Request, provider: string) {
  const base = process.env.BETTER_AUTH_URL ?? `${req.protocol}://${req.get("host")}`;
  return `${base}/api/integrations/${provider}/callback`;
}

integrationsRouter.use(attachSession, requireAuth);

// GET /api/integrations — every known provider, merged with this user's connection state
integrationsRouter.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(integration)
    .where(eq(integration.userId, req.session!.user.id));

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const merged = KNOWN_PROVIDERS.map((provider) => ({
    ...(byProvider.get(provider) ?? {
      id: null,
      userId: req.session!.user.id,
      provider,
      connected: false,
      accessToken: null,
      createdAt: null,
    }),
    // Tell the client whether this provider even has a real OAuth app configured,
    // so it can explain why "Connect" doesn't work yet instead of failing silently.
    oauthConfigured: isOAuthProvider(provider) ? isProviderConfigured(provider) : true,
  }));

  res.json(merged);
});

// GET /api/integrations/:provider/connect — kicks off the real OAuth redirect.
// This is a full-page navigation, not a fetch call.
integrationsRouter.get("/:provider/connect", (req, res) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) {
    return res.status(400).json({ error: "This provider doesn't use OAuth here" });
  }
  if (!isProviderConfigured(provider)) {
    return res
      .status(400)
      .json({ error: `${provider} OAuth isn't configured — add its client id/secret to .env` });
  }

  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, {
    userId: req.session!.user.id,
    provider,
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  res.redirect(buildAuthorizeUrl(provider, callbackUrl(req, provider), state));
});

// GET /api/integrations/:provider/callback — provider redirects back here with ?code&state
integrationsRouter.get("/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
  const appUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  if (!isOAuthProvider(provider)) {
    return res.status(400).send("Unknown provider");
  }
  if (error) {
    return res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error)}`);
  }

  const pending = state ? pendingStates.get(state) : undefined;
  if (!pending || pending.provider !== provider || pending.expiresAt < Date.now()) {
    return res.redirect(`${appUrl}/integrations?error=invalid_state`);
  }
  pendingStates.delete(state!);

  if (!code) {
    return res.redirect(`${appUrl}/integrations?error=missing_code`);
  }

  try {
    const accessToken = await exchangeCodeForToken(provider, code, callbackUrl(req, provider));

    const [existing] = await db
      .select()
      .from(integration)
      .where(and(eq(integration.userId, pending.userId), eq(integration.provider, provider)));

    if (existing) {
      await db
        .update(integration)
        .set({ connected: true, accessToken })
        .where(eq(integration.id, existing.id));
    } else {
      await db.insert(integration).values({
        userId: pending.userId,
        provider,
        connected: true,
        accessToken,
      });
    }

    res.redirect(`${appUrl}/integrations?connected=${provider}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(message)}`);
  }
});

// POST /api/integrations/:provider/toggle — disconnect only. Connecting an OAuth
// provider goes through /connect; GitHub (identity-only here) can still flip on/off.
integrationsRouter.post("/:provider/toggle", async (req, res) => {
  const provider = req.params.provider as (typeof KNOWN_PROVIDERS)[number];
  if (!KNOWN_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "Unknown provider" });
  }

  const [existing] = await db
    .select()
    .from(integration)
    .where(
      and(eq(integration.userId, req.session!.user.id), eq(integration.provider, provider))
    );

  if (existing?.connected) {
    const [row] = await db
      .update(integration)
      .set({ connected: false, accessToken: null })
      .where(eq(integration.id, existing.id))
      .returning();
    return res.json(row);
  }

  if (isOAuthProvider(provider)) {
    return res.status(400).json({ error: "Use /connect to start OAuth for this provider" });
  }

  // Non-OAuth provider (github placeholder) — simple flip, unchanged behavior.
  if (existing) {
    const [row] = await db
      .update(integration)
      .set({ connected: true })
      .where(eq(integration.id, existing.id))
      .returning();
    return res.json(row);
  }

  const [row] = await db
    .insert(integration)
    .values({ userId: req.session!.user.id, provider, connected: true })
    .returning();
  res.status(201).json(row);
});
