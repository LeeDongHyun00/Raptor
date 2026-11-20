import { NextResponse } from "next/server";
import { aiMode, suggestEdits } from "@/lib/ai";
import { getRun, getWorkspace } from "@/lib/store";
import { resolveSettings } from "@/lib/settings";

/** Rewrite directions for a passage the reviewer selected in a blog draft. */
export async function POST(req: Request) {
  try {
    const { runId, selection, sectionIndex, paragraphIndex } = (await req.json()) as {
      runId?: string; selection?: string; sectionIndex?: number; paragraphIndex?: number;
    };
    const run = await getRun(String(runId));
    const section = run?.blog?.sections[Number(sectionIndex)];
    const text = String(selection ?? "").trim().slice(0, 1500);
    if (!run?.blog || !section || text.length < 2) return NextResponse.json({ error: "선택한 부분을 찾지 못했습니다." }, { status: 400 });
    const ws = await getWorkspace();
    const suggestions = await suggestEdits({
      selection: text,
      paragraph: section.paragraphs[Number(paragraphIndex)] ?? section.heading,
      heading: section.heading,
      topic: run.plan?.topic ?? run.blog.title,
      audience: resolveSettings(run.settings ?? ws.settings).audience,
      keywords: ws.guideline.requiredKeywords.map((k) => k.keyword),
    });
    return NextResponse.json({ suggestions, mode: aiMode });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "추천을 받지 못했습니다." }, { status: 500 });
  }
}
