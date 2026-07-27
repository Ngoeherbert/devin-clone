# Devin Clone — API

Express + Drizzle ORM + Neon Postgres, auth via [better-auth](https://www.better-auth.com) (email/password + Google + GitHub OAuth, email-OTP for signup verification and password reset).

## Setup

```
cp .env.example .env
# fill in DATABASE_URL (Neon), BETTER_AUTH_SECRET, GOOGLE_*, GITHUB_*

npm install
npm run db:generate   # already run once — drizzle/0000_*.sql is included
npm run db:migrate    # applies it to your Neon database
npm run dev            # http://localhost:4000
```

`BETTER_AUTH_SECRET` — generate one with `openssl rand -base64 32`.

### OAuth apps

- **Google** — console.cloud.google.com → APIs & Services → Credentials → OAuth client ID (Web application). Authorized redirect URI: `http://localhost:4000/api/auth/callback/google`
- **GitHub** — github.com/settings/developers → New OAuth App. Authorization callback URL: `http://localhost:4000/api/auth/callback/github`

## Structure

- `src/db/schema.ts` — every table (see below)
- `src/db/index.ts` — Neon + Drizzle client
- `src/auth.ts` — better-auth config (Drizzle adapter, OAuth providers, email-OTP plugin)
- `src/middleware/session.ts` — `attachSession` / `requireAuth` for protecting routes
- `src/routes/chats.ts` — example CRUD, scoped to the signed-in user
- `src/index.ts` — Express app; mounts better-auth at `/api/auth/*` and app routes under `/api/*`

## Schema

**Auth (better-auth managed):** `user`, `session`, `account` (OAuth + credential), `verification` (backs the OTP codes)

**App:**
- `chat_session` — one row per chat, `type` is `agent | canvas | design | image`
- `message` — chat messages, `role` is `user | assistant`
- `library_item` — generated images, linked to the `image`-type chat that produced them
- `integration` — per-user connector state (GitHub, Slack, Linear, Jira)
- `agent_run` — one row per attempt/re-run of an agent task (repo, branch, PR URL, status) — separate from `chat_session` so retries don't overwrite history
- `canvas_snapshot` — versioned JSONB snapshots of canvas/design content, one row per save

All foreign keys cascade on delete.

## Auth flow ↔ frontend mapping

| Frontend page | better-auth call |
|---|---|
| `/signup` | `authClient.signUp.email(...)` (triggers OTP via `sendVerificationOnSignUp`) |
| `/verify-otp` (purpose: signup) | `authClient.emailOtp.verifyEmail({ email, otp })` |
| `/signin` | `authClient.signIn.email(...)` / `authClient.signIn.social({ provider: "google" \| "github" })` |
| `/forgot-password` | `authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" })` |
| `/verify-otp` (purpose: reset) | `authClient.emailOtp.checkVerificationOtp(...)` then hold the OTP for the reset call |
| `/new-password` | `authClient.emailOtp.resetPassword({ email, otp, password })` |

All of the above is wired up on the frontend now (see `src/lib/auth-client.ts` and `src/pages/auth/*` in the frontend repo) — not just planned.

## App data endpoints

All under `/api/*`, all require a session (`attachSession` + `requireAuth` middleware) and are scoped to the caller:

- `GET/POST /api/chats` — list / create chat sessions (`type`: `agent | canvas | design | image | chat`)
- `GET /api/chats/:id` — one chat (404 if it's not yours)
- `GET/POST /api/chats/:id/messages` — thread for a chat
- `POST /api/chats/:id/reply` — real Gemini text reply for a `chat`-type session (no tools, just conversation)
- `GET/POST/PATCH /api/chats/:id/agent-runs` — create/list/update agent run attempts
- `POST /api/chats/:id/agent-runs/:runId/execute` — **actually runs the agent** (see below)
- `GET/POST /api/chats/:id/canvas` — versioned canvas/design snapshots (consumed by the real editors on the frontend)
- `GET/POST /api/library` — generated images
- `GET /api/integrations` — merged provider list + this user's connection state
- `GET /api/integrations/:provider/connect` — starts real OAuth (Slack, Linear, Jira) — full-page redirect, not a fetch
- `GET /api/integrations/:provider/callback` — OAuth redirect target, exchanges the code and stores the token
- `POST /api/integrations/:provider/toggle` — disconnect (or the simple on/off flip for GitHub, which isn't OAuth-wired here since better-auth already handles GitHub identity login)

## Agent execution engine

`src/agent/` — a real, working (if intentionally small) coding agent:

- **`gemini.ts`** — client for Google's free-tier Gemini API (`gemini-2.0-flash` by default)
- **`tools.ts`** — the tools the model can call: `write_file`, `read_file`, `list_files`, `run_command` (bash, 20s timeout, sandboxed to the workspace dir), `finish`
- **`workspace.ts`** — creates an ephemeral, git-initialized scratch directory per run and computes a real `git diff` afterward
- **`orchestrator.ts`** — the function-calling loop (max 8 steps): sends the task + tool results back and forth with Gemini until it calls `finish`

Each step (tool call + result) is persisted as a `message` row (`kind: "action"`) so the agent workspace's chat pane shows a real transcript, and the final diff/summary land on the `agent_run` row for the IDE/Diff/PR tabs.

**Real repo + PR support**: if a run has a `repo` (`"owner/repo"`) and `GITHUB_TOKEN` is set, the orchestrator clones that repo instead of using a scratch workspace, lets the agent make real changes, computes the diff, then — if anything actually changed — creates a branch (`devin-agent/<timestamp>`), commits, pushes with the token, and opens a real PR via Octokit (`src/agent/github.ts`). If cloning fails, the token is missing, or no repo is given, it falls back to the throwaway scratch workspace with no push — same as before, just no PR link on the PR tab. `GITHUB_TOKEN` is deliberately separate from `GITHUB_CLIENT_ID/SECRET` (that pair is for user login via better-auth; the token is what the agent uses to write to a repo on the user's behalf) — see `.env.example` for where to generate one and what scope it needs.

I could not test the clone/push/PR path against a live GitHub repo in this environment (same network restriction as the OAuth work below), so verify it against a real (ideally throwaway/test) repository before trusting it with anything you care about.

## The six agent workspace tabs

- **Shell** — the execute endpoint now streams over Server-Sent Events (`POST .../execute` responds `text/event-stream`, not JSON) instead of blocking until the whole run finishes. Each tool call/result is pushed the moment it happens, so the Shell tab fills in live rather than appearing all at once at the end.
- **IDE** — `agent/workspace.ts#captureFileTree` walks the workspace after the run (skipping `.git`/`node_modules`/`dist`/etc, capping at 300 files / 50KB per file) into a `FileNode[]` tree stored on `agent_run.files` (jsonb). The frontend's `FileTree` component renders it as a collapsible VS Code–style tree with a content viewer pane.
- **Desktop** — `agent/desktop.ts` shells out to the `docker` CLI to run a noVNC desktop image (`consol/ubuntu-xfce-vnc` by default, override with `DESKTOP_DOCKER_IMAGE`), maps its noVNC port, and returns the URL to iframe. Explicitly checks `docker version` first and fails with a clear message if Docker isn't reachable — **this is the one piece I genuinely cannot verify at all** in this sandboxed environment (no Docker daemon, no way to test container networking). Treat it as a well-intentioned first draft, not a verified feature.
- **PR** — `GET /api/chats/:id/pull-requests` calls `octokit.pulls.list({ state: "all" })` on the run's repo and returns every PR (open, closed, merged) sorted by recency, not just the one this run may have opened.
- **Diff** — unchanged server-side (`agent_run.diff` is still one unified diff string); the frontend now parses it per-file (`lib/diff.ts`) and renders each file as a collapsible accordion row with add/delete counts and colored +/− lines, instead of one long unbroken block.
- **Browser** — a new `start_dev_server` tool spawns a detached, long-running process (unlike `run_command`, which has a 20s timeout meant for one-off commands) and watches its stdout/stderr for a `localhost` URL or a port number for ~6 seconds. If found, it's saved as `agent_run.previewUrl` and iframed. This is heuristic (regex-matching common "Local: http://localhost:3000" style output) and will miss dev servers with unusual startup logging — documented as best-effort, not guaranteed.

**A real tradeoff worth knowing about**: if a run detects a preview URL, its scratch workspace is deliberately *not* cleaned up afterward (the dev server needs the files to keep serving them) and its detached process is left running. There's no automatic reaper for these yet — they accumulate until the server restarts or you clean `/tmp` yourself. Fine for a demo; you'll want a TTL sweep before this sees real traffic.

## Real OAuth for Slack / Linear / Jira

`src/integrations/oauth-providers.ts` implements a standard OAuth2 authorization-code flow per provider (Slack's `oauth.v2.access`, Linear's `/oauth/token`, Atlassian's 3LO flow for Jira — note Atlassian's token endpoint wants JSON, the other two want form-encoded, handled per-provider). CSRF `state` is tracked in an in-memory `Map` (single-process only — swap for the DB or Redis if you scale past one instance) keyed to the signed-in user, checked and consumed in the callback.

I wrote this against each provider's public OAuth docs from training knowledge, but **couldn't test it live** — this sandbox's network egress doesn't reach `slack.com`, `linear.app`, or `atlassian.com`. Endpoint URLs, param names, and token-exchange formats are correct as far as I can verify from documentation, but you should register a real OAuth app per provider and confirm the exchange works end to end before relying on it. If a provider's token response shape doesn't match what `exchangeCodeForToken` expects, that function is the only place you should need to touch.

GitHub isn't OAuth-wired here since better-auth already handles GitHub as a login provider — a separate integration-scoped GitHub OAuth app (for repo access rather than identity) would follow the same pattern as Slack/Linear/Jira if you want it.

## Subscriptions & trials

- `subscription` table — one row per user, created automatically via a better-auth `databaseHooks.user.create.after` hook the moment they sign up. Each row gets its own `trialEndsAt` (14 days out), so trials are structurally isolated per user — there's no shared/global trial state anything could leak across.
- Real Stripe integration (`src/billing/`, `src/routes/billing.ts`): `POST /api/billing/checkout` creates a Checkout session for the Team plan, `POST /api/billing/portal` opens the Stripe Billing Portal for managing/canceling, and `POST /api/billing/webhook` (mounted with `express.raw()` **before** the global `express.json()` — Stripe's signature check needs the raw body) syncs `checkout.session.completed` and `customer.subscription.updated/deleted` back onto the row.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_TEAM` in `.env.example` — Stripe test mode is free, so this is fully testable once you create a test account and a test Price. I verified the routes are wired and auth-gated correctly (boot-tested), but — consistent with everything else that touches a third-party API — I could not run an actual Checkout session or webhook delivery in this sandbox (no network path to `api.stripe.com`). Leave the keys blank and every user just stays on the Free plan with their trial; nothing errors.

## Preview workspace reaper

Runs that leave a dev server up for the Browser tab preview used to leak their scratch workspace and process forever. Fixed: `src/agent/previewRegistry.ts` tracks every such workspace with a 30-minute TTL and sweeps expired ones every 5 minutes (killing the process group and `rm -rf`ing the directory). There's also a manual `POST /api/chats/:id/agent-runs/:runId/preview/stop` if you don't want to wait for the TTL.

## Gap fixes (this pass)

- **Global error handler** added in `index.ts` — async route errors (a down DB, a failed Stripe call) now return clean `{ error: message }` JSON instead of leaking a stack trace, since Express 5 auto-forwards rejected promises to error middleware and there wasn't one before.
- **Stripe webhook verified end-to-end against the real running route** (not just the SDK in isolation): generated a validly-signed test event locally with `stripe.webhooks.generateTestHeaderString` (pure HMAC, no network needed) and POSTed it to the live `/api/billing/webhook` endpoint. Result: an invalid signature is correctly rejected in 15ms before touching the database; a valid signature passes verification and reaches the real `db.update(subscription)...` call, only failing because this sandbox's Postgres is fake. That's the strongest verification possible without a real Stripe account and a real database — the actual `stripe.checkout.sessions.create`/`billingPortal.sessions.create` calls still need live network to `api.stripe.com`, which I don't have here.
