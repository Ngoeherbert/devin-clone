# Devin Clone — frontend

React + TypeScript + Vite, Tailwind CSS v4, Zustand, shadcn-style components (Radix primitives + cva), Sonner for toasts. Talks to the Express API in `server/` for auth and data.

## Run it

```
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev
```

Run the backend too (see `server/README.md`) — nothing in the app works without it, including the landing/auth pages once you hit "Sign in" or "Sign up".

## Structure

- src/lib/auth-client.ts — better-auth React client (`useSession`, `signIn`, `signUp`, `signOut`, `emailOtp.*`)
- src/lib/api.ts — thin fetch wrapper for everything else (`/api/chats`, `/api/library`, `/api/integrations`); sends cookies, throws `ApiError` on non-2xx
- src/store/useAppStore.ts — UI-only state (sidebar collapse, chat mode, island open) plus the fetched `chats` list
- src/components/auth/RequireAuth.tsx — route guard; redirects to `/signin` when `useSession()` has no user
- src/pages/LandingPage.tsx — marketing site: nav, hero, features, pricing, testimonials, FAQ, footer
- src/pages/auth/ — SignInPage, SignUpPage, ForgotPasswordPage, VerifyOtpPage, NewPasswordPage — all wired to real `authClient` calls
- src/components/landing/ — one component per landing section
- src/components/auth/AuthShell.tsx — shared card wrapper + heading/back-link used by every auth page
- src/components/layout — Sidebar, AppShell (the logged-in app)
- src/components/views — ChatsView (welcome, creates real chats), LibraryView, IntegrationsView, CanvasWorkspace (canvas + design), AgentWorkspace, SettingsView (real sign-out)
- src/components/chat/ChatIsland.tsx — the floating chat bubble/panel used in canvas + design, sends real messages

## Routing

Public site (no sidebar):
- `/` — landing page
- `/signin`, `/signup` — separate pages, not tabs
- `/forgot-password` — request a reset code by email
- `/verify-otp` — shared by sign-up (email verification) and password reset; reads `location.state.purpose` (`"signup" | "reset"`) to decide where to go next
- `/new-password` — set a new password after a verified reset code

App (behind `RequireAuth`, sidebar + workspaces):
- `/chats`, `/library`, `/integrations`, `/canvas(/:chatId)`, `/design(/:chatId)`, `/agent/:chatId`, `/settings`

Auth flow: `/signup` → `/verify-otp` → `/chats`. `/signin` → *Forgot?* → `/forgot-password` → `/verify-otp` → `/new-password` → `/signin`.

## Notes / what's still a stub

- Sidebar: tabs on top, Recent chats below, Settings pinned at the bottom. Collapses to icon-only via the toggle at the top.
- Clicking a recent chat routes to its matching workspace (agent / canvas / design / chat / library) based on its type.
- **Agent workspace**: real, and now with all six tabs doing something real (see `server/README.md` for the full breakdown of each):
  - **Shell** streams live via SSE as the agent works, not just after it finishes
  - **IDE** is a real collapsible file tree (`components/agent/FileTree.tsx`) with a content viewer, not a flat diff dump
  - **Diff** is per-file and collapsible (`components/agent/DiffAccordion.tsx`) with colored +/− lines
  - **PR** lists every real pull request on the repo (`components/agent/PullRequestList.tsx`), not just the one this run opened
  - **Browser** iframes a detected dev-server preview when the agent starts one
  - **Desktop** can start/stop a real Docker/noVNC container — but this is the one piece I could not test at all (no Docker in this sandbox); treat it as unverified
  - Give it an `owner/repo` in the input on the welcome screen (or the "next run" field in the agent workspace sidebar) and, with `GITHUB_TOKEN` set on the server, it clones that repo, makes real changes, pushes a branch, and opens a real PR. Leave the repo blank and it still runs for real, just in a throwaway scratch workspace with no push.
- **Canvas workspace**: real. `CanvasEditor` is an actual `@xyflow/react` node/edge diagram editor — add tables, connect them, double-click to rename, Save persists a versioned snapshot via the API, reload and it's there.
- **Design workspace**: real. `DesignEditor` is a small custom drag-and-drop wireframe builder (text/block/button elements) with the same save/load.
- **Chat mode** (`/chat/:id`): real. A dedicated `chat`-type session with its own workspace — plain conversation, real Gemini replies, no dev tools. No longer the same thing as Agent mode.
- **Integrations**: GitHub and Google use real better-auth OAuth (unchanged). Slack, Linear, and Jira now go through a real OAuth2 authorization-code flow (full-page redirect → provider consent → callback exchanges the code and stores the token) — but this was written from provider docs and **not tested against live provider APIs** (this environment's network can't reach them). Verify the exchange works before relying on it; see `server/README.md`.
- All four of the above need real credentials in `server/.env` to actually do anything: `GEMINI_API_KEY` for the agent/chat features, `SLACK_CLIENT_ID/SECRET`, `LINEAR_CLIENT_ID/SECRET`, `JIRA_CLIENT_ID/SECRET` for those integrations.

## What's new in this pass

- **Renamed to Omni** — every user-facing string updated.
- **Footer/company pages are real** — About, Careers, Blog, Contact, Docs, Changelog, Status, Community, Privacy, Terms, Security all render real written content via `pages/static/`, not dead `#` links.
- **Auth guards both directions** — `RequireAuth` (app) and the new `RequireGuest` (signin/signup/forgot-password/verify-otp/new-password) mean a signed-in user can't land on the auth pages and vice versa, enforced via `useSession()`.
- **Settings, ChatGPT/Claude-style** — Profile, Personalization (working light/dark/system theme, persisted to localStorage), Notifications, Billing (live trial countdown, real Stripe Checkout/Portal buttons), Data controls, Account.
- **Typing effect** — `components/chat/TypingText.tsx`, wired into both `ChatWorkspace` and `AgentWorkspace` for newly-arriving assistant text (historical messages on load render instantly, matching ChatGPT/Claude's own behavior).
- **Image-loading animation** — `components/library/ImageGenSkeleton.tsx`, a shimmer skeleton grid shown in the Library tab while loading. Honest caveat: there's still no real image-generation pipeline wired up anywhere in the app, so this is the loading state for *fetching* the library, not for an actual in-flight generation — there was nothing real to hook the latter to.
- **Mobile responsiveness** — the Sidebar is now a real slide-in drawer below the `sm` breakpoint (with a hamburger button + backdrop in `AppShell`), the Agent workspace stacks its chat panel above the tab content on narrow screens with a horizontally-scrollable tab bar, the Design editor stacks its canvas and controls, and the canvas chat island caps its width to the viewport. This was a targeted pass on the highest-traffic screens, not an exhaustive pixel audit of every component — the landing page's sections were already responsive from earlier work.

## Gap fixes (this pass)

- **Image generation is now real**, not just a loading skeleton with nothing behind it. `LibraryView` has a prompt input that generates via [Pollinations.ai](https://pollinations.ai) — free, no API key, the browser fetches the image directly. `ImageGenSkeleton` now shows for genuinely in-flight generations (preloaded via `new Image()` before saving to the library), not just while fetching the list.
- **Mobile responsiveness extended** to the two areas I'd previously flagged as still desktop-oriented: the IDE tab's `FileTree` now shows one pane at a time below the `sm` breakpoint (tree, or the selected file with a back button) instead of a cramped 220px+content split; the Canvas editor's floating toolbar collapses to icon-only buttons on narrow screens.
