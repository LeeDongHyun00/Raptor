import type { Blog, Guideline, MaterialKind, PromoInput, PromoResult, Run, Workspace } from "../types";
import { demoPromo } from "../studioDemo";
import { demoBlog, demoCards, demoChannels, demoPlan, demoReviewMissions, demoRevise, demoTopicIndex, sampleNews, sampleTrends } from "../demo";
import { seedShotFile, seedWorkspace } from "../seed";
import { newRun, runPipeline } from "../pipelineCore";
import { blogDocumentHtml } from "../blogHtml";

/**
 * Single data-access layer for the UI. With a server it talks to /api/*;
 * in the static GitHub Pages build it runs the sample pipeline in the browser
 * and keeps state in localStorage, so the full flow can be tried without a backend.
 */

export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface Modes {
  ai: "live" | "demo";
  trend: "live" | "sample";
  storage: "supabase" | "file" | "ephemeral" | "browser";
}

const STATIC_NOTICE = "GitHub Pages 데모에서는 사용할 수 없는 기능입니다. 서버에 배포한 버전에서 이용해 주세요.";

/* ---------- browser-only store ---------- */

// Versioned so state saved by an older build (different sample data) is ignored.
const RUNS_KEY = "trihorn.v2.runs";
const WS_KEY = "trihorn.v2.ws";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked (private mode); the demo then only lives for this page view.
  }
};
// Mirror of localStorage so the demo still works when storage is unavailable.
let memRuns: Run[] | null = null;
const localRuns = (): Run[] => (memRuns ??= read<Run[]>(RUNS_KEY, []));
const saveLocalRuns = (runs: Run[]) => { memRuns = runs; write(RUNS_KEY, runs); };
const localWs = (): Workspace => read<Workspace>(WS_KEY, seedWorkspace());

const localUpdateRun = async (id: string, mutate: (r: Run) => void): Promise<Run> => {
  const runs = localRuns().map((r) => ({ ...r }));
  const run = runs.find((r) => r.id === id);
  if (!run) throw new Error("not found");
  mutate(run);
  saveLocalRuns(runs);
  return run;
};

