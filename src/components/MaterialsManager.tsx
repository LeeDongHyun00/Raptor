"use client";

import { useEffect, useRef, useState } from "react";
import type { Differentiator, Guideline, Material, MaterialKind, VocBoard } from "@/lib/types";
import { analyze, analyzeVoc, assetUrl, clearVoc, isStaticDemo, removeMaterial, saveGuideline, uploadMaterial } from "@/lib/client/api";
import { loadStoredKey, storeKey } from "@/lib/client/apiKeyStore";
import { Badge, Panel, btn, fmtDate } from "./ui";

const KINDS: { kind: MaterialKind; title: string; hint: string; accept: string }[] = [
  { kind: "doc", title: "제품 문서", hint: "제안서·매뉴얼 (PDF, PPTX · 4MB 이하)", accept: ".pdf,.pptx" },
  { kind: "screenshot", title: "화면 캡처·현장 사진", hint: "PNG, JPG, WEBP · 4MB 이하", accept: ".png,.jpg,.jpeg,.webp" },
];

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))}KB` : "");

export function MaterialsManager({ materials, guideline, analysis, voc, differentiators, aiMode, onChange }: {
  materials: Material[]; analysis: { at?: string; mode?: "live" | "demo" }; guideline: Guideline; voc?: VocBoard; differentiators: Differentiator[]; aiMode: "live" | "demo"; onChange: () => void;
}) {
  const [busy, setBusy] = useState<MaterialKind | null>(null);
  const [error, setError] = useState("");
  // Bumped after an Excel import so the editor remounts with the imported values;
  // a plain save must not remount it, or its "saved" status would vanish.
  const [guideVersion, setGuideVersion] = useState(0);

  async function upload(kind: MaterialKind, files: FileList | null) {
    if (!files?.length) return;
    setBusy(kind);
    setError("");
    for (const file of Array.from(files)) {
      try {
        await uploadMaterial(kind, file);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "업로드에 실패했습니다."}`);
        break;
      }
    }
    if (kind === "guideline") setGuideVersion((v) => v + 1);
    setBusy(null);
    onChange();
  }

  async function remove(id: string) {
    await removeMaterial(id).catch((e) => setError(e instanceof Error ? e.message : "삭제하지 못했습니다."));
    onChange();
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        {KINDS.map(({ kind, title, hint, accept }) => {
          const items = materials.filter((m) => m.kind === kind);
          return (
            <Panel key={kind} title={title} action={<UploadButton accept={accept} multiple busy={busy === kind} unavailable={isStaticDemo && kind === "screenshot"} onFiles={(f) => upload(kind, f)} />}>
              <p className="-mt-2 mb-4 text-xs text-mute">{hint}</p>
              {kind === "screenshot" ? (
                <ul className="grid grid-cols-2 gap-3">
                  {items.map((m) => (
                    <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-canvas/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(m.id)} alt={m.description ?? m.name} className="aspect-video w-full bg-canvas object-cover" />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="break-all text-xs font-semibold leading-snug">{m.name}</p>
                          {m.demo ? <Badge tone="good">기본 탑재</Badge> : <RemoveButton onClick={() => remove(m.id)} name={m.name} />}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-mute">{m.description ?? "다음 생성 때 AI가 화면 내용을 읽습니다."}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y divide-line/70">
                  {items.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-mute">{m.demo ? "미리 분석해 둔 회사 문서" : size(m.size)}</p>
                      </div>
                      {m.demo ? <Badge tone="good">기본 탑재</Badge> : <RemoveButton onClick={() => remove(m.id)} name={m.name} />}
                    </li>
                  ))}
                </ul>
              )}
              {items.length === 0 && <p className="rounded-xl bg-canvas px-4 py-6 text-center text-sm text-mute">아직 올린 파일이 없습니다.</p>}
              {kind === "doc" && <DocAnalysis docs={items} analysis={analysis} aiMode={aiMode} onChange={onChange} />}
            </Panel>
          );
        })}
      </div>
      <VocCard voc={voc} differentiators={differentiators} aiMode={aiMode} onChange={onChange} />
      <GuidelineEditor
        key={guideVersion}
        guideline={guideline}
        onSaved={onChange}
        uploadButton={<UploadButton accept=".xlsx,.xls" label="엑셀로 불러오기" busy={busy === "guideline"} onFiles={(f) => upload("guideline", f)} />}
      />
    </div>
  );
}

