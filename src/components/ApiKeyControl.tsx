"use client";

import { useEffect, useRef, useState } from "react";
import { getWorkspace } from "@/lib/client/api";
import { KEY_EVENT, loadStoredKey, storeKey } from "@/lib/client/apiKeyStore";
import { btn } from "./ui";

/** Other screens fire this to bring up the key panel (e.g. "enter a key to analyze"). */
export const OPEN_KEY_EVENT = "raptor:open-key";
export const openKeyPanel = () => window.dispatchEvent(new Event(OPEN_KEY_EVENT));

/**
 * Site-wide Anthropic key entry in the header. With a key every AI feature runs for real
 * (analysis, generation, review, rewrite suggestions); without one the prepared demo copy is shown.
 */
export function ApiKeyControl() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [serverKey, setServerKey] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setSaved(loadStoredKey());
    sync();
    getWorkspace().then((r) => setServerKey(r.modes.serverKey)).catch(() => undefined);
    const show = () => setOpen(true);
    window.addEventListener(KEY_EVENT, sync);
    window.addEventListener(OPEN_KEY_EVENT, show);
    return () => { window.removeEventListener(KEY_EVENT, sync); window.removeEventListener(OPEN_KEY_EVENT, show); };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [open]);

  const live = serverKey || !!saved;
  const key = draft.trim();
  // Catches pasted junk early; the API itself has the final say.
  const looksValid = /^sk-ant-[\w-]{20,}$/.test(key);

  return (
    <div ref={boxRef} className="relative ml-auto">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="my-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold transition-colors hover:border-brand">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-ok" : "bg-accent-strong"}`} aria-hidden="true" />
        {live ? "AI 연결됨" : "API 키 입력"}
      </button>
      {open && (
        <div role="dialog" aria-label="Anthropic API 키" className="absolute right-0 top-full z-30 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-lg">
          <p className="text-sm font-bold">Anthropic API 키</p>
          {serverKey ? (
            <p className="mt-2 text-sm leading-relaxed text-mute">이 사이트에는 키가 설정되어 있어 따로 입력하지 않아도 됩니다.</p>
          ) : saved ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-mute">키가 저장되어 있습니다(끝자리 {saved.slice(-4)}). 문서 분석, 콘텐츠 생성, 검수, 수정 추천을 실제 AI로 실행합니다.</p>
              <button type="button" className={`${btn.ghost} mt-3`} onClick={() => { storeKey(null); setDraft(""); }}>키 지우기</button>
            </>
          ) : (
            <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if (looksValid) { storeKey(key); setDraft(""); setOpen(false); } }}>
              <label className="block">
                <span className="sr-only">API 키</span>
                <input ref={inputRef} type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none" />
              </label>
              {key && !looksValid && <p role="alert" className="mt-1.5 text-xs text-bad">sk-ant- 로 시작하는 키를 입력해 주세요.</p>}
              <button type="submit" className={`${btn.primary} mt-3 w-full`} disabled={!looksValid}>저장하고 AI 켜기</button>
              <p className="mt-3 text-xs leading-relaxed text-mute">
                키가 없으면 미리 준비된 원고로 흐름만 볼 수 있습니다. 키를 넣으면 올린 자료로 실제 분석과 생성을 합니다.
              </p>
            </form>
          )}
          {!serverKey && (
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-mute">
              키는 이 브라우저에만 저장되고 AI 요청에만 쓰입니다. 공용 컴퓨터에서는 사용 후 지워 주세요. 사용량은 해당 키의 계정에 청구됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
