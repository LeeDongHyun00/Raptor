import { NextResponse } from "next/server";
import { aiMode, analyzeDifferentiators } from "@/lib/ai";
import { getWorkspace, saveWorkspace } from "@/lib/store";

export const maxDuration = 300;

/** Reads the uploaded proposal/manual and (re)builds the differentiator cards. */
export async function POST() {
  try {
    const ws = await getWorkspace();
    const hasRealDocs = ws.materials.some((m) => m.kind === "doc" && !m.demo);
    const differentiators = await analyzeDifferentiators(ws);
    const fresh = await getWorkspace();
    fresh.differentiators = differentiators;
    fresh.analyzedAt = new Date().toISOString();
    fresh.analysisMode = aiMode === "live" && hasRealDocs ? "live" : "demo";
    await saveWorkspace(fresh);
    return NextResponse.json({ differentiators, mode: fresh.analysisMode });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "분석에 실패했습니다." }, { status: 500 });
  }
}
