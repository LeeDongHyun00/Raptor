import { NextResponse } from "next/server";
import { deleteAsset, getWorkspace, saveWorkspace } from "@/lib/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await getWorkspace();
  ws.materials = ws.materials.filter((m) => m.id !== id);
  await saveWorkspace(ws);
  await deleteAsset(id);
  return NextResponse.json({ ok: true });
}
