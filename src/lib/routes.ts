import type { ChatSession, ViewId } from "@/types";

export function chatPath(chat: ChatSession): string {
  if (chat.type === "image") return "/library";
  return `/${chat.type}/${chat.id}`;
}

export function viewPath(view: ViewId): string {
  return `/${view}`;
}
