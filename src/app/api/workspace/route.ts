import { NextResponse } from "next/server";
import type { Differentiator, ProductionSettings } from "@/lib/types";
import { getWorkspace, saveWorkspace, storageIsEphemeral, storageMode } from "@/lib/store";
import { resolveSettings } from "@/lib/settings";
import { serverAiMode } from "@/lib/ai";
import { trendMode } from "@/lib/trends";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ws: await getWorkspace(),
    modes: { ai: serverAiMode, trend: trendMode, storage: storageIsEphemeral ? "ephemeral" : storageMode },
  });
}

const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

/**
 * Saves production settings, or differentiators that were analyzed in the browser
 * with the viewer's own key (deployments without a server key).
 */
export async function PUT(req: Request) {
  const body = (await req.json()) as { settings?: Partial<ProductionSettings>; differentiators?: Differentiator[] };
  const ws = await getWorkspace();
  if (body.settings) ws.settings = resolveSettings(body.settings);
  if (Array.isArray(body.differentiators)) {
    // Stored and later rendered, so every field is coerced and bounded rather than trusted.
    ws.differentiators = body.differentiators.slice(0, 8).map((d, i) => ({
      id: /^[\w-]{1,40}$/.test(String(d.id)) ? String(d.id) : `d_${Date.now().toString(36)}_${i}`,
      title: str(d.title, 80), plain: str(d.plain, 300), conventional: str(d.conventional, 400), ours: str(d.ours, 400),
      evidence: (Array.isArray(d.evidence) ? d.evidence : []).slice(0, 4).map((e) => ({
        doc: str(e.doc, 160), page: Math.max(0, Math.floor(Number(e.page)) || 0), quote: str(e.quote, 300),
      })),
    }));
    ws.analyzedAt = new Date().toISOString();
    ws.analysisMode = "live";
  }
  await saveWorkspace(ws);
  return NextResponse.json({ ws });
}
