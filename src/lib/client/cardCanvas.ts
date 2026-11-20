import type { CardSlide, KakaoBanner } from "../types";
import { designOf } from "../settings";

/**
 * Draws card news and banner images in the browser. The static build has no server to
 * render them, and copy can be anything once a viewer generates or edits it, so the
 * layout of the server templates is reproduced here on a canvas.
 */

const fontFamily = () => getComputedStyle(document.body).fontFamily || "sans-serif";

function setFont(c: CanvasRenderingContext2D, weight: number, size: number, tracking = 0) {
  c.font = `${weight} ${size}px ${fontFamily()}`;
  // Not in every browser yet; the layout still holds without it.
  (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${tracking}px`;
}

/** Word wrap that keeps Korean words whole (like `word-break: keep-all`), splitting only words wider than the line. */
function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (c.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) lines.push(line);
      line = word;
      while (c.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && c.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

interface TextBlock { lines: string[]; size: number; weight: number; lineHeight: number; color: string; tracking: number; alpha?: number }

const block = (c: CanvasRenderingContext2D, text: string, width: number, size: number, weight: number, lh: number, color: string, tracking = 0, alpha?: number): TextBlock => {
  setFont(c, weight, size, tracking);
  return { lines: wrap(c, text, width), size, weight, lineHeight: size * lh, color, tracking, alpha };
};

function drawBlock(c: CanvasRenderingContext2D, b: TextBlock, x: number, y: number): number {
  setFont(c, b.weight, b.size, b.tracking);
  c.fillStyle = b.color;
  c.globalAlpha = b.alpha ?? 1;
  c.textBaseline = "middle";
  b.lines.forEach((line, i) => c.fillText(line, x, y + b.lineHeight * (i + 0.5)));
  c.globalAlpha = 1;
  return y + b.lines.length * b.lineHeight;
}

function pill(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, padX: number, padY: number, style: { fill?: string; stroke?: string; color: string }): number {
  setFont(c, 700, size);
  const w = c.measureText(text).width + padX * 2;
  const h = size * 1.2 + padY * 2;
  roundRect(c, x, y, w, h, h / 2);
  if (style.fill) { c.fillStyle = style.fill; c.fill(); }
  if (style.stroke) { c.strokeStyle = style.stroke; c.lineWidth = 3; c.stroke(); }
  c.fillStyle = style.color;
  c.textBaseline = "middle";
  c.fillText(text, x + padX, y + h / 2 + 1);
  return h;
}

const canvasOf = (w: number, h: number) => {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  return { el, c: el.getContext("2d")! };
};

const toBlob = (el: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => el.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), "image/png"));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

export async function drawCard(args: {
  slide: CardSlide; index: number; total: number; brand: string; design?: string; shotUrl?: string | null;
}): Promise<Blob> {
  const { slide, index, total, brand } = args;
  const d = designOf(args.design);
  const W = 1080, H = 1350, P = 72, inner = W - P * 2;
  await document.fonts.ready;
  const { el, c } = canvasOf(W, H);
  const dark = slide.kind === "cover";
  const cta = slide.kind === "cta";
  const fg = dark ? d.light : d.ink;
  c.fillStyle = dark ? d.dark : cta ? d.accent : d.light;
  c.fillRect(0, 0, W, H);

  // The ad label sits on the first image, where viewers see it before anything else.
  if (index === 0) {
    setFont(c, 700, 28);
    const w = c.measureText("광고").width + 40;
    roundRect(c, W - P - w, P, w, 48, 8);
    c.fillStyle = d.light; c.fill();
    c.fillStyle = d.ink; c.textBaseline = "middle";
    c.fillText("광고", W - P - w + 20, P + 25);
  }

  // Footer: brand on the left, position on the right.
  const footY = H - P - 17;
  roundRect(c, P, footY - 9, 18, 18, 5);
  c.fillStyle = dark ? d.accent : d.dark; c.fill();
  setFont(c, 700, 28);
  c.fillStyle = dark ? d.onDarkMute : cta ? d.ink : d.mute;
  c.textBaseline = "middle";
  c.fillText(brand, P + 30, footY + 1);
  setFont(c, 400, 28);
  const pos = `${index + 1} / ${total}`;
  c.fillText(pos, W - P - c.measureText(pos).width, footY + 1);

  const top = P + 48 + 24;
  const bottom = H - P - 34 - 40;

  if (slide.kind === "point") {
    const title = block(c, slide.title, inner, 72, 800, 1.25, d.ink, -2);
    const body = block(c, slide.body, inner, 40, 400, 1.55, d.mute);
    const shot = args.shotUrl ? await loadImage(args.shotUrl) : null;
    const pillH = 30 * 1.2 + 20;
    const textH = pillH + 36 + title.lines.length * title.lineHeight + 32 + body.lines.length * body.lineHeight;
    // With a screenshot the text sits at the top and the frame at the bottom; without one the text is centered.
    let y = shot ? top : top + Math.max(0, (bottom - top - textH - 68) / 2);
    pill(c, slide.eyebrow, P, y, 30, 24, 10, { fill: d.dark, color: d.light });
    y += pillH + 36;
    y = drawBlock(c, title, P, y) + 32;
    y = drawBlock(c, body, P, y);
    if (shot) {
      const fw = 936, fh = 500, fx = P, fy = bottom - fh;
      roundRect(c, fx, fy, fw, fh, 28);
      c.fillStyle = "#fff"; c.fill();
      c.save();
      c.clip();
      const scale = Math.min((fw - 6) / shot.width, (fh - 6) / shot.height);
      const iw = shot.width * scale, ih = shot.height * scale;
      c.drawImage(shot, fx + (fw - iw) / 2, fy + (fh - ih) / 2, iw, ih);
      c.restore();
      roundRect(c, fx, fy, fw, fh, 28);
      c.strokeStyle = d.line; c.lineWidth = 3; c.stroke();
    } else {
      roundRect(c, P, y + 56, 160, 12, 6);
      c.fillStyle = d.accent; c.fill();
    }
  } else {
    const title = block(c, slide.title, inner, cta ? 92 : 84, 800, 1.25, fg, -3);
    const body = slide.body ? block(c, slide.body, inner, 42, 400, 1.5, fg, 0, 0.85) : null;
    const pillH = 32 * 1.2 + 24;
    const h = pillH + 44 + title.lines.length * title.lineHeight + (body ? 40 + body.lines.length * body.lineHeight : 0);
    let y = top + Math.max(0, (bottom - top - h) / 2);
    const accent = cta ? d.ink : dark ? d.accent : d.dark;
    pill(c, slide.eyebrow, P, y, 32, 28, 12, { stroke: accent, color: accent });
    y += pillH + 44;
    y = drawBlock(c, title, P, y);
    if (body) drawBlock(c, body, P, y + 40);
  }
  return toBlob(el);
}

export async function drawBanner(banner: KakaoBanner, index: number, design?: string): Promise<Blob> {
  const d = designOf(design);
  const W = 1029, H = 258, P = 64;
  await document.fonts.ready;
  const { el, c } = canvasOf(W, H);
  // Each variant gets its own high-contrast combination so parallel creatives look distinct.
  const t = [
    { bg: d.dark, fg: d.light, sub: d.onDarkMute, btnBg: d.accent, btnFg: d.ink },
    { bg: d.light, fg: d.ink, sub: d.mute, btnBg: d.dark, btnFg: d.light },
    { bg: d.accent, fg: d.ink, sub: d.ink, btnBg: d.ink, btnFg: d.light },
  ][index % 3];
  c.fillStyle = t.bg;
  c.fillRect(0, 0, W, H);

  setFont(c, 700, 32);
  const btnW = c.measureText(banner.cta).width + 72, btnH = 78;
  const btnX = W - P - btnW;
  roundRect(c, btnX, (H - btnH) / 2, btnW, btnH, btnH / 2);
  c.fillStyle = t.btnBg; c.fill();
  c.fillStyle = t.btnFg; c.textBaseline = "middle";
  c.fillText(banner.cta, btnX + 36, H / 2 + 1);

  const textW = btnX - P - 32;
  // A banner reads as one line: shrink the headline until it fits before letting it wrap.
  let size = 54;
  let copy = block(c, banner.copy, textW, size, 800, 1.2, t.fg, -2);
  while (copy.lines.length > 1 && size > 40) copy = block(c, banner.copy, textW, (size -= 2), 800, 1.2, t.fg, -2);
  const sub = block(c, banner.sub, textW, 30, 400, 1.3, t.sub);
  const h = copy.lines.length * copy.lineHeight + 14 + sub.lines.length * sub.lineHeight;
  const y = drawBlock(c, copy, P, (H - h) / 2);
  drawBlock(c, sub, P, y + 14);
  return toBlob(el);
}
