import type { PromoInput, PromoResult } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Standalone promo page; photos are passed in as data URLs so the file works offline. */
export function promoDocumentHtml(input: PromoInput, r: PromoResult, photoSrc: (i: number) => string | null): string {
  const p = r.promo;
  const img = (i: number | null, alt: string, cls: string) => {
    const src = i == null ? null : photoSrc(i);
    return src ? `<img class="${cls}" src="${src}" alt="${esc(alt)}">` : "";
  };
  const highlights = p.highlights.map((h) => {
    const d = r.differentiators[h.differentiatorIndex];
    return `<section class="hl">
  ${img(h.photoIndex, h.photoAlt ?? h.title, "hl-img")}
  <div><h2>${esc(h.title)}</h2><p>${esc(h.body)}</p>${d ? `<p class="cmp"><span>기존 방식</span> ${esc(d.conventional)}</p>` : ""}</div>
</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(input.name)}</title>
<style>
body{margin:0;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#1c2421;background:#f6f1e7;line-height:1.6}
.wrap{max-width:880px;margin:0 auto;padding:40px 16px}
.eyebrow{display:inline-block;background:#1f4d3a;color:#f6f1e7;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700}
h1{font-size:clamp(28px,6vw,44px);line-height:1.2;margin:16px 0 8px;letter-spacing:-.02em}
.sub{font-size:18px;color:#4a5550;margin:0 0 16px}
.hook{font-size:16px;margin:0 0 24px}
.hero{width:100%;max-height:420px;object-fit:cover;border-radius:20px;display:block;margin:24px 0}
.hl{display:grid;grid-template-columns:1fr;gap:16px;background:#fffdf8;border:1px solid #e5ddcc;border-radius:20px;padding:20px;margin:16px 0}
@media(min-width:640px){.hl{grid-template-columns:280px 1fr;align-items:center}}
.hl-img{width:100%;border-radius:12px;display:block}
.hl h2{margin:0 0 6px;font-size:20px}.hl p{margin:0 0 8px}
.cmp{font-size:14px;color:#4a5550}.cmp span{font-weight:700;margin-right:4px}
.cta{text-align:center;margin:40px 0 0}
.cta a{display:inline-block;background:#e8a33d;color:#1c2421;font-weight:800;border-radius:999px;padding:14px 28px;text-decoration:none}
.cta p{font-size:14px;color:#4a5550}
</style></head><body><main class="wrap">
<span class="eyebrow">${esc(p.eyebrow)}</span>
<h1>${esc(p.headline)}</h1>
<p class="sub">${esc(p.subheadline)}</p>
<p class="hook">${esc(p.hook)}</p>
${img(p.heroPhotoIndex, input.name, "hero")}
${highlights}
<div class="cta"><a href="#">${esc(p.ctaLabel)}</a><p>${esc(p.ctaNote)}</p></div>
</main></body></html>`;
}
