import Anthropic from "@anthropic-ai/sdk";
import type { PromoInput, PromoResult } from "../types";
import { extractPptxText } from "../pptx";
import { promoErrorMessage, requestPromo, type StudioDoc, type StudioPhoto } from "../studioCore";

/**
 * Direct browser -> Anthropic API path for the static GitHub Pages build, which has no server
 * to hold a key. The viewer brings their own key; it never leaves their browser except to
 * api.anthropic.com, and nothing is baked into the published site.
 */

const PHOTO_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

async function toBase64(f: Blob): Promise<string> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  // Chunked so large files do not overflow the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export async function generatePromoInBrowser(apiKey: string, input: PromoInput, docFiles: File[], photoFiles: File[]): Promise<PromoResult> {
  const docs: StudioDoc[] = [];
  for (const f of docFiles) {
    const e = ext(f.name);
    if (e === "pdf") docs.push({ name: f.name, kind: "pdf", data: await toBase64(f) });
    else if (e === "pptx") docs.push({ name: f.name, kind: "text", text: await extractPptxText(await f.arrayBuffer()) });
    else if (e === "txt" || e === "md") docs.push({ name: f.name, kind: "text", text: await f.text() });
    else throw new Error(`${f.name}: 문서는 PDF, PPTX, TXT, MD만 올릴 수 있습니다.`);
  }
  if (docs.every((d) => d.kind === "text" && !d.text.trim())) throw new Error("문서에서 읽을 수 있는 내용이 없습니다.");

  const photos: StudioPhoto[] = [];
  for (const f of photoFiles) {
    const mime = PHOTO_MIMES.find((m) => m === f.type);
    if (!mime) throw new Error(`${f.name}: 사진은 PNG, JPG, WEBP, GIF만 올릴 수 있습니다.`);
    photos.push({ mime, data: await toBase64(f) });
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    return await requestPromo(client, input, docs, photos);
  } catch (err) {
    throw new Error(promoErrorMessage(err));
  }
}
