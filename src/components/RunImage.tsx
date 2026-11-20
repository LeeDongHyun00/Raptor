"use client";

import { useEffect, useState } from "react";
import type { Run } from "@/lib/types";
import { assetUrl, bannerUrl, cardUrl, isStaticDemo } from "@/lib/client/api";

const CACHE = new Map<string, Promise<Blob>>();

/** PNG of one card (or banner) of a run: fetched from the server, or drawn in the browser when there is none. */
export function runImageBlob(run: Run, kind: "card" | "banner", index: number): Promise<Blob> {
  const key = `${run.id}:${kind}:${index}:${run.editedAt ?? ""}`;
  let hit = CACHE.get(key);
  if (!hit) {
    hit = (async () => {
      if (!isStaticDemo) {
        const res = await fetch(kind === "card" ? cardUrl(run, index) : bannerUrl(run, index));
        if (!res.ok) throw new Error("이미지를 불러오지 못했습니다.");
        return res.blob();
      }
      const { drawBanner, drawCard } = await import("@/lib/client/cardCanvas");
      const design = run.settings?.design;
      if (kind === "banner") return drawBanner(run.channels!.kakao![index], index, design);
      const slides = run.cards!.slides;
      const slide = slides[index];
      return drawCard({ slide, index, total: slides.length, brand: "티링크 비즈레코딩", design, shotUrl: slide.screenshotId ? assetUrl(slide.screenshotId) : null });
    })();
    CACHE.set(key, hit);
    // A failed draw must not be remembered, or the image could never recover.
    hit.catch(() => CACHE.delete(key));
  }
  return hit;
}

export async function downloadRunImage(run: Run, kind: "card" | "banner", index: number, filename: string) {
  const url = URL.createObjectURL(await runImageBlob(run, kind, index));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RunImage({ run, kind, index, alt, className }: { run: Run; kind: "card" | "banner"; index: number; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [w, h] = kind === "card" ? [1080, 1350] : [1029, 258];
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    runImageBlob(run, kind, index)
      .then((blob) => { if (alive) { made = URL.createObjectURL(blob); setUrl(made); } })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
    // Re-draw only when the run's copy changes, not on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, run.editedAt, kind, index]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} width={w} height={h} className={className} /> : <div role="img" aria-label={alt} style={{ aspectRatio: `${w} / ${h}` }} className={`animate-pulse bg-brand-soft ${className ?? ""}`} />;
}
