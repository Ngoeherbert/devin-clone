import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { libraryItem } from "../db/schema.js";
import { attachSession, requireAuth } from "../middleware/session.js";
import { getOwnedChat } from "../lib/owned-chat.js";

export const libraryRouter = Router();

libraryRouter.use(attachSession, requireAuth);

// GET /api/library — every generated image for the signed-in user, newest first
libraryRouter.get("/", async (req, res) => {
  const rows = await db
    .select()
    .from(libraryItem)
    .where(eq(libraryItem.userId, req.session!.user.id))
    .orderBy(desc(libraryItem.createdAt));

  res.json(rows);
});

// POST /api/library — save a generated image, linked to the chat that produced it
libraryRouter.post("/", async (req, res) => {
  const { chatSessionId, title, imageUrl } = req.body as {
    chatSessionId?: string;
    title?: string;
    imageUrl?: string;
  };
  if (!chatSessionId || !title || !imageUrl) {
    return res.status(400).json({ error: "chatSessionId, title, and imageUrl are required" });
  }

  const chat = await getOwnedChat(chatSessionId, req.session!.user.id);
  if (!chat) return res.status(404).json({ error: "Chat not found" });

  const [row] = await db
    .insert(libraryItem)
    .values({ chatSessionId, userId: req.session!.user.id, title, imageUrl })
    .returning();

  res.status(201).json(row);
});
