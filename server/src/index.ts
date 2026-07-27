import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { chatsRouter } from "./routes/chats.js";
import { libraryRouter } from "./routes/library.js";
import { integrationsRouter } from "./routes/integrations.js";
import { billingRouter, billingWebhookRouter } from "./routes/billing.js";
import { startPreviewReaper } from "./agent/previewRegistry.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

// Better-auth owns /api/auth/** — mount it BEFORE express.json(),
// it parses the request body itself. Express 5 requires a named wildcard.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe's webhook needs the raw request body to verify the signature, so its
// route is mounted before express.json() — the rest of billing goes through normally.
app.use("/api/billing", billingWebhookRouter);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/chats", chatsRouter);
app.use("/api/library", libraryRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/billing", billingRouter);

// Catches errors thrown (or rejected promises) from any route above — Express 5
// forwards async errors here automatically. Without this, failures like a
// down database or a failed Stripe call leak a stack trace to the client.
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : "Something went wrong";
    res.status(500).json({ error: message });
  }
);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startPreviewReaper();
});
