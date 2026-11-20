import { NextResponse } from "next/server";
import { aiMode, suggestEdits, withViewerKey } from "@/lib/ai";
import { getRun, getWorkspace } from "@/lib/store";
import { resolveSettings } from "@/lib/settings";
import { contentOf, getAt, labelOf } from "@/lib/content";

/** Rewrite directions for a passage the reviewer selected in a blog draft. */
export function POST(req: Request) {
  return withViewerKey(req)(() => handle(req));
}

async function handle(req: Request) {
  try {
    const { runId, path, selection } = (await req.json()) as { runId?: string; path?: string; selection?: string };
    const run = await getRun(String(runId));
    const value = run ? getAt(contentOf(run), String(path)) : undefined;
    const text = String(selection ?? "").trim().slice(0, 1500);
    if (!run || value === undefined || text.length < 2) return NextResponse.json({ error: "선택한 부분을 찾지 못했습니다." }, { status: 400 });
    const ws = await getWorkspace();
    const suggestions = await suggestEdits({
      selection: text,
      paragraph: value,
      heading: labelOf(String(path)),
      topic: run.plan?.topic ?? run.blog?.title ?? "",
      audience: resolveSettings(run.settings ?? ws.settings).audience,
      keywords: ws.guideline.requiredKeywords.map((k) => k.keyword),
    });
    return NextResponse.json({ suggestions, mode: aiMode() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "추천을 받지 못했습니다." }, { status: 500 });
  }
}
