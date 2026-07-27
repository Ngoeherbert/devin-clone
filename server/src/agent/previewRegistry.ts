import { rm } from "fs/promises";

interface PreviewEntry {
  dir: string;
  pid?: number;
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const registry = new Map<string, PreviewEntry>();

async function reap(runId: string, entry: PreviewEntry) {
  if (entry.pid) {
    try {
      process.kill(-entry.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
  await rm(entry.dir, { recursive: true, force: true }).catch(() => {});
  registry.delete(runId);
}

/** Call when a run leaves a dev server + workspace running for a Browser tab preview. */
export function registerPreview(runId: string, dir: string, pid?: number): void {
  registry.set(runId, { dir, pid, expiresAt: Date.now() + TTL_MS });
}

/** Resets a preview's TTL — call this if the run is revisited/still in use. */
export function touchPreview(runId: string): void {
  const entry = registry.get(runId);
  if (entry) entry.expiresAt = Date.now() + TTL_MS;
}

/** Immediately tears down a preview (e.g. the user explicitly stopped it or started a new run). */
export async function stopPreview(runId: string): Promise<void> {
  const entry = registry.get(runId);
  if (entry) await reap(runId, entry);
}

let sweeping = false;
export function startPreviewReaper(): void {
  if (sweeping) return;
  sweeping = true;
  setInterval(() => {
    const now = Date.now();
    for (const [runId, entry] of registry) {
      if (entry.expiresAt < now) void reap(runId, entry);
    }
  }, SWEEP_INTERVAL_MS).unref();
}
