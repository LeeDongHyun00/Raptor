"use client";

import Link from "next/link";
import { cardUrl, getRuns, getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { INTERVAL_DAYS, nextRunAt } from "@/lib/pipelineCore";
import { Badge, Loading, Panel, StatusBadge, btn, fmtDate } from "../ui";
import { ResetHistoryButton, RunNowButton } from "../RunControls";

const FLOW = [
  { n: "1", title: "차별점 분석", body: "제안서·매뉴얼에서 강점을 뽑고 근거 페이지를 표시" },
  { n: "2", title: "트렌드 연결", body: "2주간 검색어·뉴스에서 제품과 맞는 주제를 선정" },
  { n: "3", title: "6개 채널 동시 생성", body: "하나의 핵심 메시지를 블로그·인스타그램·이메일·카카오톡 배너·쇼츠·검색광고 형식으로" },
  { n: "4", title: "자동 검수", body: "키워드·미션·채널별 형식 규칙을 검사하고 미충족 부분만 다시 작성" },
  { n: "5", title: "담당자 승인", body: "검토 후 승인하면 복사·내보내기로 직접 업로드" },
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
  const usingSample = ws.materials.some((m) => m.demo);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-forest text-cream">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-horn">{ws.product.company} · {ws.product.name}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              자료만 넣어 두면,<br />2주마다 6개 채널 소재가 승인함에 도착합니다
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream/80">
              {ws.product.summary}의 차별점을 요즘 트렌드와 엮어 하나의 핵심 메시지를 정하고, 블로그·인스타그램·이메일·카카오톡 배너·쇼츠·검색광고에 맞는 형식으로 각각 만든 뒤 검수까지 마쳐 담당자 승인을 기다립니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <RunNowButton />
              <p className="text-sm text-cream/80">
                다음 자동 실행 <strong className="font-bold text-cream">{next ? fmtDate(next) : "첫 실행 후 2주 뒤"}</strong>
                <span className="text-cream/60"> · {INTERVAL_DAYS}일 주기</span>
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 self-end text-center lg:grid-cols-1 lg:text-left">
            <Stat label="승인 대기" value={`${pending.length}건`} />
            <Stat label="차별점 카드" value={`${ws.differentiators.length}개`} />
            <Stat label="다룬 주제" value={`${used.length}개`} />
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-cream/15 bg-ink/25 px-6 py-3 text-xs sm:px-9">
          <Mode on={modes.ai === "live"} onText="AI: Claude 실제 생성" offText="AI: 데모 모드(문서 기반 준비 원고)" />
          <Mode on={modes.trend === "live"} onText="트렌드: 네이버 데이터랩" offText="트렌드: 샘플 데이터" />
          <Mode on={modes.storage === "supabase"} onText="저장소: Supabase" offText={{ supabase: "", file: "저장소: 로컬 파일", ephemeral: "저장소: 임시(재시작 시 초기화)", browser: "저장소: 이 브라우저(GitHub Pages 데모)" }[modes.storage]} />
          {usingSample && <Mode on onText="자료: 회사 문서 4종 사전 분석" offText="" />}
        </div>
      </section>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FLOW.map((f) => (
          <li key={f.n} className="rounded-2xl border border-line bg-paper p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-horn-soft text-sm font-extrabold text-[#8a5a0b]">{f.n}</span>
            <p className="mt-2.5 text-sm font-bold">{f.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">{f.body}</p>
          </li>
        ))}
      </ol>

      <Panel title="승인 대기열">
        {pending.length === 0 ? (
          <p className="rounded-xl bg-cream px-4 py-8 text-center text-sm text-mute">
            검토할 결과물이 없습니다. 위의 ‘지금 실행’으로 이번 회차를 바로 만들어 볼 수 있습니다.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {pending.map((r) => (
              <li key={r.id}>
                <Link href={`/run?id=${r.id}`} className="flex gap-4 rounded-xl border border-line bg-cream/50 p-3 transition-colors hover:border-forest">
                  {r.cards ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardUrl(r, 0)} alt="" className="h-[150px] w-[120px] shrink-0 rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="h-[150px] w-[120px] shrink-0 animate-pulse rounded-lg bg-forest-soft" />
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

      <Panel title="생성 이력" action={runs.length > 0 ? <ResetHistoryButton onDone={reload} /> : undefined}>
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

      <p className="text-center text-sm text-mute">
        자료를 바꾸려면 <Link href="/materials" className={btn.text}>자료·가이드라인</Link>, 분석 결과는 <Link href="/insights" className={btn.text}>차별점 분석</Link>에서 확인하세요.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream/10 px-4 py-3">
      <dt className="text-xs text-cream/70">{label}</dt>
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function Mode({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-cream/90">
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-[#7fd6a4]" : "bg-horn"}`} />
      {on ? onText : offText}
    </span>
  );
}
