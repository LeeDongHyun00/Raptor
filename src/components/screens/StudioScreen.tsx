"use client";

// Previews are local blob: URLs, which next/image cannot optimize.
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { PromoInput, PromoResult } from "@/lib/types";
import { downloadHtml, generatePromo, isStaticDemo } from "@/lib/client/api";
import { loadStoredKey, storeKey } from "@/lib/client/apiKeyStore";
import { promoDocumentHtml } from "@/lib/studioHtml";
import { AD_HASHTAG } from "@/lib/review";
import { Badge, Panel, btn } from "../ui";

const MAX_PHOTOS = 6;
// The server route sits behind Vercel's ~4.5 MB body cap; direct browser calls only face
// the API's 32 MB request cap, which base64 (+33%) still clears at 20 MB of files.
const MAX_TOTAL = (isStaticDemo ? 20 : 4) * 1024 * 1024;
const MAX_LABEL = isStaticDemo ? "20MB" : "4MB";
const PHOTO_EDGE = 1280;

/** Downscales a photo so several fit under the upload cap and vision tokens stay low. */
async function shrink(file: File): Promise<File> {
  // GIFs may be animated; re-encoding would drop frames.
  if (file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const toDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

const size = (n: number) => (n === 0 ? "0KB" : n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

export function StudioScreen() {
  const [input, setInput] = useState<PromoInput>({ name: "", company: "", summary: "", audience: "" });
  const [docs, setDocs] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PromoResult | null>(null);
  // Snapshot of the photos the result refers to, so editing the list later cannot misalign indexes.
  const [resultPhotos, setResultPhotos] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const saved = loadStoredKey();
    // Read after mount: localStorage does not exist during prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) { setApiKey(saved); setRemember(true); }
  }, []);

  const previews = useObjectUrls(photos);
  const resultUrls = useObjectUrls(resultPhotos);
  const total = [...docs, ...photos].reduce((n, f) => n + f.size, 0);

  async function addPhotos(list: File[]) {
    if (!list.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (list.length > room) setError(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어 앞의 ${Math.max(room, 0)}장만 추가했습니다.`);
    const shrunk = await Promise.all(list.slice(0, Math.max(room, 0)).map(shrink));
    setPhotos((p) => [...p, ...shrunk]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!input.name.trim()) return setError("제품명을 입력해 주세요.");
    if (docs.length === 0) return setError("제품 문서를 하나 이상 올려 주세요.");
    if (total > MAX_TOTAL) return setError(`문서와 사진을 합쳐 ${MAX_LABEL} 이하로 올려 주세요.`);
    const key = apiKey.trim();
    if (isStaticDemo) storeKey(remember && key ? key : null);
    setBusy(true);
    try {
      const r = await generatePromo(input, docs, photos, isStaticDemo ? key : undefined);
      setResultPhotos(photos);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function exportHtml() {
    if (!result) return;
    const srcs = await Promise.all(resultPhotos.map(toDataUrl));
    downloadHtml(`promo-${input.name.replace(/\s+/g, "-") || "product"}.html`, promoDocumentHtml(input, result, (i) => srcs[i] ?? null));
  }

  const set = (k: keyof PromoInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInput((v) => ({ ...v, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">홍보 스튜디오</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mute">
          제품 문서와 사진을 올리면 AI(Claude Haiku 5.5)가 문서에서 기술적 차별점을 찾고, 사진을 배치한 홍보 페이지와 SNS 게시물을 한 번에 만듭니다.
          올린 파일은 생성에만 쓰고 저장하지 않습니다.
        </p>
      </div>

      {isStaticDemo && (
        <Panel title="Anthropic API 키">
          <p className="-mt-2 mb-3 text-sm leading-relaxed text-mute">
            이 사이트는 서버가 없어 브라우저에서 Anthropic API를 직접 호출합니다. 키는 사이트나 저장소에 올라가지 않고 api.anthropic.com으로만 전송됩니다.
            키를 비워 두면 문서를 읽지 않은 <strong>샘플 결과</strong>를 보여 줍니다.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="password"
              className={`${inputCls} max-w-md flex-1`}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Anthropic API 키"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              이 브라우저에 기억하기
            </label>
            {apiKey && (
              <button type="button" className={btn.text} onClick={() => { setApiKey(""); setRemember(false); storeKey(null); }}>키 지우기</button>
            )}
          </div>
          <p className="mt-2 text-xs text-mute">공용 컴퓨터에서는 ‘기억하기’를 끄세요. 키는 console.anthropic.com의 API Keys에서 만들 수 있습니다.</p>
        </Panel>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. 제품 정보">
          <div className="space-y-3">
            <Field label="제품명 (필수)"><input className={inputCls} value={input.name} onChange={set("name")} maxLength={60} required /></Field>
            <Field label="회사명"><input className={inputCls} value={input.company} onChange={set("company")} maxLength={60} /></Field>
            <Field label="한 줄 소개"><textarea className={inputCls} rows={2} value={input.summary} onChange={set("summary")} maxLength={200} /></Field>
            <Field label="홍보 대상 고객"><input className={inputCls} value={input.audience} onChange={set("audience")} maxLength={100} placeholder="예: 중소기업 영업팀장" /></Field>
          </div>
        </Panel>

        <Panel title="2. 문서와 사진">
          <div className="space-y-5">
            <div>
              <FilePick label="제품 문서 추가" hint="제안서·매뉴얼·기술 소개서 (PDF, PPTX, TXT, MD)" accept=".pdf,.pptx,.txt,.md" onFiles={(l) => setDocs((d) => [...d, ...l])} />
              <ul className="mt-2 space-y-1.5">
                {docs.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2 text-sm">
                    <span className="truncate">{f.name} <span className="text-mute">· {size(f.size)}</span></span>
                    <button type="button" className={btn.text} onClick={() => setDocs((d) => d.filter((_, j) => j !== i))}>삭제</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <FilePick label="사진 추가" hint={`제품 사진·사용 화면 최대 ${MAX_PHOTOS}장 (PNG, JPG, WEBP, GIF)`} accept=".png,.jpg,.jpeg,.webp,.gif" multiple onFiles={addPhotos} />
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {photos.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="relative overflow-hidden rounded-lg border border-line bg-cream">
                    {previews[i] && <img src={previews[i]} alt={f.name} className="aspect-square w-full object-cover" />}
                    <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 text-xs font-bold text-cream">{i + 1}</span>
                    <button type="button" aria-label={`${f.name} 삭제`} className="absolute right-1 top-1 rounded bg-paper/90 px-1.5 text-xs font-bold" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>×</button>
                  </li>
                ))}
              </ul>
            </div>
            <p className={`text-xs ${total > MAX_TOTAL ? "font-bold text-bad" : "text-mute"}`}>합계 {size(total)} / {MAX_LABEL} (사진은 자동으로 줄여 올립니다)</p>
            <button type="submit" className={`${btn.accent} w-full`} disabled={busy} aria-busy={busy}>
              {busy ? "분석하고 만드는 중… (보통 20~60초)" : "차별점 분석하고 홍보 콘텐츠 만들기"}
            </button>
          </div>
        </Panel>
      </form>

      {error && <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {result && <Result input={input} result={result} urls={resultUrls} onExport={exportHtml} />}
    </div>
  );
}

function Result({ input, result, urls, onExport }: { input: PromoInput; result: PromoResult; urls: string[]; onExport: () => void }) {
  const p = result.promo;
  const hashtags = useMemo(() => [AD_HASHTAG, ...result.sns.hashtags.filter((t) => t !== AD_HASHTAG)], [result]);
  const snsText = `${result.sns.caption}\n\n${hashtags.map((t) => `#${t}`).join(" ")}`;
  const photo = (i: number | null) => (i == null ? null : urls[i] ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold">생성 결과</h2>
          <Badge tone={result.mode === "live" ? "good" : "warn"}>{result.mode === "live" ? result.model : "샘플 결과"}</Badge>
        </div>
        <button type="button" className={btn.ghost} onClick={onExport}>홍보 페이지 HTML 내려받기</button>
      </div>

      <Panel title="홍보 페이지 미리보기">
        <article className="rounded-2xl bg-cream p-5 sm:p-8">
          <Badge tone="solid">{p.eyebrow}</Badge>
          <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">{p.headline}</h3>
          <p className="mt-2 text-lg text-mute">{p.subheadline}</p>
          <p className="mt-3 leading-relaxed">{p.hook}</p>
          {photo(p.heroPhotoIndex) && <img src={photo(p.heroPhotoIndex)!} alt={input.name} className="mt-5 max-h-[420px] w-full rounded-2xl object-cover" />}
          <div className="mt-6 space-y-4">
            {p.highlights.map((h, i) => {
              const d = result.differentiators[h.differentiatorIndex];
              const src = photo(h.photoIndex);
              return (
                <section key={i} className={`grid gap-4 rounded-2xl border border-line bg-paper p-5 ${src ? "sm:grid-cols-[240px_1fr] sm:items-center" : ""}`}>
                  {src && <img src={src} alt={h.photoAlt ?? h.title} className="w-full rounded-xl" />}
                  <div>
                    <h4 className="text-lg font-extrabold">{h.title}</h4>
                    <p className="mt-1 leading-relaxed">{h.body}</p>
                    {d && <p className="mt-2 text-sm text-mute"><strong>기존 방식</strong> {d.conventional}</p>}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <span className={btn.accent}>{p.ctaLabel}</span>
            <p className="mt-2 text-sm text-mute">{p.ctaNote}</p>
          </div>
        </article>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="기술적 차별점">
          <ol className="space-y-4">
            {result.differentiators.map((d, i) => (
              <li key={i} className="rounded-xl border border-line p-4">
                <p className="font-extrabold">{i + 1}. {d.title}</p>
                <p className="mt-1 text-sm text-mute">{d.plain}</p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-cream p-3"><dt className="text-xs font-bold text-mute">기존 방식</dt><dd className="mt-1">{d.conventional}</dd></div>
                  <div className="rounded-lg bg-forest-soft p-3"><dt className="text-xs font-bold text-forest">{input.name}</dt><dd className="mt-1 font-semibold">{d.ours}</dd></div>
                </dl>
                <ul className="mt-3 space-y-1 text-xs">
                  {d.evidence.map((e, j) => (
                    <li key={j} className="flex flex-wrap items-baseline gap-x-2">
                      {e.page != null && <Badge tone="solid">p.{e.page}</Badge>}
                      <span className="font-semibold">{e.doc}</span>
                      <span className="text-mute">“{e.quote}”</span>
                    </li>
                  ))}
                  {d.evidence.length === 0 && <li className="text-bad">근거를 찾지 못한 항목입니다. 확인이 필요합니다.</li>}
                </ul>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-6">
          <Panel title="SNS 게시물" action={<CopyButton text={snsText} />}>
            <p className="whitespace-pre-line text-sm leading-relaxed">{result.sns.caption}</p>
            <p className="mt-3 text-sm font-semibold text-forest">{hashtags.map((t) => `#${t}`).join(" ")}</p>
          </Panel>
          {result.photos.length > 0 && (
            <Panel title="사진 인식 결과">
              <ul className="space-y-2">
                {result.photos.map((ph) => (
                  <li key={ph.index} className="flex items-center gap-3 text-sm">
                    {urls[ph.index] && <img src={urls[ph.index]} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />}
                    <span><strong>{ph.index + 1}번</strong> {ph.description}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-mute">{label}</span>
      {children}
    </label>
  );
}

function FilePick({ label, hint, accept, multiple, onFiles }: { label: string; hint: string; accept: string; multiple?: boolean; onFiles: (files: File[]) => void }) {
  return (
    <div>
      <label className={`${btn.ghost} cursor-pointer`}>
        {label}
        <input
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple ?? true}
          onChange={(e) => {
            // FileList is live: copy it before clearing the input, or the files vanish.
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            onFiles(files);
          }}
        />
      </label>
      <p className="mt-1.5 text-xs text-mute">{hint}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={btn.ghost}
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
    >
      {done ? "복사됨" : "복사"}
    </button>
  );
}

/** Object URLs for previews, revoked when the file list changes or the screen unmounts. */
function useObjectUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}
