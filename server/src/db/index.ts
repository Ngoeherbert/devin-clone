import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

/**
 * Use Neon's HTTP driver for the long-running local Express process.
 *
 * The WebSocket-backed `neon-serverless` Pool is intended for short-lived
 * serverless/edge request lifecycles. In local `npm run dev`, the shared Pool
 * can surface opaque `ErrorEvent` failures during Better Auth's OAuth state
 * lookup, which redirects users to `/api/auth/error?error=internal_server_error`.
 * HTTP queries avoid that WebSocket state and are enough for Better Auth here
 * because the Drizzle adapter does not require transactions by default.
 */
export const db = drizzle(process.env.DATABASE_URL, { schema });
