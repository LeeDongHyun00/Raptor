import type { Blog, Guideline, Material, MaterialKind, ProductionSettings, PromoInput, PromoResult, Run, Workspace } from "../types";
import { demoPromo } from "../studioDemo";
import { demoBlog, demoCards, demoChannels, demoPlan, demoReviewMissions, demoRevise, sampleNews, sampleTrends, sampleVoc } from "../demo";
import { seedShotFile, seedWorkspace } from "../seed";
import { newId, newRun, runPipeline } from "../pipelineCore";
import { blogDocumentHtml } from "../blogHtml";
import { buildReview } from "../review";
import { resolveSettings } from "../settings";
import type { AnalysisDoc } from "../aiCore";
import { heuristicSuggestions, type EditSuggestion } from "../suggestRules";
import { loadStoredKey } from "./apiKeyStore";
import { contentOf, getAt, labelOf, mergeText, type RunContent } from "../content";

/**
 * Single data-access layer for the UI. With a server it talks to /api/*;
 * in the static GitHub Pages build it runs the sample pipeline in the browser
 * and keeps state in localStorage, so the full flow can be tried without a backend.
 */

export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface Modes {
  /** Effective mode for this viewer: live when the server has a key or the viewer entered one. */
  ai: "live" | "demo";
  /** The deployment itself holds a key, so the viewer does not need to enter one. */
  serverKey: boolean;
  trend: "live" | "sample";
  storage: "supabase" | "file" | "ephemeral" | "browser";
}

const STATIC_NOTICE = "데모 버전에서는 사용할 수 없는 기능입니다.";

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

