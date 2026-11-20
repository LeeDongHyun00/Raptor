import { NextResponse } from "next/server";
import type { Material, MaterialKind } from "@/lib/types";
import { getWorkspace, newId, saveAsset, saveWorkspace } from "@/lib/store";
import { extractPptxText, parseGuidelineXlsx } from "@/lib/docs";

// Vercel rejects request bodies above ~4.5 MB, so cap uploads below that.
const MAX_BYTES = 4 * 1024 * 1024;

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export async function POST(req: Request) {
  const form = await req.formData();
  const kind = form.get("kind") as MaterialKind;
  const file = form.get("file");
  if (!(file instanceof File) || !["doc", "screenshot", "guideline"].includes(kind)) {
    return NextResponse.json({ error: "파일과 종류를 확인해 주세요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "파일은 4MB 이하만 올릴 수 있습니다." }, { status: 413 });
  }
  const e = ext(file.name);
  const allowed = { doc: ["pdf", "pptx"], screenshot: ["png", "jpg", "jpeg", "webp"], guideline: ["xlsx", "xls"] }[kind];
  if (!allowed.includes(e)) {
    return NextResponse.json({ error: `이 항목에는 ${allowed.join(", ")} 파일만 올릴 수 있습니다.` }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const ws = await getWorkspace();

  try {
    if (kind === "guideline") {
      ws.guideline = parseGuidelineXlsx(buf, file.name);
      ws.materials = ws.materials.filter((m) => m.kind !== "guideline");
    }
    const mime = e === "pdf" ? "application/pdf" : e === "jpg" || e === "jpeg" ? "image/jpeg" : e === "png" ? "image/png" : e === "webp" ? "image/webp" : file.type || "application/octet-stream";
    const material: Material = {
      id: newId(kind === "screenshot" ? "shot" : kind === "doc" ? "doc" : "guide"),
      kind, name: file.name, mime, size: file.size, uploadedAt: new Date().toISOString(),
    };
    if (e === "pptx") material.text = await extractPptxText(buf);
    if (e === "pdf" || kind === "screenshot") await saveAsset(material.id, { mime, data: buf.toString("base64") });
    // The first real upload of a kind replaces the sample entries of that kind.
    ws.materials = ws.materials.filter((m) => !(m.demo && m.kind === kind));
    ws.materials.push(material);
    await saveWorkspace(ws);
    return NextResponse.json({ material, guideline: kind === "guideline" ? ws.guideline : undefined });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "파일을 처리하지 못했습니다." }, { status: 400 });
  }
}
