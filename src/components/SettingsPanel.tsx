"use client";

import { useState } from "react";
import type { ProductionSettings } from "@/lib/types";
import { CONCEPTS, DESIGNS, OUTPUTS } from "@/lib/settings";
import { saveSettings } from "@/lib/client/api";
import { openKeyPanel } from "./ApiKeyControl";
import { Panel } from "./ui";

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "border-brand bg-brand text-surface" : "border-line bg-surface text-mute hover:border-brand hover:text-ink"}`;
const field = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed focus:border-brand focus:outline-none";

/** Filters applied to the next run: which channels, which tone and look, for whom. */
export function SettingsPanel({ initial, aiMode, onSaved }: { initial: ProductionSettings; aiMode: "live" | "demo"; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  async function save(next: ProductionSettings) {
    setS(next);
    try {
      await saveSettings(next);
      setState("saved");
      onSaved();
    } catch {
      setState("error");
    }
  }

  const count = Object.values(s.outputs).filter(Boolean).length;

  return (
    <Panel
      title="제작 설정"
      action={<span role="status" className="text-xs text-mute">{state === "saved" ? "저장했습니다 · 다음 실행부터 적용" : state === "error" ? <span className="text-bad">저장하지 못했습니다</span> : "다음 실행에 적용됩니다"}</span>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-bold">만들 채널 <span className="ml-1 font-normal text-mute">{count}개 선택</span></legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {OUTPUTS.map((o) => {
              const on = s.outputs[o.id];
              return (
                <button
                  key={o.id} type="button" aria-pressed={on} className={chip(on)}
                  // The last remaining channel cannot be switched off: a run must make something.
                  disabled={on && count === 1}
                  onClick={() => save({ ...s, outputs: { ...s.outputs, [o.id]: !on } })}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-mute">끈 채널은 만들지도 검수하지도 않습니다. 가이드라인의 키워드·미션 검수는 블로그를 만들 때만 적용됩니다.</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold">컨셉</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {CONCEPTS.map((c) => (
              <button key={c.id} type="button" aria-pressed={s.concept === c.id} className={chip(s.concept === c.id)} onClick={() => save({ ...s, concept: c.id })}>{c.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-mute">{CONCEPTS.find((c) => c.id === s.concept)?.hint}</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold">디자인 <span className="ml-1 font-normal text-mute">카드뉴스·배너 색상</span></legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DESIGNS.map((d) => {
              const on = s.design === d.id;
              return (
                <button key={d.id} type="button" aria-pressed={on} onClick={() => save({ ...s, design: d.id })}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}>
                  <span className="flex overflow-hidden rounded-md border border-line" aria-hidden="true">
                    <span className="h-7 w-4" style={{ background: d.dark }} />
                    <span className="h-7 w-4" style={{ background: d.light }} />
                    <span className="h-7 w-4" style={{ background: d.accent }} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold leading-tight">{d.label}</span>
                    <span className="block text-xs text-mute">{d.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-bold">타깃 고객</span>
            <input className={`${field} mt-2`} value={s.audience} maxLength={80}
              onChange={(e) => { setS({ ...s, audience: e.target.value }); setState("idle"); }}
              onBlur={() => save(s)} />
          </label>
          <label className="block">
            <span className="text-sm font-bold">제품 정보 메모</span>
            <span className="ml-2 text-xs text-mute">문서에 없는 사실을 직접 적습니다</span>
            <textarea className={`${field} mt-2`} rows={2} maxLength={400} value={s.productNotes}
              placeholder="예: 장비 크기가 작아 좁은 사무실에도 설치할 수 있음"
              onChange={(e) => { setS({ ...s, productNotes: e.target.value }); setState("idle"); }}
              onBlur={() => save(s)} />
          </label>
        </div>
      </div>
      {aiMode === "demo" && (
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-warn">
          API 키가 없어 준비된 원고를 보여 줍니다. 채널 선택과 디자인은 그대로 반영되지만, 컨셉·타깃 고객·제품 정보 메모는 <button type="button" className="font-bold underline" onClick={openKeyPanel}>API 키를 입력</button>해 실제로 생성할 때 문구에 반영됩니다.
        </p>
      )}
    </Panel>
  );
}
