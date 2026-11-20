import { NextResponse } from "next/server";
import { getRun, updateRun } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const run = await getRun((await params).id);
  return run ? NextResponse.json({ run }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

/** Human sign-off: approve or reject a run waiting in the queue (or reopen a decided one). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { status } = (await req.json()) as { status?: string };
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
