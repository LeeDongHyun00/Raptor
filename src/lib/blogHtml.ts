import type { Blog } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Blog body as HTML with inline styles only, so it survives pasting into the Naver editor.
 * `imageSrc` decides how screenshots are referenced (data URI for a standalone file).
 */
export function blogBodyHtml(disclosure: string, blog: Blog, imageSrc: (id: string) => string | null): string {
  const parts: string[] = [
    `<p style="color:#666;font-size:13px;border:1px solid #ddd;padding:8px 12px;">${esc(disclosure)}</p>`,
    `<h1 style="font-size:28px;line-height:1.4;">${esc(blog.title)}</h1>`,
  ];
  for (const s of blog.sections) {
    parts.push(`<h2 style="font-size:21px;margin-top:36px;">${esc(s.heading)}</h2>`);
    for (const p of s.paragraphs) parts.push(`<p style="font-size:16px;line-height:1.9;">${esc(p)}</p>`);
    const src = s.screenshotId ? imageSrc(s.screenshotId) : null;
    if (src) {
      parts.push(
        `<figure style="margin:24px 0;text-align:center;"><img src="${src}" alt="${esc(s.caption ?? "")}" style="max-width:100%;border:1px solid #e5e5e5;"/>` +
          (s.caption ? `<figcaption style="color:#777;font-size:14px;margin-top:8px;">▲ ${esc(s.caption)}</figcaption>` : "") + `</figure>`,
      );
    }
  }
  parts.push(`<p style="color:#2b7a4b;font-size:15px;margin-top:32px;">${blog.tags.map((t) => `#${esc(t)}`).join(" ")}</p>`);
  return parts.join("\n");
}

export function blogDocumentHtml(disclosure: string, blog: Blog, imageSrc: (id: string) => string | null): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(blog.title)}</title>
</head>
<body style="max-width:720px;margin:40px auto;padding:0 20px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#222;">
${blogBodyHtml(disclosure, blog, imageSrc)}
</body>
</html>`;
}