/* ---------- http helpers ---------- */

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `요청에 실패했습니다 (${res.status})`);
  return body as T;
}
const jsonBody = (method: string, body: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

/* ---------- API ---------- */

export async function getWorkspace(): Promise<{ ws: Workspace; modes: Modes }> {
  if (isStaticDemo) return { ws: localWs(), modes: { ai: "demo", trend: "sample", storage: "browser" } };
  return json("/api/workspace");
}

export async function getRuns(): Promise<Run[]> {
  if (isStaticDemo) return localRuns();
  return (await json<{ runs: Run[] }>("/api/runs")).runs;
}

export async function getRun(id: string): Promise<Run | null> {
  if (isStaticDemo) {
    const run = localRuns().find((r) => r.id === id) ?? null;
    // A reload kills the in-browser pipeline; do not leave that run spinning forever.
    if (run?.status === "running" && Date.now() - new Date(run.createdAt).getTime() > 30000) {
      return localUpdateRun(id, (r) => { r.status = "failed"; r.error = "페이지를 벗어나 생성이 중단되었습니다. 다시 실행해 주세요."; });
    }
    return run;
  }
  try {
    return (await json<{ run: Run }>(`/api/runs/${id}`)).run;
  } catch {
    return null;
  }
}

export async function startRun(): Promise<string> {
  if (!isStaticDemo) return (await json<{ id: string }>("/api/runs", { method: "POST" })).id;
  const run = newRun("manual", "demo", "sample");
  saveLocalRuns([run, ...localRuns()]);
  // Not awaited: the caller navigates to the run page and watches progress there.
  void runPipeline(run.id, {
    stepDelayMs: 700,
    getWorkspace: async () => localWs(),
    saveWorkspace: async (ws) => write(WS_KEY, ws),
    getRuns: async () => localRuns(),
    updateRun: localUpdateRun,
    collectTrends: async () => ({ trends: sampleTrends, news: sampleNews, mode: "sample" }),
    describeScreenshots: async () => ({}),
    planTopic: async ({ usedTopics }) => demoPlan(usedTopics),
    writeBlog: async (_ws, plan) => demoBlog(plan),
    writeCards: async (ws, plan) => demoCards(plan, ws),
    writeChannels: async ({ ws, plan }) => demoChannels(plan, ws),
    reviewMissions: async (g, blog) => demoReviewMissions(g, blog),
    reviseBlog: async ({ plan, blog, sectionIndexes }) => demoRevise(plan, blog, sectionIndexes),
  });
  return run.id;
}

export async function decideRun(id: string, status: "approved" | "rejected" | "pending"): Promise<Run> {
  if (isStaticDemo) {
    return localUpdateRun(id, (r) => { r.status = status; r.decidedAt = status === "pending" ? undefined : new Date().toISOString(); });
  }
  return (await json<{ run: Run }>(`/api/runs/${id}`, jsonBody("PATCH", { status }))).run;
}

export async function clearRuns(): Promise<void> {
  if (isStaticDemo) return saveLocalRuns([]);
  await json("/api/runs", { method: "DELETE" });
}

export async function uploadMaterial(kind: MaterialKind, file: File): Promise<void> {
  if (isStaticDemo) throw new Error(STATIC_NOTICE);
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  const res = await fetch(`${BASE}/api/materials`, { method: "POST", body: form });
  if (!res.ok) {
    const msg = res.status === 413 ? "파일은 4MB 이하만 올릴 수 있습니다." : (await res.json().catch(() => ({}))).error;
    throw new Error(msg ?? "업로드에 실패했습니다.");
  }
}

export async function removeMaterial(id: string): Promise<void> {
  if (isStaticDemo) throw new Error(STATIC_NOTICE);
  await json(`/api/materials/${id}`, { method: "DELETE" });
}

export async function saveGuideline(g: Omit<Guideline, "source">): Promise<void> {
  if (isStaticDemo) {
    const ws = localWs();
    ws.guideline = { ...g, source: ws.guideline.source.includes("직접 수정") ? ws.guideline.source : `${ws.guideline.source} · 직접 수정` };
    return write(WS_KEY, ws);
  }
  await json("/api/guideline", jsonBody("PUT", g));
}

export async function analyze(): Promise<void> {
  if (isStaticDemo) throw new Error(STATIC_NOTICE);
  await json("/api/analyze", { method: "POST" });
}

/**
 * Promo studio: one request, nothing stored. On GitHub Pages there is no server, so the
 * browser calls the API with the viewer's own key, or shows a sample without one.
 */
export async function generatePromo(input: PromoInput, docs: File[], photos: File[], apiKey?: string): Promise<PromoResult> {
  if (isStaticDemo) {
    if (apiKey) {
      // Loaded on demand so the SDK is not in the bundle for visitors who never generate.
      const { generatePromoInBrowser } = await import("./studioBrowser");
      return generatePromoInBrowser(apiKey, input, docs, photos);
    }
    // Short pause so the sample result does not look like a cached page.
    await new Promise((r) => setTimeout(r, 600));
    return demoPromo(input, photos.length);
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(input)) form.set(k, v);
  docs.forEach((f) => form.append("doc", f));
  photos.forEach((f) => form.append("photo", f));
  const res = await fetch(`${BASE}/api/studio`, { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(res.status === 413 ? "문서와 사진을 합쳐 4MB 이하로 올려 주세요." : (body as { error?: string }).error ?? "생성에 실패했습니다.");
  }
  return (body as { result: PromoResult }).result;
}

/* ---------- URLs for images and downloads ---------- */

export function assetUrl(id: string): string {
  // Preloaded screenshots are static files, so they need no server round-trip.
  const file = seedShotFile(id);
  return file ? `${BASE}/product-shots/${file}` : `${BASE}/api/assets/${id}`;
}

export function cardUrl(run: Run, index: number, download = false): string {
  // The static site cannot render PNGs on demand; sample topics ship pre-rendered.
  if (isStaticDemo) return `${BASE}/demo-cards/${demoTopicIndex(run.plan?.topic ?? "")}/${index}.png`;
  return `${BASE}/api/runs/${run.id}/cards/${index}${download ? "?download" : ""}`;
}

export function bannerUrl(run: Run, index: number, download = false): string {
  if (isStaticDemo) return `${BASE}/demo-cards/${demoTopicIndex(run.plan?.topic ?? "")}/banner-${index}.png`;
  return `${BASE}/api/runs/${run.id}/banners/${index}${download ? "?download" : ""}`;
}

export function blogExportUrl(run: Run): string | null {
  return isStaticDemo ? null : `${BASE}/api/runs/${run.id}/blog`;
}

/** Client-side HTML export, used where there is no server route to build the file. */
export async function downloadBlogHtml(run: Run, blog: Blog, disclosure: string) {
  // Inline the images so the exported file works on its own.
  const uris: Record<string, string> = {};
  for (const id of new Set(blog.sections.map((s) => s.screenshotId).filter((x): x is string => !!x && !!seedShotFile(x)))) {
    const blob = await (await fetch(assetUrl(id))).blob();
    uris[id] = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  downloadHtml(`blog-${run.id}.html`, blogDocumentHtml(disclosure, blog, (id) => uris[id] ?? null));
}

export function downloadHtml(filename: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
