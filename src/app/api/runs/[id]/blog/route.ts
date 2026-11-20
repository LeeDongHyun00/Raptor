import { NextResponse } from "next/server";
import { getAsset, getRun, getWorkspace } from "@/lib/store";
import { blogDocumentHtml } from "@/lib/blogHtml";
import { adDisclosure } from "@/lib/review";

/** Standalone HTML export of the blog post, screenshots embedded as data URIs. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const run = await getRun((await params).id);
  if (!run?.blog) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ws = await getWorkspace();
  const uris: Record<string, string> = {};
  for (const s of run.blog.sections) {
    if (!s.screenshotId || uris[s.screenshotId]) continue;
    const asset = await getAsset(s.screenshotId);
    if (asset) uris[s.screenshotId] = `data:${asset.mime};base64,${asset.data}`;
  }
  const html = blogDocumentHtml(adDisclosure(ws), run.blog, (id) => uris[id] ?? null);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="blog-${run.id}.html"`,
    },
  });
}
