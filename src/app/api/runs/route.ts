import { after, NextResponse } from "next/server";
import { createRun, executeRun } from "@/lib/pipeline";
import { withDemo, withViewerKey } from "@/lib/ai";
import { clearRuns, getRuns } from "@/lib/store";

// Generation with real AI calls can take a few minutes.
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ runs: await getRuns() });
}

/** "지금 실행": start a run immediately and return its id; the work continues after the response. */
export async function POST(req: Request) {
  const runs = await getRuns();
  // A run still marked running after the function time limit was killed mid-flight.
  const active = runs.find((r) => r.status === "running" && Date.now() - new Date(r.createdAt).getTime() < maxDuration * 1000);
  if (active) return NextResponse.json({ id: active.id, alreadyRunning: true });
  // The viewer key (if any) must stay bound while the pipeline runs after the response.
  const keyed = withViewerKey(req);
  // ?demo=1 is the "start demo" button: prepared copy, no API call, whatever keys exist.
  const demo = new URL(req.url).searchParams.has("demo");
  const withKey = <T,>(fn: () => Promise<T>) => (demo ? withDemo(fn) : keyed(fn));
  const run = await withKey(() => createRun("manual"));
  after(() => withKey(() => executeRun(run.id)));
  return NextResponse.json({ id: run.id });
}

/** Clears generation history (demo convenience; also resets the used-topic list). */
export async function DELETE() {
  await clearRuns();
  return NextResponse.json({ ok: true });
}
