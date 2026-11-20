import { NextResponse } from "next/server";
import { contentOf, mergeText, type RunContent } from "@/lib/content";
import { getRun, getWorkspace, updateRun } from "@/lib/store";
import { reviewMissions, withViewerKey } from "@/lib/ai";
import { buildReview } from "@/lib/review";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const run = await getRun((await params).id);
  return run ? NextResponse.json({ run }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

/** Human sign-off: approve or reject a run waiting in the queue (or reopen a decided one). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as { status?: string; content?: RunContent };
  if (body.content) return withViewerKey(req)(() => saveEdited(id, body.content!));
  const { status } = body;
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const current = await getRun(id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (current.status === "running" || current.status === "failed") {
    return NextResponse.json({ error: "생성이 끝난 결과물만 승인하거나 반려할 수 있습니다." }, { status: 409 });
  }
  const run = await updateRun(id, (r) => {
    r.status = status;
    r.decidedAt = status === "pending" ? undefined : new Date().toISOString();
  });
  return NextResponse.json({ run });
}

/** A person edited the copy: store the new wording and review it again so the checklist stays truthful. */
async function saveEdited(id: string, input: RunContent) {
  const current = await getRun(id);
  if (!current?.review) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (current.status === "running") return NextResponse.json({ error: "생성이 끝난 뒤에 수정할 수 있습니다." }, { status: 409 });
  const next = mergeText(contentOf(current), input);
  const ws = await getWorkspace();
  const missions = next.blog ? await reviewMissions(ws.guideline, next.blog) : [];
  const review = buildReview(ws.guideline, next.blog, next.cards, missions, next.channels, current.vocItem?.quotes ?? []);
  const run = await updateRun(id, (r) => {
    r.blog = next.blog; r.cards = next.cards; r.channels = next.channels;
    r.review = review; r.editedAt = new Date().toISOString();
  });
  return NextResponse.json({ run });
}
