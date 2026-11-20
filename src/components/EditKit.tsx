"use client";

import { createContext, createElement, useContext, useState } from "react";
import type { Run } from "@/lib/types";
import type { EditSuggestion } from "@/lib/suggestRules";
import { contentOf, getAt, labelOf, setAt, type RunContent } from "@/lib/content";
import { saveContent, suggestEdits } from "@/lib/client/api";
import { openKeyPanel } from "./ApiKeyControl";
import { btn } from "./ui";

/**
 * Editing for every piece of copy a run produced. Each text is addressed by a path
 * ("cards.slides.2.title"); <T> renders it as text, or as an input while editing.
 * Dragging over a text selects it for AI rewrite suggestions.
 */

const Ctx = createContext<{ content: RunContent; draft: RunContent | null; edit: (path: string, value: string) => void } | null>(null);

const fieldClass = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 leading-relaxed focus:border-brand focus:outline-none";

export function T({ path, as = "span", className = "", multiline = false }: {
  path: string; as?: "span" | "p" | "h2" | "h3" | "strong" | "figcaption"; className?: string; multiline?: boolean;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  if (ctx.draft) {
    const value = getAt(ctx.draft, path) ?? "";
    return multiline ? (
      <textarea aria-label={labelOf(path)} className={`${fieldClass} ${className}`} rows={Math.max(2, Math.ceil(value.length / 40))} value={value} onChange={(e) => ctx.edit(path, e.target.value)} />
    ) : (
      <input aria-label={labelOf(path)} className={`${fieldClass} ${className}`} value={value} onChange={(e) => ctx.edit(path, e.target.value)} />
    );
  }
  return createElement(as, { "data-path": path, className }, getAt(ctx.content, path) ?? "");
}

export function EditArea({ run, onChange, children }: { run: Run; onChange: (run: Run) => void; children: React.ReactNode }) {
  const content = contentOf(run);
  const [draft, setDraft] = useState<RunContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // The passage the reviewer selected by dragging, and the advice asked for it.
  const [sel, setSel] = useState<{ path: string; text: string } | null>(null);
  const [advice, setAdvice] = useState<{ loading: boolean; items: EditSuggestion[]; mode?: "live" | "demo" }>({ loading: false, items: [] });
  const clearSel = () => { setSel(null); setAdvice({ loading: false, items: [] }); };

  async function save(next: RunContent) {
    setSaving(true);
    setError("");
    try {
      onChange(await saveContent(run, next));
      setDraft(null);
      clearSel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    }
    setSaving(false);
  }

  function readSelection() {
    if (draft) return;
    const s = window.getSelection();
    const text = s?.toString().trim() ?? "";
    const el = (n: Node | null | undefined) => (n instanceof Element ? n : n?.parentElement)?.closest<HTMLElement>("[data-path]");
    const a = el(s?.anchorNode), f = el(s?.focusNode);
    // Only a selection inside one text can be replaced unambiguously.
    if (!a || a !== f || text.length < 2) return;
    setSel({ path: a.dataset.path!, text });
    setAdvice({ loading: false, items: [] });
    setError("");
  }

  async function ask() {
    if (!sel) return;
    setAdvice({ loading: true, items: [] });
    setError("");
    try {
      const res = await suggestEdits(run, sel.path, sel.text);
      setAdvice({ loading: false, items: res.suggestions, mode: res.mode });
    } catch (e) {
      setAdvice({ loading: false, items: [] });
      setError(e instanceof Error ? e.message : "추천을 받지 못했습니다.");
    }
  }

  function apply(rewrite: string) {
    if (!sel) return;
    const value = getAt(content, sel.path) ?? "";
    if (!value.includes(sel.text)) return setError("선택한 문구를 찾지 못했습니다. 다시 선택해 주세요.");
    save(setAt(content, sel.path, value.replace(sel.text, rewrite)));
  }

  return (
    <Ctx.Provider value={{ content, draft, edit: (path, value) => setDraft((d) => (d ? setAt(d, path, value) : d)) }}>
      <div className="sticky top-14 z-10 rounded-xl border border-accent/40 bg-accent-soft p-3 text-sm shadow-sm">
        {draft ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="leading-relaxed text-warn">문구를 직접 고치는 중입니다. 저장하면 가이드라인 검수를 다시 거칩니다.</p>
            <div className="flex gap-2">
              <button className={btn.ghost} disabled={saving} onClick={() => { setDraft(null); setError(""); }}>취소</button>
              <button className={btn.primary} disabled={saving} onClick={() => save(draft)}>{saving ? "저장하고 검수하는 중…" : "저장하고 다시 검수"}</button>
            </div>
          </div>
        ) : sel ? (
          <>
            <p className="text-xs font-bold text-warn">선택한 부분 · {labelOf(sel.path)}</p>
            <p className="mt-1 line-clamp-3 leading-relaxed">“{sel.text}”</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button className={btn.primary} disabled={advice.loading || saving} onClick={ask}>{advice.loading ? "추천을 만드는 중…" : "AI 수정 방향 추천"}</button>
              <button className={btn.ghost} onClick={() => { setDraft(content); clearSel(); }}>직접 수정</button>
              <button className={btn.text} onClick={clearSel}>선택 해제</button>
            </div>
            {advice.items.length > 0 && (
              <ol className="mt-3 space-y-2">
                {advice.items.map((it, i) => (
                  <li key={i} className="rounded-lg bg-surface p-3">
                    <p className="text-sm font-semibold leading-relaxed">{i + 1}. {it.direction}</p>
                    {it.rewrite && (
                      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 rounded-md bg-brand-soft px-3 py-2 text-sm leading-relaxed">{it.rewrite}</p>
                        <button className={btn.ghost} disabled={saving} onClick={() => apply(it.rewrite!)}>이렇게 바꾸기</button>
                      </div>
                    )}
                  </li>
                ))}
                {advice.mode === "demo" && (
                  <li className="text-xs leading-relaxed text-warn">
                    API 키가 없어 문장 특성에 따른 일반 조언만 보여 줍니다. <button type="button" className="font-bold underline" onClick={openKeyPanel}>API 키를 입력</button>하면 선택한 문구를 방향별로 다시 써 줍니다.
                  </li>
                )}
              </ol>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="leading-relaxed text-warn">고치고 싶은 문구를 <strong>드래그해서 선택</strong>하면 AI가 수정 방향을 추천합니다.</p>
            <button className={btn.ghost} onClick={() => setDraft(content)}>직접 수정</button>
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
      </div>
      <div onMouseUp={readSelection} onTouchEnd={readSelection} onKeyUp={readSelection}>{children}</div>
    </Ctx.Provider>
  );
}

/** True while the surrounding EditArea is in direct-edit mode. */
export const useEditing = () => !!useContext(Ctx)?.draft;
