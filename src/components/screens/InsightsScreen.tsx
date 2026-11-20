"use client";

import Link from "next/link";
import { getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { Badge, Loading, PageHeader, btn, fmtDate } from "../ui";

export function InsightsScreen() {
  const { data, error } = useLoad(getWorkspace);
  if (!data) return <Loading error={error} />;
  const { ws } = data;
  const sample = ws.analysisMode !== "live";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Differentiators"
        title="일반적인 방식과 비교해, 무엇이 다른지"
        sub="제안서와 매뉴얼에서 뽑은 강점입니다. 항목마다 근거 문서와 페이지를 함께 표시합니다."
        action={<Link href="/materials" className={btn.ghost}>자료에서 문서 분석하기</Link>}
      />

      {sample ? (
        <p className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand">
          회사 문서 4종(CRM 매뉴얼, 모바일 관리자 매뉴얼, PC폰 매뉴얼, 11월 가이드라인)을 읽고 <strong>미리 분석해 둔 결과</strong>입니다.
          새 문서를 <Link href="/materials" className="font-bold underline">자료 화면</Link>에 올리고 ‘문서 분석하기’를 누르면 그 문서 기준으로 바뀝니다.
        </p>
      ) : (
        <p className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand">
          올린 문서를 Claude가 읽고 분석한 결과입니다. 근거 페이지와 인용문은 원문과 대조해 확인하세요.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {ws.differentiators.map((d, i) => (
          <article key={d.id} id={d.id} className="flex scroll-mt-24 flex-col rounded-xl border border-line bg-surface p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-canvas">{i + 1}</span>
              <div>
                <h2 className="text-lg font-extrabold leading-snug">{d.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-mute">{d.plain}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-canvas p-4">
                <dt className="text-xs font-bold text-mute">일반적인 방식</dt>
                <dd className="mt-1.5 text-sm leading-relaxed">{d.conventional}</dd>
              </div>
              <div className="rounded-xl bg-brand-soft p-4">
                <dt className="text-xs font-bold text-brand">{ws.product.name}</dt>
                <dd className="mt-1.5 text-sm font-semibold leading-relaxed">{d.ours}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs font-bold text-mute">근거</p>
              <ul className="mt-2 space-y-2">
                {d.evidence.map((e, j) => (
                  <li key={j} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <Badge tone="solid">p.{e.page}</Badge>
                    <span className="font-semibold">{e.doc}</span>
                    <span className="text-mute">“{e.quote}”</span>
                  </li>
                ))}
                {d.evidence.length === 0 && <li className="text-sm text-bad">근거를 찾지 못한 항목입니다. 확인이 필요합니다.</li>}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <p className="text-xs text-mute">
        {ws.analyzedAt && `마지막 분석 ${fmtDate(ws.analyzedAt)}`}
      </p>
    </div>
  );
}
