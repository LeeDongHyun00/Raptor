import { NextResponse } from "next/server";
import { getWorkspace, storageIsEphemeral, storageMode } from "@/lib/store";
import { aiMode } from "@/lib/ai";
import { trendMode } from "@/lib/trends";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ws: await getWorkspace(),
    modes: { ai: aiMode, trend: trendMode, storage: storageIsEphemeral ? "ephemeral" : storageMode },
  });
}
