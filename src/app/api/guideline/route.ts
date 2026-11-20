import { NextResponse } from "next/server";
import type { Guideline } from "@/lib/types";
import { getWorkspace, saveWorkspace } from "@/lib/store";

/** Manual edits to the guideline from the materials page. */
export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<Guideline>;
  const ws = await getWorkspace();
  const clean = (xs: unknown) => (Array.isArray(xs) ? xs.map((x) => String(x).trim()).filter(Boolean) : []);
  ws.guideline = {
    source: ws.guideline.source.includes("직접 수정") ? ws.guideline.source : `${ws.guideline.source} · 직접 수정`,
    requiredKeywords: (Array.isArray(body.requiredKeywords) ? body.requiredKeywords : [])
      .map((k) => ({ keyword: String(k.keyword ?? "").trim(), minCount: Math.max(1, Math.floor(Number(k.minCount)) || 1) }))
      .filter((k) => k.keyword),
    missions: clean(body.missions),
    structure: clean(body.structure),
    minChars: Math.max(0, Math.floor(Number(body.minChars)) || 0),
  };
  await saveWorkspace(ws);
  return NextResponse.json({ guideline: ws.guideline });
}
