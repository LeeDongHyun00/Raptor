import { promises as fs } from "fs";
import path from "path";
import type { Run, Workspace } from "./types";
import { seedShotFile, seedWorkspace } from "./seed";

/**
 * Tiny key/value document store with two backends:
 * - Supabase (table trihorn_kv) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * - a local JSON directory otherwise, so the app runs with zero setup
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const storageMode: "supabase" | "file" = SUPABASE_URL && SUPABASE_KEY ? "supabase" : "file";

// Vercel's filesystem is read-only except /tmp; data there does not survive cold starts.
const DATA_DIR = process.env.VERCEL ? "/tmp/trihorn-data" : path.join(process.cwd(), ".data");
export const storageIsEphemeral = storageMode === "file" && !!process.env.VERCEL;

function fileFor(key: string) {
  return path.join(DATA_DIR, encodeURIComponent(key) + ".json");
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (storageMode === "supabase") {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/trihorn_kv?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Supabase read failed (${res.status}): ${await res.text()}`);
    const rows = (await res.json()) as { value: T }[];
    return rows[0]?.value ?? null;
  }
  try {
    return JSON.parse(await fs.readFile(fileFor(key), "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  if (storageMode === "supabase") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trihorn_kv`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Supabase write failed (${res.status}): ${await res.text()}`);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Write-then-rename so a poll that reads mid-write never sees a truncated file.
  const tmp = fileFor(key) + `.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value));
  await fs.rename(tmp, fileFor(key));
}

async function kvDelete(key: string): Promise<void> {
  if (storageMode === "supabase") {
    await fetch(`${SUPABASE_URL}/rest/v1/trihorn_kv?key=eq.${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    return;
  }
  await fs.rm(fileFor(key), { force: true });
}

export async function getWorkspace(): Promise<Workspace> {
  return (await kvGet<Workspace>("workspace")) ?? seedWorkspace();
}

export async function saveWorkspace(ws: Workspace): Promise<void> {
  await kvSet("workspace", ws);
}

export async function getRuns(): Promise<Run[]> {
  return (await kvGet<Run[]>("runs")) ?? [];
}

export async function getRun(id: string): Promise<Run | null> {
  return (await getRuns()).find((r) => r.id === id) ?? null;
}

// Serialize read-modify-write cycles within this process so a status change
// (approve) cannot be overwritten by a concurrent pipeline progress update.
let runsLock: Promise<unknown> = Promise.resolve();

export function updateRun(id: string, mutate: (run: Run) => void): Promise<Run> {
  const next = runsLock.then(async () => {
    const runs = await getRuns();
    const run = runs.find((r) => r.id === id);
    if (!run) throw new Error(`Run ${id} not found`);
    mutate(run);
    await kvSet("runs", runs);
    return run;
  });
  runsLock = next.catch(() => undefined);
  return next;
}

export function addRun(run: Run): Promise<void> {
  const next = runsLock.then(async () => {
    const runs = await getRuns();
    runs.unshift(run);
    await kvSet("runs", runs);
  });
  runsLock = next.catch(() => undefined);
  return next;
}

export interface Asset {
  mime: string;
  /** base64 */
  data: string;
}

export async function getAsset(id: string): Promise<Asset | null> {
  // Preloaded screenshots ship as static files instead of living in the store.
  const file = seedShotFile(id);
  if (file) {
    const data = await fs.readFile(path.join(process.cwd(), "public/product-shots", file));
    return { mime: "image/jpeg", data: data.toString("base64") };
  }
  return kvGet<Asset>(`asset:${id}`);
}

export async function saveAsset(id: string, asset: Asset): Promise<void> {
  await kvSet(`asset:${id}`, asset);
}

export async function deleteAsset(id: string): Promise<void> {
  await kvDelete(`asset:${id}`);
}

export { newId } from "./pipelineCore";
export function clearRuns(): Promise<void> {
  const next = runsLock.then(() => kvDelete("runs"));
  runsLock = next.catch(() => undefined);
  return next;
}
