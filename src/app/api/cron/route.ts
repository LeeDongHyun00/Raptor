import { NextResponse } from "next/server";
import { createRun, executeRun, INTERVAL_DAYS } from "@/lib/pipeline";
import { getRuns } from "@/lib/store";

export const maxDuration = 300;

/**
 * Called weekly by Vercel Cron (cron syntax cannot express "every 2 weeks"),
 * so the biweekly cadence is enforced here against the last run date.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const last = (await getRuns()).find((r) => r.status !== "failed");
  // One day of slack so a run that started a little late does not push the next one out a week.
  const dueAfter = (INTERVAL_DAYS - 1) * 86400000;
  if (last && Date.now() - new Date(last.createdAt).getTime() < dueAfter) {
    return NextResponse.json({ skipped: true, reason: "last run is less than two weeks old", lastRunAt: last.createdAt });
  }
  const run = await createRun("cron");
  await executeRun(run.id);
  return NextResponse.json({ id: run.id });
}
