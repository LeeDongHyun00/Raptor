"use client";

import Link from "next/link";
import { BASE, getRuns, getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { INTERVAL_DAYS, nextRunAt } from "@/lib/pipelineCore";
import { Badge, Loading, Panel, StatusBadge, fmtDate } from "../ui";
import { ResetHistoryButton, RunNowButton } from "../RunControls";
import { SettingsPanel } from "../SettingsPanel";
import { RunImage } from "../RunImage";
import { resolveSettings } from "@/lib/settings";
import { fmtDuration, totalDuration } from "@/lib/timing";

const FLOW = [
  { n: "1", title: "차별점 분석", body: "제안서·매뉴얼에서 강점을 뽑고 근거 페이지를 표시" },
  { n: "2", title: "트렌드·고객 질문 연결", body: "통화에서 나온 고객 질문과 2주간 검색어·뉴스에서 답할 주제를 선정" },
  { n: "3", title: "채널별 동시 생성", body: "하나의 핵심 메시지를 채널마다 맞는 형식으로 제작" },
  { n: "4", title: "자동 검수", body: "키워드·미션·채널별 형식 규칙을 검사하고 미충족 부분만 다시 작성" },
  { n: "5", title: "담당자 승인", body: "검토 후 승인하면 복사·내보내기로 직접 업로드" },
];

/** Output formats per channel; the picture carries the channel, the caption only names it. */
const CHANNELS = [
  { key: "blog", label: "네이버 블로그", spec: "글 · HTML" },
  { key: "instagram", label: "인스타그램", spec: "카드 6~8장" },
  { key: "email", label: "이메일", spec: "메일 HTML" },
  { key: "kakao", label: "카카오톡 배너", spec: "1029×258 PNG" },
  { key: "shorts", label: "쇼츠·릴스", spec: "15~30초 대본" },
  { key: "search", label: "검색광고", spec: "문안 3개" },
];

export function DashboardScreen() {
  const { data, error, reload } = useLoad(async () => {
    const [{ ws, modes }, runs] = await Promise.all([getWorkspace(), getRuns()]);
    return { ws, modes, runs };
  });
  if (!data) return <Loading error={error} />;
  const { ws, modes, runs } = data;
  const pending = runs.filter((r) => r.status === "pending" || r.status === "running");
  const next = nextRunAt(runs);
  const used = runs.filter((r) => r.plan && r.status !== "failed");
  // How long the most recent finished run took, as a reference for the next one.
  const lastDone = runs.find((r) => r.status !== "running" && r.status !== "failed");
  const lastMs = lastDone ? totalDuration(lastDone) : null;
  // Latest non-failed run per customer question.
  const answered: Record<string, (typeof runs)[number]> = {};
  for (const r of [...runs].reverse()) if (r.status !== "failed" && r.plan?.vocId) answered[r.plan.vocId] = r;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl bg-brand text-surface">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="eyebrow text-accent">Content Autopilot</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
              통화가 끝나면 보고서가 시작되고, 보고서가 쌓이면 홍보가 시작됩니다
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface/80">
              고객이 통화에서 실제로 물어본 질문과 요즘 트렌드를 엮어 채널별 소재를 만들고, 검수까지 마쳐 승인함에 올립니다.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 self-end lg:grid-cols-1">
            <Stat label="승인 대기" value={pending.length} unit="건" />
            <Stat label="차별점" value={ws.differentiators.length} unit="개" />
            <Stat label="다룬 주제" value={used.length} unit="개" />
          </dl>
        </div>
      </section>

      <SettingsPanel
        initial={resolveSettings(ws.settings)}
        aiMode={modes.ai}
        onSaved={reload}
        footer={
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <RunNowButton label="이 설정으로 지금 실행" withDemo />
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-mute">
              <div className="flex gap-1.5"><dt>예상 소요</dt><dd className="font-bold text-ink">{modes.ai === "live" ? "보통 1~3분 · 데모는 약 5초" : "약 5초"}</dd></div>
              {lastMs != null && <div className="flex gap-1.5"><dt>지난 실행</dt><dd className="font-bold text-ink">{fmtDuration(lastMs)}</dd></div>}
              <div className="flex gap-1.5"><dt>다음 자동 실행</dt><dd className="font-bold text-ink">{next ? fmtDate(next) : "첫 실행 후 2주 뒤"} · {INTERVAL_DAYS}일 주기</dd></div>
            </dl>
          </div>
        }
      />

      <section aria-labelledby="flow-title">
        <SectionHead eyebrow="How it works" id="flow-title" title="분석부터 승인까지, 5단계로 진행됩니다" />
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {FLOW.map((f) => (
            <li key={f.n} className="bg-surface p-5">
              <span className="text-xs font-extrabold tabular-nums text-brand">{f.n.padStart(2, "0")}</span>
              <p className="mt-2 text-sm font-bold">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-mute">{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="channel-title">
        <SectionHead eyebrow="Channels" id="channel-title" title="한 메시지, 6개 채널" />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CHANNELS.map((c) => (
            <li key={c.key}>
              <figure className="overflow-hidden rounded-xl border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${BASE}/channels/${c.key}.svg`} alt={`${c.label} 소재 예시`} width={480} height={360} className="aspect-[4/3] w-full" />
                <figcaption className="border-t border-line px-3 py-2.5">
                  <span className="block whitespace-nowrap text-sm font-bold">{c.label}</span>
                  <span className="block text-[11px] text-mute">{c.spec}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <Panel eyebrow="Review" title="승인 대기열">
        {pending.length === 0 ? (
          <p className="rounded-xl bg-canvas px-4 py-8 text-center text-sm text-mute">
            검토할 결과물이 없습니다. 위의 ‘지금 실행’으로 이번 회차를 바로 만들어 볼 수 있습니다.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {pending.map((r) => (
              <li key={r.id}>
                <Link href={`/run?id=${r.id}`} className="flex gap-4 rounded-xl border border-line bg-canvas/50 p-3 transition-colors hover:border-brand">
                  {r.cards && r.status !== "running" ? (
                    <RunImage run={r} kind="card" index={0} alt="" className="h-[150px] w-[120px] shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="h-[150px] w-[120px] shrink-0 animate-pulse rounded-lg bg-brand-soft" />
                  )}
                  <div className="flex min-w-0 flex-col py-1">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.plan && <Badge>{r.plan.trendKeyword}</Badge>}
                    </div>
                    <p className="mt-2 font-bold leading-snug">{r.plan?.topic ?? `${r.step} 진행 중…`}</p>
                    <p className="mt-auto pt-2 text-xs text-mute">
                      {fmtDate(r.createdAt)} · {r.trigger === "cron" ? "격주 자동" : "수동 실행"}
                      {r.review && ` · 가이드라인 ${r.review.passed}/${r.review.total}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {ws.voc && (
        <Panel
          eyebrow="Voice of customer"
          title="고객 질문 보드"
          action={<span className="text-sm text-mute">고객 질문 {ws.voc.items.length}개 중 <strong className="font-extrabold text-ink">{ws.voc.items.filter((v) => answered[v.id]).length}개</strong>에 답했습니다</span>}
        >
          <p className="-mt-2 mb-4 flex flex-wrap items-center gap-2 text-xs text-mute">
            {ws.voc.mode === "sample" && <Badge tone="warn">[샘플]</Badge>}
            <span>{ws.voc.source}</span>
          </p>
          <ol className="divide-y divide-line/70">
            {ws.voc.items.map((v) => {
              const run = answered[v.id];
              const open = v.differentiatorIds.length > 0;
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{v.question}</p>
                    <p className="mt-0.5 text-xs text-mute">{v.category} · 통화 {v.count}건</p>
                  </div>
                  {run ? (
                    <Link href={`/run?id=${run.id}`} className="shrink-0"><Badge tone="good">답함 ✓</Badge></Link>
                  ) : (
                    <Badge tone={open ? "warn" : "neutral"}>{open ? "다음 후보" : "문서로 답할 수 없음"}</Badge>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-mute">2주마다 아직 답하지 않은 질문으로 넘어갑니다. 통화 수는 이 화면에서만 보이고 외부 콘텐츠에는 쓰지 않습니다.</p>
        </Panel>
      )}

      <Panel eyebrow="History" title="생성 이력" action={runs.length > 0 ? <ResetHistoryButton onDone={reload} /> : undefined}>
        {runs.length === 0 ? (
          <p className="text-sm text-mute">아직 생성 이력이 없습니다. 한 번 다룬 주제는 여기에 기록되어 다음 회차에서 다시 쓰지 않습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-mute">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-semibold">실행일</th>
                  <th className="py-2 pr-3 font-semibold">주제</th>
                  <th className="py-2 pr-3 font-semibold">트렌드</th>
                  <th className="py-2 pr-3 font-semibold">검수</th>
                  <th className="py-2 font-semibold">상태</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-mute">{fmtDate(r.createdAt)}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/run?id=${r.id}`} className="font-semibold underline-offset-4 hover:underline">
                        {r.plan?.topic ?? (r.status === "failed" ? "생성 실패" : "생성 중…")}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-mute">{r.plan?.trendKeyword ?? "–"}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-mute">{r.review ? `${r.review.passed}/${r.review.total}` : "–"}</td>
                    <td className="py-2.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg bg-surface/10 px-4 py-3">
      <dt className="text-xs text-surface/70">{label}</dt>
      <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}<span className="ml-0.5 text-sm font-bold text-surface/70">{unit}</span></dd>
    </div>
  );
}

function SectionHead({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="mb-4">
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-lg font-extrabold tracking-tight">{title}</h2>
    </div>
  );
}
