import { ImageResponse } from "next/og";
import { getAsset, getRun, getWorkspace } from "@/lib/store";
import { loadFonts } from "@/lib/ogFonts";

const W = 1080;
const H = 1350; // Instagram 4:5 portrait

const C = { ink: "#14231C", green: "#1F4D3A", cream: "#F6F1E7", amber: "#E8A33D", line: "#D9D2C3", mute: "#5F6B63" };

export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const run = await getRun(id);
  const index = Number(n);
  const slide = run?.cards?.slides[index];
  if (!run || !run.cards || !slide) return new Response("not found", { status: 404 });

  const ws = await getWorkspace();
  const total = run.cards.slides.length;
  const asset = slide.screenshotId ? await getAsset(slide.screenshotId) : null;
  const shot = asset ? `data:${asset.mime};base64,${asset.data}` : null;

  const dark = slide.kind === "cover";
  const cta = slide.kind === "cta";
  const bg = dark ? C.green : cta ? C.amber : C.cream;
  const fg = dark ? C.cream : C.ink;
  const accent = dark ? C.amber : C.green;

  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: dark ? "#B9CBBF" : cta ? C.ink : C.mute }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 18, height: 18, borderRadius: 5, background: dark ? C.amber : C.green, marginRight: 12 }} />
        <div style={{ display: "flex", fontWeight: 700 }}>{ws.product.company} {ws.product.name}</div>
      </div>
      <div style={{ display: "flex" }}>{index + 1} / {total}</div>
    </div>
  );

  const body =
    slide.kind === "point" ? (
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: shot ? "flex-start" : "center" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", padding: "10px 24px", borderRadius: 999, background: C.green, color: C.cream, fontSize: 30, fontWeight: 700 }}>{slide.eyebrow}</div>
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.25, letterSpacing: -2, color: C.ink, wordBreak: "keep-all" }}>{slide.title}</div>
        <div style={{ display: "flex", fontSize: 40, lineHeight: 1.55, color: "#33423A", marginTop: 32, wordBreak: "keep-all" }}>{slide.body}</div>
        {shot ? (
          <div style={{ display: "flex", flexGrow: 1, alignItems: "flex-end", marginTop: 40 }}>
            <div style={{ display: "flex", width: 936, height: 500, borderRadius: 28, border: `3px solid ${C.line}`, background: "#fff", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img src={shot} width={930} height={494} style={{ objectFit: "contain" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", width: 160, height: 12, borderRadius: 6, background: C.amber, marginTop: 56 }} />
        )}
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          <div style={{ display: "flex", padding: "12px 28px", borderRadius: 999, border: `3px solid ${cta ? C.ink : accent}`, color: cta ? C.ink : accent, fontSize: 32, fontWeight: 700 }}>{slide.eyebrow}</div>
        </div>
        <div style={{ display: "flex", fontSize: cta ? 92 : 84, fontWeight: 800, lineHeight: 1.25, letterSpacing: -3, color: fg, wordBreak: "keep-all" }}>{slide.title}</div>
        {slide.body ? (
          <div style={{ display: "flex", fontSize: 42, lineHeight: 1.5, color: fg, marginTop: 40, wordBreak: "keep-all", opacity: 0.85 }}>{slide.body}</div>
        ) : null}
      </div>
    );

  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: bg, padding: 72, fontFamily: "Pretendard" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", height: 48, marginBottom: 24 }}>
          {/* The ad label sits on the first image, where viewers see it before anything else. */}
          {index === 0 ? (
            <div style={{ display: "flex", alignItems: "center", padding: "0 20px", borderRadius: 8, background: C.cream, color: C.ink, fontSize: 28, fontWeight: 700 }}>광고</div>
          ) : null}
        </div>
        {body}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>{footer}</div>
      </div>
    ),
    { width: W, height: H, fonts: await loadFonts() },
  );

  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "no-store");
  if (new URL(req.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="card-${String(index + 1).padStart(2, "0")}.png"`);
  }
  return new Response(image.body, { headers });
}
