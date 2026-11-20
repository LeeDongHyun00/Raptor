import type { EmailContent } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Single-column, mobile-first mail with one button; table layout and inline styles for mail clients. */
export function emailDocumentHtml(email: EmailContent, subject: string, footer: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(subject)}</title>
</head>
<body style="margin:0;background:#f4f1ea;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#222;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(email.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:32px 28px;">
<p style="font-size:16px;line-height:1.8;margin:0 0 16px;">${esc(email.greeting)}</p>
${email.paragraphs.map((p) => `<p style="font-size:16px;line-height:1.8;margin:0 0 16px;">${esc(p)}</p>`).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:#1f4d3a;border-radius:999px;">
<a href="{{링크}}" style="display:block;padding:16px 32px;color:#ffffff;font-size:17px;font-weight:bold;text-decoration:none;">${esc(email.ctaLabel)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #eee;font-size:12px;line-height:1.7;color:#888;">${esc(footer)}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}
