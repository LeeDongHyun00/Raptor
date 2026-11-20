"use client";

import { useRef, useState } from "react";
import type { Guideline, Material, MaterialKind } from "@/lib/types";
import { assetUrl, isStaticDemo, removeMaterial, saveGuideline, uploadMaterial } from "@/lib/client/api";
import { Badge, Panel, btn } from "./ui";

const KINDS: { kind: MaterialKind; title: string; hint: string; accept: string }[] = [
  { kind: "doc", title: "제품 문서", hint: "제안서·매뉴얼 (PDF, PPTX · 4MB 이하)", accept: ".pdf,.pptx" },
  { kind: "screenshot", title: "실제 사용 화면 캡처", hint: "PNG, JPG, WEBP · 4MB 이하", accept: ".png,.jpg,.jpeg,.webp" },
];

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))}KB` : "");

export function MaterialsManager({ materials, guideline, onChange }: { materials: Material[]; guideline: Guideline; onChange: () => void }) {
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
      {isStaticDemo && (
        <p className="rounded-xl border border-horn/40 bg-horn-soft px-4 py-3 text-sm leading-relaxed text-[#6d4708]">
          지금 보시는 것은 서버 없이 동작하는 <strong>GitHub Pages 데모</strong>입니다. 파일 업로드는 서버 배포 버전에서만 되고, 가이드라인 수정은 이 브라우저에 저장되어 다음 생성의 검수에 바로 반영됩니다.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        {KINDS.map(({ kind, title, hint, accept }) => {
          const items = materials.filter((m) => m.kind === kind);
          return (
            <Panel key={kind} title={title} action={<UploadButton accept={accept} multiple busy={busy === kind} onFiles={(f) => upload(kind, f)} />}>
              <p className="-mt-2 mb-4 text-xs text-mute">{hint}</p>
              {kind === "screenshot" ? (
                <ul className="grid grid-cols-2 gap-3">
                  {items.map((m) => (
                    <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-cream/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(m.id)} alt={m.description ?? m.name} className="aspect-video w-full bg-cream object-cover" />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="break-all text-xs font-semibold leading-snug">{m.name}</p>
                          {m.demo ? <Badge tone="warn">샘플</Badge> : <RemoveButton onClick={() => remove(m.id)} name={m.name} />}
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
                        <p className="text-xs text-mute">{m.demo ? "실제 파일 없이 샘플 분석 결과만 연결되어 있습니다" : size(m.size)}</p>
                      </div>
                      {m.demo ? <Badge tone="warn">샘플</Badge> : <RemoveButton onClick={() => remove(m.id)} name={m.name} />}
                    </li>
                  ))}
                </ul>
              )}
              {items.length === 0 && <p className="rounded-xl bg-cream px-4 py-6 text-center text-sm text-mute">아직 올린 파일이 없습니다.</p>}
              {kind === "doc" && items.some((m) => !m.demo) && (
                <p className="mt-4 text-xs text-mute">문서를 바꿨다면 ‘차별점 분석’ 페이지에서 다시 분석을 실행하세요.</p>
              )}
            </Panel>
          );
        })}
      </div>
      <GuidelineEditor
        key={guideVersion}
        guideline={guideline}
        onSaved={onChange}
        uploadButton={<UploadButton accept=".xlsx,.xls" label="엑셀로 불러오기" busy={busy === "guideline"} onFiles={(f) => upload("guideline", f)} />}
      />
    </div>
  );
}

function UploadButton({ accept, multiple, busy, onFiles, label = "파일 올리기" }: {
  accept: string; multiple?: boolean; busy: boolean; onFiles: (f: FileList | null) => void; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <button className={btn.ghost} disabled={busy || isStaticDemo} title={isStaticDemo ? "서버 배포 버전에서 사용할 수 있습니다" : undefined} onClick={() => ref.current?.click()}>{busy ? "올리는 중…" : label}</button>
    </>
  );
}

function RemoveButton({ onClick, name }: { onClick: () => void; name: string }) {
  return <button onClick={onClick} aria-label={`${name} 삭제`} className="shrink-0 text-xs font-semibold text-mute hover:text-bad">삭제</button>;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed focus:border-forest focus:outline-none";

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
      <p className="-mt-2 mb-5 text-xs leading-relaxed text-mute">
        현재 기준: {guideline.source}. 엑셀은 첫 열에 구분(키워드·미션·구성·글자수), 둘째 열에 내용, 키워드 행의 셋째 열에 최소 횟수를 적으면 읽어 옵니다.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">필수 키워드</span>
          <span className="ml-2 text-xs text-mute">한 줄에 하나 · “키워드 | 최소 횟수” · 코드로 정확히 검사</span>
          <textarea className={`${input} mt-2`} rows={5} value={keywords} onChange={(e) => { setKeywords(e.target.value); setState("idle"); }} />
        </label>
        <label className="block">
          <span className="text-sm font-bold">미션</span>
          <span className="ml-2 text-xs text-mute">한 줄에 하나 · AI가 충족 여부를 판정</span>
          <textarea className={`${input} mt-2`} rows={5} value={missions} onChange={(e) => { setMissions(e.target.value); setState("idle"); }} />
        </label>
        <label className="block">
          <span className="text-sm font-bold">글 구성 순서</span>
          <span className="ml-2 text-xs text-mute">한 줄에 하나</span>
          <textarea className={`${input} mt-2`} rows={4} value={structure} onChange={(e) => { setStructure(e.target.value); setState("idle"); }} />
        </label>
        <div>
          <label className="block">
            <span className="text-sm font-bold">최소 글자 수</span>
            <span className="ml-2 text-xs text-mute">본문, 공백 제외</span>
            <input className={`${input} mt-2 max-w-40 tabular-nums`} inputMode="numeric" value={minChars} onChange={(e) => { setMinChars(e.target.value.replace(/\D/g, "")); setState("idle"); }} />
          </label>
          <p className="mt-4 rounded-xl bg-cream p-3 text-xs leading-relaxed text-mute">
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
    </Panel>
  );
}
