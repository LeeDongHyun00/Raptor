import { ImageResponse } from "next/og";
import { getRun } from "@/lib/store";
import { loadFonts } from "@/lib/ogFonts";
import { designOf } from "@/lib/settings";

// KakaoTalk bizboard banner canvas.
const W = 1029;
const H = 258;

export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const run = await getRun(id);
  const index = Number(n);
  const banner = run?.channels?.kakao?.[index];
  if (!run || !banner) return new Response("not found", { status: 404 });
  const d = designOf(run.settings?.design);
  // Each variant gets its own high-contrast combination so parallel creatives look distinct.
  const t = [
    { bg: d.dark, fg: d.light, sub: d.onDarkMute, btnBg: d.accent, btnFg: d.ink },
    { bg: d.light, fg: d.ink, sub: d.mute, btnBg: d.dark, btnFg: d.light },
    { bg: d.accent, fg: d.ink, sub: d.ink, btnBg: d.ink, btnFg: d.light },
  ][index % 3];

  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.bg, padding: "0 64px", fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, letterSpacing: -2, lineHeight: 1.2, color: t.fg, wordBreak: "keep-all" }}>{banner.copy}</div>
          <div style={{ display: "flex", fontSize: 30, color: t.sub, marginTop: 14 }}>{banner.sub}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "20px 36px", borderRadius: 999, background: t.btnBg, color: t.btnFg, fontSize: 32, fontWeight: 700 }}>{banner.cta}</div>
      </div>
    ),
    { width: W, height: H, fonts: await loadFonts() },
  );

  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "no-store");
  if (new URL(req.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="kakao-banner-${index + 1}.png"`);
  }
  return new Response(image.body, { headers });
}
