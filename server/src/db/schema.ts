import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  pgEnum,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------
 * Better Auth tables — field names/types must match what better-auth expects.
 * Google + GitHub OAuth and email/password both live in `account`.
 * `verification` backs the email-OTP plugin (signup verification + password reset).
 * ---------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(), // "google" | "github" | "credential"
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"), // set only for email/password accounts
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(), // e.g. the email address
  value: text("value").notNull(), // the OTP code (or hash, per storeOTP config)
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * App tables
 * ---------------------------------------------------------------------- */

export const chatTypeEnum = pgEnum("chat_type", ["agent", "canvas", "design", "image", "chat"]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "team", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

/** One row per user — created at signup so every user's trial is fully independent. */
export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
}));
export const chatStatusEnum = pgEnum("chat_status", ["idle", "running", "done", "error"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const messageKindEnum = pgEnum("message_kind", ["text", "action"]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "github",
  "slack",
  "linear",
  "jira",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "success",
  "failed",
]);
export const canvasKindEnum = pgEnum("canvas_kind", ["canvas", "design"]);

export const chatSession = pgTable("chat_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: chatTypeEnum("type").notNull(),
  status: chatStatusEnum("status").notNull().default("idle"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const message = pgTable("message", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id")
    .notNull()
    .references(() => chatSession.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  kind: messageKindEnum("kind").notNull().default("text"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const libraryItem = pgTable("library_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id")
    .notNull()
    .references(() => chatSession.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const integration = pgTable("integration", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  connected: boolean("connected").notNull().default(false),
  accessToken: text("access_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** One row per attempt/re-run of an agent task, so retries don't clobber history. */
export const agentRun = pgTable("agent_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id")
    .notNull()
    .references(() => chatSession.id, { onDelete: "cascade" }),
  status: agentRunStatusEnum("status").notNull().default("queued"),
  repo: text("repo"),
  branch: text("branch"),
  prUrl: text("pr_url"),
  summary: text("summary"),
  diff: text("diff"),
  files: jsonb("files"), // captured file tree for the IDE tab: FileNode[]
  previewUrl: text("preview_url"), // detected dev-server URL for the Browser tab
  desktopUrl: text("desktop_url"), // noVNC URL for the Desktop tab, if a container was started
  desktopContainerId: text("desktop_container_id"),
  filesChanged: integer("files_changed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Versioned snapshots of canvas/design content — one row per save, latest = current state. */
export const canvasSnapshot = pgTable("canvas_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id")
    .notNull()
    .references(() => chatSession.id, { onDelete: "cascade" }),
  kind: canvasKindEnum("kind").notNull(),
  version: integer("version").notNull().default(1),
  data: jsonb("data").notNull(), // diagram nodes/edges, or design frame layout
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Relations (for db.query.* with nested includes)
 * ---------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  chatSessions: many(chatSession),
  integrations: many(integration),
}));

export const chatSessionRelations = relations(chatSession, ({ one, many }) => ({
  user: one(user, { fields: [chatSession.userId], references: [user.id] }),
  messages: many(message),
  libraryItems: many(libraryItem),
  agentRuns: many(agentRun),
  canvasSnapshots: many(canvasSnapshot),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [message.chatSessionId],
    references: [chatSession.id],
  }),
}));

export const libraryItemRelations = relations(libraryItem, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [libraryItem.chatSessionId],
    references: [chatSession.id],
  }),
  user: one(user, { fields: [libraryItem.userId], references: [user.id] }),
}));

export const agentRunRelations = relations(agentRun, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [agentRun.chatSessionId],
    references: [chatSession.id],
  }),
}));

export const canvasSnapshotRelations = relations(canvasSnapshot, ({ one }) => ({
  chatSession: one(chatSession, {
    fields: [canvasSnapshot.chatSessionId],
    references: [chatSession.id],
  }),
}));
