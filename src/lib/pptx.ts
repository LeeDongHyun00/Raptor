import JSZip from "jszip";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Pulls slide text out of a PPTX, keeping slide numbers so evidence can cite pages. */
export async function extractPptxText(buf: ArrayBuffer | Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .map((name) => ({ name, n: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(name)?.[1]) }))
    .filter((s) => !Number.isNaN(s.n))
    .sort((a, b) => a.n - b.n);
  const out: string[] = [];
  for (const s of slides) {
    const xml = await zip.file(s.name)!.async("string");
    // Paragraph boundaries become line breaks; runs within a paragraph are joined.
    const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).join("")).filter((t) => t.trim());
    out.push(`[페이지 ${s.n}]\n${paras.join("\n")}`);
  }
  return out.join("\n\n");
}
