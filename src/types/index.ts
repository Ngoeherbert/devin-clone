export type ViewId =
  | "chats"
  | "library"
  | "integrations"
  | "canvas"
  | "design"
  | "agent"
  | "settings";

export type ChatType = "agent" | "canvas" | "design" | "image" | "chat";
export type ChatStatus = "idle" | "running" | "done" | "error";

export type ChatMode = "agent" | "chat";

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  type: ChatType;
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatSessionId: string;
  role: "user" | "assistant";
  content: string;
  kind: "text" | "action";
  createdAt: string;
}

export interface LibraryItem {
  id: string;
  chatSessionId: string;
  userId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export type IntegrationProvider = "github" | "slack" | "linear" | "jira";

export interface IntegrationDef {
  id: string | null;
  userId: string;
  provider: IntegrationProvider;
  connected: boolean;
  accessToken: string | null;
  createdAt: string | null;
  oauthConfigured: boolean;
}
