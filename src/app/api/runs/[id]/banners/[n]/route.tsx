import { ImageResponse } from "next/og";
import { getRun } from "@/lib/store";
import { loadFonts } from "@/lib/ogFonts";

// KakaoTalk bizboard banner canvas.
const W = 1029;
const H = 258;

// Each variant gets its own high-contrast palette so parallel creatives look distinct.
const THEMES = [
  { bg: "#1F4D3A", fg: "#F6F1E7", sub: "#B9CBBF", btnBg: "#E8A33D", btnFg: "#14231C" },
  { bg: "#F6F1E7", fg: "#14231C", sub: "#5F6B63", btnBg: "#1F4D3A", btnFg: "#F6F1E7" },
  { bg: "#E8A33D", fg: "#14231C", sub: "#3D2E0C", btnBg: "#14231C", btnFg: "#F6F1E7" },
];

export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const run = await getRun(id);
  const index = Number(n);
  const banner = run?.channels?.kakao[index];
  if (!banner) return new Response("not found", { status: 404 });
  const t = THEMES[index % THEMES.length];

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
