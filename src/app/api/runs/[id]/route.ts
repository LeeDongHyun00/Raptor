import { NextResponse } from "next/server";
import type { Blog } from "@/lib/types";
import { getRun, getWorkspace, updateRun } from "@/lib/store";
import { reviewMissions } from "@/lib/ai";
import { buildReview } from "@/lib/review";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const run = await getRun((await params).id);
  return run ? NextResponse.json({ run }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

/** Human sign-off: approve or reject a run waiting in the queue (or reopen a decided one). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as { status?: string; blog?: Blog };
  if (body.blog) return saveEditedBlog(id, body.blog);
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

/** A person edited the blog copy: store it and review it again so the checklist stays truthful. */
async function saveEditedBlog(id: string, input: Blog) {
  const current = await getRun(id);
  if (!current?.blog) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (current.status === "running") return NextResponse.json({ error: "생성이 끝난 뒤에 수정할 수 있습니다." }, { status: 409 });
  const text = (v: unknown, max: number) => String(v ?? "").slice(0, max);
  // Only wording may change; structure and screenshot placement come from the stored version.
  const blog: Blog = {
    ...current.blog,
    title: text(input.title, 200),
    sections: current.blog.sections.map((s, i) => ({
      ...s,
      heading: text(input.sections?.[i]?.heading ?? s.heading, 200),
      paragraphs: (Array.isArray(input.sections?.[i]?.paragraphs) ? input.sections[i].paragraphs : s.paragraphs).slice(0, 12).map((p) => text(p, 3000)).filter((p) => p.trim()),
    })),
  };
  const ws = await getWorkspace();
  const review = buildReview(ws.guideline, blog, current.cards, await reviewMissions(ws.guideline, blog), current.channels, current.vocItem?.quotes ?? []);
  const run = await updateRun(id, (r) => { r.blog = blog; r.review = review; r.editedAt = new Date().toISOString(); });
  return NextResponse.json({ run });
}