/** The viewer's key travels with each request so a server without its own key can use it. */
const keyHeader = (): Record<string, string> => {
  const key = loadStoredKey();
  return key ? { "x-anthropic-key": key } : {};
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init, headers: { ...keyHeader(), ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `요청에 실패했습니다 (${res.status})`);
  return body as T;
}
const jsonBody = (method: string, body: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

/* ---------- API ---------- */

export async function getWorkspace(): Promise<{ ws: Workspace; modes: Modes }> {
  const hasKey = !!loadStoredKey();
  if (isStaticDemo) return { ws: localWs(), modes: { ai: hasKey ? "live" : "demo", serverKey: false, trend: "sample", storage: "browser" } };
  const res = await json<{ ws: Workspace; modes: Omit<Modes, "serverKey"> }>("/api/workspace");
  const serverKey = res.modes.ai === "live";
  return { ws: res.ws, modes: { ...res.modes, serverKey, ai: serverKey || hasKey ? "live" : "demo" } };
}

export async function getRuns(): Promise<Run[]> {
  if (isStaticDemo) return localRuns();
  return (await json<{ runs: Run[] }>("/api/runs")).runs;
}

export async function getRun(id: string): Promise<Run | null> {
  if (isStaticDemo) {
    const run = localRuns().find((r) => r.id === id) ?? null;
    // A reload kills the in-browser pipeline; do not leave that run spinning forever.
    if (run?.status === "running" && !activeRuns.has(id)) {
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

// Runs whose pipeline is executing in this page; anything else still marked "running" was interrupted.
const activeRuns = new Set<string>();

/**
 * Points the AI engine at the viewer's key so the same pipeline the server runs can run here.
 * Loaded on demand: the SDK and prompts stay out of the bundle until a key is actually used.
 */
async function browserEngine(apiKey: string) {
  const [engine, { default: Anthropic }] = await Promise.all([import("../aiEngine"), import("@anthropic-ai/sdk")]);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  engine.setAiContext({
    client: () => client,
    live: () => true,
    getAsset: async (id) => {
      const file = seedShotFile(id);
      const blob = file
        ? await fetch(`${BASE}/product-shots/${file}`).then((r) => (r.ok ? r.blob() : undefined))
        : isStaticDemo ? await (await import("./fileStore")).getFile(id) : await fetch(`${BASE}/api/assets/${id}`).then((r) => (r.ok ? r.blob() : undefined));
      return blob ? { mime: blob.type || "application/octet-stream", data: await blobToBase64(blob) } : null;
    },
  });
  return engine;
}

/** Starts a run. `demo` forces the prepared copy even when an API key is available. */
export async function startRun(demo = false): Promise<string> {
  if (!isStaticDemo) return (await json<{ id: string }>(`/api/runs${demo ? "?demo=1" : ""}`, { method: "POST" })).id;
  const key = demo ? "" : loadStoredKey();
  const run = newRun("manual", key ? "live" : "demo", "sample");
  saveLocalRuns([run, ...localRuns()]);
  activeRuns.add(run.id);
  const store = {
    getWorkspace: async () => localWs(),
    saveWorkspace: async (ws: Workspace) => write(WS_KEY, ws),
    getRuns: async () => localRuns(),
    updateRun: localUpdateRun,
    // Naver's APIs need a server-side secret, so the browser always works from the sample trends.
    collectTrends: async () => ({ trends: sampleTrends, news: sampleNews, mode: "sample" as const }),
  };
  // Not awaited: the caller navigates to the run page and watches progress there.
  void (async () => {
    try {
      if (key) {
        const ai = await browserEngine(key);
        await runPipeline(run.id, {
          ...store, describeScreenshots: ai.describeScreenshots, planTopic: ai.planTopic, writeBlog: ai.writeBlog, writeCards: ai.writeCards,
          writeChannels: ai.writeChannels, reviewMissions: ai.reviewMissions, reviseBlog: ai.reviseBlog,
        });
      } else {
        await runPipeline(run.id, {
          ...store,
          stepDelayMs: 700,
          describeScreenshots: async () => ({}),
          planTopic: async ({ usedTopics, voc, usedVocIds }) => demoPlan(usedTopics, voc, usedVocIds),
          writeBlog: async (_ws, plan) => demoBlog(plan),
          writeCards: async (ws, plan) => demoCards(plan, ws),
          writeChannels: async ({ ws, plan }) => demoChannels(plan, ws),
          reviewMissions: async (g, blog) => demoReviewMissions(g, blog),
          reviseBlog: async ({ plan, blog, sectionIndexes }) => demoRevise(plan, blog, sectionIndexes),
        });
      }
    } catch (e) {
      await localUpdateRun(run.id, (r) => { r.status = "failed"; r.error = apiErrorMessage(e); }).catch(() => undefined);
    } finally {
      activeRuns.delete(run.id);
    }
  })();
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

const fileExt = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export async function uploadMaterial(kind: MaterialKind, file: File): Promise<void> {
  if (isStaticDemo) {
    // No server: documents stay in this browser (IndexedDB) and the guideline is parsed right here.
    if (file.size > 4 * 1024 * 1024) throw new Error("파일은 4MB 이하만 올릴 수 있습니다.");
    const ws = localWs();
    const e = fileExt(file.name);
    if (kind === "guideline") {
      if (!["xlsx", "xls"].includes(e)) throw new Error("가이드라인은 엑셀(xlsx) 파일만 올릴 수 있습니다.");
      const { parseGuidelineXlsx } = await import("../docs");
      ws.guideline = parseGuidelineXlsx(new Uint8Array(await file.arrayBuffer()), file.name);
      return write(WS_KEY, ws);
    }
    if (kind !== "doc") throw new Error(STATIC_NOTICE);
    if (!["pdf", "pptx"].includes(e)) throw new Error("이 항목에는 pdf, pptx 파일만 올릴 수 있습니다.");
    const material: Material = {
      id: newId("doc"), kind, name: file.name, mime: e === "pdf" ? "application/pdf" : "application/octet-stream",
      size: file.size, uploadedAt: new Date().toISOString(),
    };
    if (e === "pptx") {
      const { extractPptxText } = await import("../pptx");
      material.text = await extractPptxText(await file.arrayBuffer());
    } else {
      const { putFile } = await import("./fileStore");
      await putFile(material.id, file);
    }
    ws.materials = [...ws.materials.filter((m) => !(m.demo && m.kind === "doc")), material];
    return write(WS_KEY, ws);
  }
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);
  const res = await fetch(`${BASE}/api/materials`, { method: "POST", body: form, headers: keyHeader() });
  if (!res.ok) {
    const msg = res.status === 413 ? "파일은 4MB 이하만 올릴 수 있습니다." : (await res.json().catch(() => ({}))).error;
    throw new Error(msg ?? "업로드에 실패했습니다.");
  }
}

export async function removeMaterial(id: string): Promise<void> {
  if (isStaticDemo) {
    const ws = localWs();
    ws.materials = ws.materials.filter((m) => m.id !== id);
    write(WS_KEY, ws);
    const { deleteFile } = await import("./fileStore");
    return void (await deleteFile(id).catch(() => undefined));
  }
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

/**
 * Turns call summaries into the customer question board. Without a server (or an API key)
 * the fictional sample analysis is stored instead, whatever was pasted.
 */
export async function analyzeVoc(input: { text?: string; file?: File; sample?: boolean }): Promise<void> {
  if (isStaticDemo) {
    const ws = localWs();
    const key = loadStoredKey();
    if (!key || input.sample) {
      ws.voc = sampleVoc;
      return write(WS_KEY, ws);
    }
    // Same order as the server: split into calls, mask personal data, then analyze. Raw text is never stored.
    const { maskPII, splitSummaries } = await import("../voc");
    let summaries: string[];
    if (input.file) {
      const e = fileExt(input.file.name);
      if (e === "xlsx" || e === "xls") summaries = (await import("../docs")).extractSummariesXlsx(new Uint8Array(await input.file.arrayBuffer()));
      else if (e === "csv") summaries = (await input.file.text()).split(/\r?\n/).filter((l) => l.trim().length >= 5);
      else if (e === "txt") summaries = splitSummaries(await input.file.text());
      else throw new Error("TXT, CSV, XLSX 파일만 올릴 수 있습니다.");
    } else {
      summaries = splitSummaries(input.text ?? "");
    }
    if (summaries.length === 0) throw new Error("분석할 통화 요약이 없습니다. 통화마다 빈 줄로 구분해 붙여 넣어 주세요.");
    const masked = summaries.slice(0, 300).map(maskPII);
    try {
      ws.voc = await (await browserEngine(key)).extractVoc(ws, masked, `${input.file ? "파일 업로드" : "통화 요약 붙여넣기"} · ${masked.length}건`);
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
    return write(WS_KEY, ws);
  }
  if (input.file) {
    const form = new FormData();
    form.set("file", input.file);
    const res = await fetch(`${BASE}/api/voc`, { method: "POST", body: form, headers: keyHeader() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "분석에 실패했습니다.");
    return;
  }
  await json("/api/voc", jsonBody("POST", { text: input.text ?? "", sample: !!input.sample }));
}

export async function clearVoc(): Promise<void> {
  if (isStaticDemo) {
    const ws = localWs();
    delete ws.voc;
    return write(WS_KEY, ws);
  }
  await json("/api/voc", { method: "DELETE" });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  // Chunked so large files do not overflow the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const browserClient = async (apiKey: string) => {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  // The viewer's own key, sent only to api.anthropic.com from their browser.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
};

const apiErrorMessage = (e: unknown) => {
  const status = (e as { status?: number })?.status;
  if (status === 401) return "API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.";
  if (status === 429) return "요청 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.";
  // No HTTP status means the request never reached the API.
  if (status === undefined && /connection|network|fetch/i.test(String((e as Error)?.message))) return "Anthropic에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.";
  return e instanceof Error ? e.message : "요청에 실패했습니다.";
};

/**
 * Reads the uploaded product documents and rebuilds the differentiator cards.
 * A server does it itself (with its own key or the viewer's); the static build calls the API from here.
 */
export async function analyze(): Promise<void> {
  if (!isStaticDemo) return void (await json("/api/analyze", { method: "POST" }));
  const apiKey = loadStoredKey();
  if (!apiKey) throw new Error("문서를 분석하려면 먼저 API 키를 입력해 주세요.");
  const ws = localWs();
  const docs: AnalysisDoc[] = [];
  for (const m of ws.materials.filter((x) => x.kind === "doc" && !x.demo)) {
    if (m.text) { docs.push({ name: m.name, kind: "text", text: m.text }); continue; }
    const blob = await (await import("./fileStore")).getFile(m.id);
    if (blob) docs.push({ name: m.name, kind: "pdf", data: await blobToBase64(blob) });
  }
  if (docs.length === 0) throw new Error("분석할 문서가 없습니다. PDF 또는 PPTX 자료를 먼저 올려 주세요.");
  const { requestDifferentiators } = await import("../aiCore");
  let differentiators;
  try {
    differentiators = await requestDifferentiators(await browserClient(apiKey), ws.product, docs);
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
  const fresh = localWs();
  fresh.differentiators = differentiators;
  fresh.analyzedAt = new Date().toISOString();
  fresh.analysisMode = "live";
  write(WS_KEY, fresh);
}

export async function saveSettings(settings: ProductionSettings): Promise<void> {
  if (isStaticDemo) {
    const ws = localWs();
    ws.settings = resolveSettings(settings);
    return write(WS_KEY, ws);
  }
  await json("/api/workspace", jsonBody("PUT", { settings }));
}

/** Saves hand-edited copy (any channel) and returns the run with a fresh review. */
export async function saveContent(run: Run, content: RunContent): Promise<Run> {
  if (!isStaticDemo) return (await json<{ run: Run }>(`/api/runs/${run.id}`, jsonBody("PATCH", { content }))).run;
  const ws = localWs();
  const next = mergeText(contentOf(run), content);
  const key = loadStoredKey();
  let missions = run.review?.missionChecks ?? [];
  if (next.blog) {
    try {
      missions = key ? await (await browserEngine(key)).reviewMissions(ws.guideline, next.blog) : demoReviewMissions(ws.guideline, next.blog);
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
  const review = buildReview(ws.guideline, next.blog, next.cards, missions, next.channels, run.vocItem?.quotes ?? []);
  return localUpdateRun(run.id, (r) => {
    r.blog = next.blog; r.cards = next.cards; r.channels = next.channels; r.review = review; r.editedAt = new Date().toISOString();
  });
}

/** Rewrite directions for a selected passage: AI when a key is available, generic advice otherwise. */
export async function suggestEdits(run: Run, path: string, selection: string): Promise<{ suggestions: EditSuggestion[]; mode: "live" | "demo" }> {
  if (!isStaticDemo) return json("/api/suggest", jsonBody("POST", { runId: run.id, path, selection }));
  const key = loadStoredKey();
  const value = getAt(contentOf(run), path);
  if (!key || value === undefined) return { suggestions: heuristicSuggestions(selection), mode: "demo" };
  const ws = localWs();
  const { requestSuggestions } = await import("../aiCore");
  try {
    const suggestions = await requestSuggestions(await browserClient(key), {
      selection, paragraph: value, heading: labelOf(path), topic: run.plan?.topic ?? run.blog?.title ?? "",
      audience: resolveSettings(run.settings ?? ws.settings).audience, keywords: ws.guideline.requiredKeywords.map((k) => k.keyword),
    });
    return { suggestions, mode: "live" };
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
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

/** Server-rendered image routes. The static build has no server and draws these on a canvas instead (images.ts). */
export function cardUrl(run: Run, index: number, download = false): string {
  return `${BASE}/api/runs/${run.id}/cards/${index}?v=${encodeURIComponent(run.editedAt ?? "0")}${download ? "&download" : ""}`;
}

export function bannerUrl(run: Run, index: number, download = false): string {
  return `${BASE}/api/runs/${run.id}/banners/${index}?v=${encodeURIComponent(run.editedAt ?? "0")}${download ? "&download" : ""}`;
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
