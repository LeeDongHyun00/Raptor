import { NextResponse } from "next/server";
import { extractPptxText } from "@/lib/docs";
import Anthropic from "@anthropic-ai/sdk";
import { generatePromo } from "@/lib/studio";
import { promoErrorMessage, type StudioDoc, type StudioPhoto } from "@/lib/studioCore";

export const maxDuration = 300;

// Vercel rejects request bodies above ~4.5 MB; photos are downscaled in the browser to fit.
const MAX_TOTAL = 4 * 1024 * 1024;
const MAX_PHOTOS = 6;
const PHOTO_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";
const field = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

/** One-shot: product document + photos in, differentiators and promo copy out. Nothing is stored. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "업로드한 내용을 읽지 못했습니다. 파일 크기를 확인해 주세요." }, { status: 400 });
  }

  const input = {
    name: field(form, "name", 60),
    company: field(form, "company", 60),
    summary: field(form, "summary", 200),
    audience: field(form, "audience", 100),
  };
  if (!input.name) return NextResponse.json({ error: "제품명을 입력해 주세요." }, { status: 400 });

  const docFiles = form.getAll("doc").filter((f): f is File => f instanceof File && f.size > 0);
  const photoFiles = form.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (docFiles.length === 0) return NextResponse.json({ error: "제품 문서를 하나 이상 올려 주세요." }, { status: 400 });
  if (photoFiles.length > MAX_PHOTOS) return NextResponse.json({ error: `사진은 ${MAX_PHOTOS}장까지 올릴 수 있습니다.` }, { status: 400 });
  const total = [...docFiles, ...photoFiles].reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL) return NextResponse.json({ error: "문서와 사진을 합쳐 4MB 이하로 올려 주세요." }, { status: 413 });

  try {
    const docs: StudioDoc[] = [];
    for (const f of docFiles) {
      const e = ext(f.name);
      const buf = Buffer.from(await f.arrayBuffer());
      if (e === "pdf") docs.push({ name: f.name, kind: "pdf", data: buf.toString("base64") });
      else if (e === "pptx") docs.push({ name: f.name, kind: "text", text: await extractPptxText(buf) });
      else if (e === "txt" || e === "md") docs.push({ name: f.name, kind: "text", text: buf.toString("utf8") });
      else return NextResponse.json({ error: `${f.name}: 문서는 PDF, PPTX, TXT, MD만 올릴 수 있습니다.` }, { status: 400 });
    }
    if (docs.every((d) => d.kind === "text" && !d.text.trim())) {
      return NextResponse.json({ error: "문서에서 읽을 수 있는 내용이 없습니다." }, { status: 400 });
    }

    const photos: StudioPhoto[] = [];
    for (const f of photoFiles) {
      const mime = PHOTO_MIMES.find((m) => m === f.type);
      if (!mime) return NextResponse.json({ error: `${f.name}: 사진은 PNG, JPG, WEBP, GIF만 올릴 수 있습니다.` }, { status: 400 });
      photos.push({ mime, data: Buffer.from(await f.arrayBuffer()).toString("base64") });
    }

    return NextResponse.json({ result: await generatePromo(input, docs, photos) });
  } catch (err) {
    const status = err instanceof Anthropic.APIError && err.status === 429 ? 429 : 500;
    return NextResponse.json({ error: promoErrorMessage(err) }, { status });
  }
}
