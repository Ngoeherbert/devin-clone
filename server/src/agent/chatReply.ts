import type { Content } from "@google/genai";
import { getGeminiClient, GEMINI_MODEL } from "./gemini.js";

const SYSTEM_INSTRUCTION =
  "You are a helpful, concise assistant having a plain conversation — no tools, no code execution.";

export interface ReplyMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateChatReply(history: ReplyMessage[]): Promise<string> {
  const ai = getGeminiClient();

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });

  return response.text ?? "I'm not sure how to respond to that.";
}
