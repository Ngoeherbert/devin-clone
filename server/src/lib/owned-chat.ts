import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatSession } from "../db/schema.js";

/** Returns the chat session if it exists and belongs to userId, otherwise null. */
export async function getOwnedChat(chatId: string, userId: string) {
  const [row] = await db
    .select()
    .from(chatSession)
    .where(and(eq(chatSession.id, chatId), eq(chatSession.userId, userId)));
  return row ?? null;
}