function UploadButton({ accept, multiple, busy, onFiles, unavailable, label = "파일 올리기" }: {
  accept: string; multiple?: boolean; busy: boolean; onFiles: (f: FileList | null) => void; unavailable?: boolean; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <button className={btn.ghost} disabled={busy || unavailable} title={unavailable ? "데모 버전에서는 올릴 수 없습니다" : undefined} onClick={() => ref.current?.click()}>{busy ? "올리는 중…" : label}</button>
    </>
  );
}

function RemoveButton({ onClick, name }: { onClick: () => void; name: string }) {
  return <button onClick={onClick} aria-label={`${name} 삭제`} className="shrink-0 text-xs font-semibold text-mute hover:text-bad">삭제</button>;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed focus:border-brand focus:outline-none";

function GuidelineEditor({ guideline, uploadButton, onSaved }: { guideline: Guideline; uploadButton: React.ReactNode; onSaved: () => void }) {
  const [keywords, setKeywords] = useState(guideline.requiredKeywords.map((k) => `${k.keyword} | ${k.minCount}`).join("\n"));
  const [missions, setMissions] = useState(guideline.missions.join("\n"));
  const [structure, setStructure] = useState(guideline.structure.join("\n"));
  const [minChars, setMinChars] = useState(String(guideline.minChars));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    try {
      await saveGuideline({
        requiredKeywords: lines(keywords).map((l) => {
          const [keyword, count] = l.split("|").map((x) => x.trim());
          return { keyword, minCount: Number(count) || 1 };
        }).filter((k) => k.keyword),
        missions: lines(missions),
        structure: lines(structure),
        minChars: Number(minChars) || 0,
      });
      setState("saved");
      onSaved();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel title="가이드라인" action={uploadButton}>
      <p className="-mt-2 mb-4 text-xs leading-relaxed text-mute">
        현재 기준: {guideline.source}. 엑셀 가이드라인을 올리면 필수 키워드, 미션, 본문 구성을 자동으로 읽어 옵니다. 여기 있는 기준이 자동 검수가 채점하는 기준입니다.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-brand-soft p-4">
          <dt className="text-xs font-bold text-brand">필수 키워드 {guideline.requiredKeywords.length}개 · 코드 검사</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {guideline.requiredKeywords.map((k) => <Badge key={k.keyword} tone="solid">{k.keyword}{k.minCount > 1 ? ` ×${k.minCount}` : ""}</Badge>)}
            {guideline.requiredKeywords.length === 0 && <span className="text-sm text-mute">없음</span>}
          </dd>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <dt className="text-xs font-bold text-mute">글 구성 {guideline.structure.length}단계</dt>
          <dd className="mt-2 text-sm leading-relaxed">{guideline.structure.join(" → ") || "없음"}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <dt className="text-xs font-bold text-mute">분량</dt>
          <dd className="mt-2 text-sm leading-relaxed">{guideline.minChars ? `본문 공백 제외 ${guideline.minChars.toLocaleString()}자 이상` : "기준 없음"}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-xl bg-canvas p-4">
        <p className="text-xs font-bold text-mute">미션 {guideline.missions.length}개 · AI 검수</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          {guideline.missions.map((m, i) => <li key={i}>{m}</li>)}
        </ol>
      </div>
      <details className="mt-4 rounded-xl border border-line" open={state === "saved" || state === "error" || undefined}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold">직접 수정</summary>
        <div className="border-t border-line p-4">
          <p className="mb-4 text-xs leading-relaxed text-mute">읽어 온 내용이 틀렸거나 이번 회차만 기준을 바꿀 때 씁니다. 저장하면 다음 생성의 검수부터 적용됩니다.</p>
      <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold">필수 키워드</span>
              <span className="ml-2 text-xs text-mute">한 줄에 하나 · “키워드 | 최소 횟수” · 코드로 정확히 검사</span>
              <textarea className={`${input} mt-2`} rows={5} value={keywords} onChange={(e) => { setKeywords(e.target.value); setState("idle"); }} />
            </label>
            <label className="block">
              <span className="text-sm font-bold">미션</span>
              <span className="ml-2 text-xs text-mute">한 줄에 하나 · AI가 충족 여부를 판정</span>
              <textarea className={`${input} mt-2`} rows={12} value={missions} onChange={(e) => { setMissions(e.target.value); setState("idle"); }} />
            </label>
            <label className="block">
              <span className="text-sm font-bold">글 구성 순서</span>
              <span className="ml-2 text-xs text-mute">한 줄에 하나</span>
              <textarea className={`${input} mt-2`} rows={4} value={structure} onChange={(e) => { setStructure(e.target.value); setState("idle"); }} />
            </label>
            <div>
              <label className="block">
                <span className="text-sm font-bold">최소 글자 수</span>
                <span className="ml-2 text-xs text-mute">본문, 공백 제외 · 0이면 기준 없음</span>
                <input className={`${input} mt-2 max-w-40 tabular-nums`} inputMode="numeric" value={minChars} onChange={(e) => { setMinChars(e.target.value.replace(/\D/g, "")); setState("idle"); }} />
              </label>
              <p className="mt-4 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-mute">
                ‘광고’ 표기는 가이드라인과 관계없이 항상 자동으로 들어갑니다. 블로그는 본문 맨 위, 인스타그램은 첫 장 이미지와 본문 첫 줄·해시태그에 표시합니다.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button className={btn.primary} onClick={save} disabled={state === "saving"}>{state === "saving" ? "저장 중…" : "가이드라인 저장"}</button>
            <span role="status" className="text-sm text-mute">
              {state === "saved" && "저장했습니다. 다음 생성부터 적용됩니다."}
              {state === "error" && <span className="text-bad">저장하지 못했습니다.</span>}
            </span>
          </div>
        </div>
      </details>
    </Panel>
  );
}

function DocAnalysis({ docs, analysis, aiMode, onChange }: {
  docs: Material[]; analysis: { at?: string; mode?: "live" | "demo" }; aiMode: "live" | "demo"; onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  // localStorage is not available during prerender, so the saved key is read after mount.
  useEffect(() => {
    const saved = loadStoredKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) { setApiKey(saved); setRemember(true); }
  }, []);

  const real = docs.filter((m) => !m.demo);
  const analyzed = analysis.mode === "live" && !!analysis.at;
  // New material since the last analysis is what makes the button available.
  const stale = real.length > 0 && (!analyzed || real.some((m) => m.uploadedAt > analysis.at!));
  const needsKey = aiMode === "demo";
  const key = apiKey.trim();

  async function run() {
    setBusy(true);
    setError("");
    if (needsKey) storeKey(remember && key ? key : null);
    try {
      await analyze(!needsKey, key || undefined);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      {needsKey && stale && (
        <div className="mb-3 rounded-xl bg-canvas p-3">
          <label className="block">
            <span className="text-xs font-bold">Anthropic API 키</span>
            <span className="ml-2 text-xs text-mute">서버에 키가 없어 직접 입력이 필요합니다</span>
            <input
              type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={apiKey} disabled={busy}
              onChange={(e) => setApiKey(e.target.value)} className={`${input} mt-2 font-mono`}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-brand" />
              이 브라우저에 기억
            </label>
            {apiKey && <button type="button" className="font-semibold hover:text-bad" onClick={() => { setApiKey(""); setRemember(false); storeKey(null); }}>키 지우기</button>}
            <span>키는 이 브라우저에서 Anthropic으로만 전송되고, 문서도 함께 전송됩니다.</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button className={btn.primary} disabled={busy || !stale || (needsKey && !key)} onClick={run}>
          {busy ? "문서를 읽는 중… (1~2분)" : "문서 분석하기"}
        </button>
        <p role="status" className="min-w-0 flex-1 text-xs leading-relaxed text-mute">
          {busy ? "차별점과 근거 페이지를 찾고 있습니다."
            : stale ? "새로 올린 문서가 있습니다. 분석하면 차별점 카드가 이 문서 기준으로 바뀝니다. 가이드라인은 바뀌지 않습니다."
            : real.length > 0 ? `${fmtDate(analysis.at!, true)}에 분석했습니다. 새 문서를 올리면 다시 분석할 수 있습니다.`
            : "기본 탑재 문서는 이미 분석되어 있습니다. 새 문서를 올리면 분석 버튼이 켜집니다."}
        </p>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}

const vocTone = { "도입 문의": "good", "기능 질문": "neutral", "도입 우려": "warn", "불만·장애": "bad" } as const;

function VocCard({ voc, differentiators, aiMode, onChange }: {
  voc?: VocBoard; differentiators: Differentiator[]; aiMode: "live" | "demo"; onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Without a key (or a server) the analysis cannot read the pasted text, so say so up front.
  const sampleOnly = isStaticDemo || aiMode === "demo";

  async function run(input: Parameters<typeof analyzeVoc>[0]) {
    setBusy(true);
    setError("");
    try {
      await analyzeVoc(input);
      setText("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
    }
    setBusy(false);
  }

  return (
    <Panel
      title="고객 통화 요약 (VOC)"
      action={voc ? <button className={btn.text} onClick={async () => { await clearVoc().catch(() => undefined); onChange(); }}>질문 목록 지우기</button> : undefined}
    >
      <p className="-mt-2 mb-4 text-xs leading-relaxed text-mute">
        상담 통화 요약을 넣으면 고객이 자주 묻는 질문을 뽑아, 검색어 트렌드와 함께 다음 콘텐츠의 주제로 씁니다. 통화마다 빈 줄로 구분해 붙여 넣거나 CRM 상담 이력 파일(TXT, CSV, XLSX)을 올리세요.
      </p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <label className="block">
            <span className="sr-only">통화 요약 붙여넣기</span>
            <textarea
              className={`${input} min-h-40`} rows={7} value={text} disabled={busy}
              placeholder={"통화 요약을 붙여 넣으세요.\n\n통화와 통화 사이는 빈 줄로 구분합니다."}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn.primary} disabled={busy || !text.trim()} onClick={() => run({ text })}>{busy ? "분석하는 중…" : "분석하기"}</button>
            <input ref={fileRef} type="file" accept=".txt,.csv,.xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run({ file: f }); }} />
            <button className={btn.ghost} disabled={busy || isStaticDemo} title={isStaticDemo ? "서버 배포 버전에서 사용할 수 있습니다" : undefined} onClick={() => fileRef.current?.click()}>파일 올리기</button>
            <button className={btn.ghost} disabled={busy} onClick={() => run({ sample: true })}>샘플 통화 요약으로 분석해 보기</button>
          </div>
          {sampleOnly && (
            <p className="mt-3 text-xs leading-relaxed text-warn">
              {isStaticDemo ? "GitHub Pages 데모" : "API 키가 없는 데모 모드"}에서는 입력한 내용과 관계없이 준비된 샘플 분석 결과를 보여 줍니다.
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-bad">{error}</p>}
        </div>
        <div>
          {voc ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-xs text-mute">
                {voc.mode === "sample" && <Badge tone="warn">[샘플]</Badge>}
                <span>{voc.source}{voc.period ? ` · ${voc.period}` : ""}</span>
              </p>
              <ol className="mt-3 space-y-2.5">
                {voc.items.map((v) => (
                  <li key={v.id} className="rounded-xl border border-line bg-canvas/40 p-3">
                    <p className="text-sm font-bold leading-snug">{v.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {voc.mode === "sample" && <Badge tone="warn">[샘플]</Badge>}
                      <Badge tone={vocTone[v.category]}>{v.category}</Badge>
                      <Badge>통화 {v.count}건</Badge>
                      {v.differentiatorIds.map((id) => (
                        <Badge key={id} tone="solid">{differentiators.find((d) => d.id === id)?.title ?? id}</Badge>
                      ))}
                      {v.differentiatorIds.length === 0 && <span className="text-xs text-mute">문서로 답할 수 없어 주제 후보에서 제외</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="rounded-xl bg-canvas px-4 py-10 text-center text-sm leading-relaxed text-mute">
              아직 분석한 고객 질문이 없습니다. 이 상태에서는 검색어 트렌드만으로 주제를 정합니다.
            </p>
          )}
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        통화 원문은 저장하지 않습니다. 번호·이메일은 분석 전에 가리고, 질문 유형과 빈도만 저장합니다. 고객 통화 내용을 마케팅에 활용하기 전에 개인정보 처리방침의 이용 범위를 확인하세요.
      </p>
    </Panel>
  );
}
