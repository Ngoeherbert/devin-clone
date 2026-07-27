export interface StaticPageSection {
  heading?: string;
  body: string[];
}

export interface StaticPageContent {
  title: string;
  subtitle?: string;
  updated?: string;
  sections: StaticPageSection[];
}

export const staticPages: Record<string, StaticPageContent> = {
  about: {
    title: "About Omni",
    subtitle: "We're building the AI teammate that ships alongside you.",
    sections: [
      {
        body: [
          "Omni started from a simple observation: the best engineers spend most of their time on work that isn't actually engineering — chasing down flaky tests, writing the same boilerplate for the tenth time, translating a whiteboard sketch into a real diagram.",
          "We're building an AI teammate that handles that work directly — planning a task, writing real code, running it, and opening a pull request for review, alongside a canvas for architecture diagrams and a design surface for UI mockups, all in one workspace.",
        ],
      },
      {
        heading: "How we work",
        body: [
          "Small team, shipping in public, biased toward real working software over polished decks. If a feature can't do something real end to end, we don't ship it as if it can.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    subtitle: "We're not hiring right now — but we're always glad to hear from good people.",
    sections: [
      {
        body: [
          "Omni is a small team focused on making an AI teammate that actually does the work, not just talks about it. We don't have open roles posted at the moment.",
          "If that changes, or if you think there's a role we're missing, reach out — we read everything that comes through our contact page.",
        ],
      },
    ],
  },
  blog: {
    title: "Blog",
    subtitle: "Notes on what we're building and why.",
    sections: [
      {
        body: [
          "We haven't published anything here yet. When we do, it'll be about the actual engineering decisions behind Omni — how the agent's tool loop works, why the canvas uses versioned snapshots, what broke and how we fixed it — not announcements dressed up as thought leadership.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact",
    subtitle: "Get in touch.",
    sections: [
      {
        body: [
          "For support, bug reports, or general questions, reach us at support@omni.dev.",
          "For partnerships or enterprise inquiries, reach out at sales@omni.dev.",
        ],
      },
    ],
  },
  docs: {
    title: "Documentation",
    subtitle: "Guides for getting the most out of Omni.",
    sections: [
      {
        heading: "Getting started",
        body: [
          "Sign up, pick Agent or Chat mode from the welcome screen, and describe what you want done. Agent mode plans, writes code, and can open a real pull request if you give it a repo. Chat mode is a plain conversation.",
        ],
      },
      {
        heading: "Canvas & Design",
        body: [
          "Canvas is for architecture, ER, and UML-style diagrams — add tables, connect them, and save versioned snapshots. Design is a lightweight wireframe builder for UI screens.",
        ],
      },
      {
        heading: "Integrations",
        body: [
          "Connect GitHub for repo access, and Slack, Linear, or Jira from the Integrations page to let Omni work with your existing tools.",
        ],
      },
    ],
  },
  changelog: {
    title: "Changelog",
    subtitle: "What's new in Omni.",
    sections: [
      {
        heading: "Recent",
        body: [
          "Real-time shell output while the agent works, a collapsible file tree for browsing what it changed, per-file diffs, live pull request status, and a dev-server preview when the agent starts one.",
          "Dedicated plain-chat sessions, separate from agent tasks. Slack, Linear, and Jira connections via OAuth.",
        ],
      },
    ],
  },
  status: {
    title: "Status",
    subtitle: "All systems operational.",
    sections: [
      {
        body: [
          "This page will eventually pull from a real status/incident feed. For now: if you're seeing this, the marketing site is up. For live API status, check your own deployment's health endpoint.",
        ],
      },
    ],
  },
  community: {
    title: "Community",
    subtitle: "Where to find other people using Omni.",
    sections: [
      {
        body: [
          "We don't have a public community space set up yet. In the meantime, the fastest way to reach us directly is the contact page.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: July 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account information you provide (name, email), authentication data from OAuth providers you connect (GitHub, Google, Slack, Linear, Jira), and the content of the tasks, messages, and diagrams you create while using Omni.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To operate the product: running your agent tasks, storing your chats and canvases, and connecting to third-party tools you authorize. We don't sell your data.",
        ],
      },
      {
        heading: "Third parties",
        body: [
          "Agent tasks are processed by Google's Gemini API. Code changes for tasks with a connected repository are pushed to GitHub on your behalf, using a token you control. Payment processing, if you're on a paid plan, is handled by Stripe — we don't store your card details ourselves.",
        ],
      },
      {
        heading: "Your controls",
        body: [
          "You can disconnect any integration, delete your chats, and delete your account at any time from Settings.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: July 2026",
    sections: [
      {
        heading: "Using Omni",
        body: [
          "By using Omni you agree to use it lawfully and not to use the agent to generate or distribute malicious code, or to access systems or repositories you're not authorized to access.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You own what you create with Omni. We need a limited license to store and process it in order to run the product — nothing more.",
        ],
      },
      {
        heading: "Subscriptions",
        body: [
          "Paid plans renew automatically until canceled. You can cancel anytime from Settings → Billing; you'll keep access through the end of the current billing period.",
        ],
      },
      {
        heading: "No warranty",
        body: [
          "Omni is provided as-is. Agent-generated code and pull requests should be reviewed before merging — we don't guarantee correctness.",
        ],
      },
    ],
  },
  security: {
    title: "Security",
    sections: [
      {
        heading: "Authentication",
        body: [
          "Sign-in is handled by better-auth with hashed credentials, OAuth (Google, GitHub), and OTP-based email verification and password resets — we never store plaintext passwords.",
        ],
      },
      {
        heading: "Agent execution",
        body: [
          "Each agent run works in an isolated, ephemeral workspace that's discarded after the run (unless it's left running for a preview, in which case it's automatically cleaned up after a period of inactivity). Shell commands run with a timeout and are scoped to that workspace.",
        ],
      },
      {
        heading: "Reporting an issue",
        body: [
          "If you find a security issue, please email security@omni.dev instead of filing a public issue.",
        ],
      },
    ],
  },
};

export type StaticPageSlug = keyof typeof staticPages;
