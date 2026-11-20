import { getAsset } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const asset = await getAsset((await params).id);
  if (!asset) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(asset.data, "base64"), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "private, max-age=3600",
      // Uploaded SVGs are only ever shown via <img>; block script execution if opened directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
