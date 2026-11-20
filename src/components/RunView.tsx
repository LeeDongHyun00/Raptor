"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Review, Run } from "@/lib/types";
import { conceptOf, designOf, resolveSettings } from "@/lib/settings";
import { CHANNEL_LABEL } from "@/lib/review";
import { STEPS } from "@/lib/pipelineCore";
import { decideRun, getRun, isStaticDemo } from "@/lib/client/api";
import { EditArea } from "./EditKit";
import { BlogTab, CardsTab, EmailTab, KakaoTab, SearchTab, ShortsTab } from "./RunTabs";
import { openKeyPanel } from "./ApiKeyControl";
import { Badge, Panel, StatusBadge, btn, fmtDate } from "./ui";


type Tab = "blog" | "cards" | "email" | "kakao" | "shorts" | "search" | "plan";

interface Props {
  initial: Run;
  disclosure: string;
  adHashtag: string;
  emailFooter: string;
  differentiators: { id: string; title: string }[];
}

export function RunView({ initial, disclosure, adHashtag, emailFooter, differentiators }: Props) {
  const [run, setRun] = useState(initial);
  const [picked, setTab] = useState<Tab | null>(null);
  const ch = run.channels ?? {};
  // Only what this run actually made gets a tab.
  const tabs = ([
    run.blog && ["blog", "블로그"], run.cards && ["cards", "인스타그램"], ch.email && ["email", "이메일"],
    ch.kakao && ["kakao", "카카오톡 배너"], ch.shorts && ["shorts", "쇼츠·릴스"], ch.searchAds && ["search", "검색광고"],
    ["plan", "기획 근거"],
  ] as (false | undefined | [Tab, string])[]).filter((t): t is [Tab, string] => !!t);
  const tab = picked && tabs.some(([k]) => k === picked) ? picked : tabs[0][0];
  const [deciding, setDeciding] = useState(false);
  const [actionError, setActionError] = useState("");

  // Poll while the pipeline is still working so each finished step shows up live.
  useEffect(() => {
    if (run.status !== "running") return;
    const t = setInterval(async () => {
      const next = await getRun(run.id).catch(() => null);
      if (next) setRun(next);
    }, 600);
    return () => clearInterval(t);
  }, [run.status, run.id]);

  async function decide(status: "approved" | "rejected" | "pending") {
    setDeciding(true);
    setActionError("");
    try {
      setRun(await decideRun(run.id, status));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "상태를 바꾸지 못했습니다.");
    }
    setDeciding(false);
  }

  const ready = !!run.review && run.status !== "running" && run.status !== "failed";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className={btn.text}>← 대시보드</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={run.status} />
              {run.plan && <Badge>트렌드 · {run.plan.trendKeyword}</Badge>}
              <Badge tone={run.aiMode === "live" ? "good" : "warn"}>{run.aiMode === "live" ? "AI 생성" : "준비된 원고"}</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">
              {run.plan?.topic ?? (run.status === "failed" ? "이번 회차를 만들지 못했습니다" : "이번 회차를 만들고 있습니다")}
            </h1>
            <p className="mt-1 text-sm text-mute">
              {fmtDate(run.createdAt, true)} · {run.trigger === "cron" ? "격주 자동 실행" : "수동 실행"}
              {run.decidedAt && ` · ${fmtDate(run.decidedAt, true)} ${run.status === "approved" ? "승인" : "반려"}`}
            </p>
          </div>
          {ready && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-2">
                {run.status === "pending" ? (
                  <>
                    <button className={btn.ghost} disabled={deciding} onClick={() => decide("rejected")}>반려</button>
                    <button className={btn.primary} disabled={deciding} onClick={() => decide("approved")}>승인</button>
                  </>
                ) : (
                  <button className={btn.ghost} disabled={deciding} onClick={() => decide("pending")}>
                    {run.status === "approved" ? "승인 취소" : "다시 검토"}
                  </button>
                )}
              </div>
              {actionError && <p role="alert" className="text-xs text-bad">{actionError}</p>}
            </div>
          )}
        </div>
      </div>

      {run.status === "approved" && (
        <p className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand">
          승인된 결과물입니다. 블로그 글은 복사하거나 HTML로 내보내고, 카드뉴스는 PNG로 내려받아 직접 업로드하세요.
        </p>
      )}

      {ready && run.aiMode === "demo" && (
        <p className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-warn">
          API 키 없이 만든 결과라 미리 준비된 원고입니다. <button type="button" className="font-bold underline" onClick={openKeyPanel}>API 키를 입력</button>하고 다시 실행하면 올린 자료로 새로 생성합니다.
        </p>
      )}

      {run.status === "failed" && (
        <Panel title="실패 원인">
          <p className="text-sm leading-relaxed text-bad">{run.error}</p>
        </Panel>
      )}

      {run.status === "running" && <Progress run={run} />}

      {ready && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div role="tablist" className="flex w-max gap-1 rounded-full border border-line bg-surface p-1 text-sm font-bold">
                {tabs.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 transition-colors ${tab === k ? "bg-brand text-canvas" : "text-mute hover:text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {tab === "plan" ? (
              <PlanTab run={run} differentiators={differentiators} />
            ) : (
              // Keyed by tab so a selection or a half-finished edit never carries over to another channel.
              <EditArea key={tab} run={run} onChange={setRun}>
                <div className="mt-4">
                  {run.blog && tab === "blog" && <BlogTab run={run} disclosure={disclosure} />}
                  {run.cards && tab === "cards" && <CardsTab run={run} disclosure={disclosure} adHashtag={adHashtag} />}
                  {ch.email && tab === "email" && <EmailTab run={run} email={ch.email} footer={emailFooter} />}
                  {ch.kakao && tab === "kakao" && <KakaoTab run={run} banners={ch.kakao} />}
                  {ch.shorts && tab === "shorts" && <ShortsTab shorts={ch.shorts} />}
                  {ch.searchAds && tab === "search" && <SearchTab ads={ch.searchAds} />}
                </div>
              </EditArea>
            )}
          </div>
          <aside className="space-y-4">
            <Checklist review={run.review!} hasBlog={!!run.blog} hasCards={!!run.cards} edited={!!run.editedAt} />
            {run.revisions.length > 0 && run.firstReview && (
              <Panel title="자동 보완 내역">
                <p className="text-sm leading-relaxed text-mute">
                  초안은 <strong className="text-ink">{run.firstReview.passed}/{run.firstReview.total}</strong>개 항목을 충족했고,
                  미충족 부분만 다시 써서 <strong className="text-ink">{run.review!.passed}/{run.review!.total}</strong>이 되었습니다.
                </p>
                <ol className="mt-3 space-y-3">
                  {run.revisions.map((rv) => (
                    <li key={`${rv.round}-${rv.channels?.join() ?? ""}`} className="rounded-xl bg-canvas p-3 text-xs leading-relaxed">
                      <p className="font-bold">
                        {rv.channels?.length
                          ? `채널 보완 · ${rv.channels.map((c) => CHANNEL_LABEL[c]).join(", ")} 재생성`
                          : `블로그 ${rv.round}차 보완 · ${[rv.title ? "제목" : "", rv.sectionIndexes.length ? `섹션 ${rv.sectionIndexes.map((i) => i + 1).join(", ")}번` : ""].filter(Boolean).join("과 ")} 재작성`}
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-mute">
                        {rv.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
            <Panel title="진행 기록">
              <Logs run={run} />
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}

function Progress({ run }: { run: Run }) {
  const done = new Set(run.logs.map((l) => l.step));
  const current = STEPS.find((s) => !done.has(s));
  return (
    <Panel title="진행 상황">
      <ol className="grid gap-2 sm:grid-cols-6">
        {STEPS.map((s) => {
          const state = done.has(s) ? "done" : s === current ? "now" : "todo";
          return (
            <li key={s} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${state === "done" ? "border-brand/20 bg-brand-soft text-brand" : state === "now" ? "animate-pulse border-accent/50 bg-accent-soft text-warn" : "border-line bg-canvas text-mute"}`}>
              <span className="block text-xs font-semibold opacity-70">{state === "done" ? "완료" : state === "now" ? "진행 중" : "대기"}</span>
              {s}
            </li>
          );
        })}
      </ol>
      <div className="mt-5" aria-live="polite"><Logs run={run} /></div>
      {run.aiMode === "live" && (
        <p className="mt-4 text-xs text-mute">
          실제 생성은 보통 1~3분 걸립니다. {isStaticDemo ? "생성은 이 브라우저에서 진행되므로 끝날 때까지 이 탭을 닫거나 새로고침하지 마세요." : "이 페이지를 닫아도 작업은 계속됩니다."}
        </p>
      )}
    </Panel>
  );
}

function Logs({ run }: { run: Run }) {
  if (run.logs.length === 0) return <p className="text-sm text-mute">시작하는 중…</p>;
  return (
    <ol className="space-y-2.5">
      {run.logs.map((l, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
          <span><strong className="font-bold">{l.step}</strong> <span className="text-mute">{l.message}</span></span>
        </li>
      ))}
    </ol>
  );
}

function Check({ pass, label, detail }: { pass: boolean; label: string; detail?: string }) {
  return (
    <li className="flex gap-2.5 py-2">
      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${pass ? "bg-brand text-canvas" : "bg-bad text-white"}`}>
        {pass ? "✓" : "!"}
      </span>
      <span className="min-w-0 text-sm leading-snug">
        <span className="sr-only">{pass ? "충족: " : "미충족: "}</span>
        <span className="font-semibold">{label}</span>
        {detail && <span className="mt-0.5 block text-xs leading-relaxed text-mute">{detail}</span>}
      </span>
    </li>
  );
}

function Checklist({ review, hasBlog, hasCards, edited }: { review: Review; hasBlog: boolean; hasCards: boolean; edited: boolean }) {
  const all = review.passed === review.total;
  return (
    <Panel title="가이드라인 충족도" action={<Badge tone={all ? "good" : "bad"}>{review.passed} / {review.total}</Badge>}>
      <div className="h-2 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full ${all ? "bg-brand" : "bg-accent"}`} style={{ width: `${(review.passed / review.total) * 100}%` }} />
      </div>
      {edited && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs leading-relaxed text-warn">직접 수정한 뒤 다시 검수한 결과입니다.</p>}
      <p className="mb-1 mt-4 text-xs font-bold text-mute">공통·블로그·인스타그램 · 코드 검사</p>
      <ul className="divide-y divide-line/60">
        {review.keywordChecks.map((k) => (
          <Check key={k.keyword} pass={k.pass} label={k.keyword} detail={`${k.count}회 사용 · 기준 ${k.minCount}회 이상`} />
        ))}
        {hasBlog && <Check pass={review.charCount >= review.minChars} label="본문 분량" detail={`공백 제외 ${review.charCount.toLocaleString()}자 · ${review.minChars ? `기준 ${review.minChars.toLocaleString()}자 이상` : "가이드라인에 기준 없음"}`} />}
        {hasCards && <Check pass={review.cardCountOk} label="카드뉴스 6~8장" />}
        <Check pass={review.adDisclosure} label="‘광고’ 표기" detail="공정위 추천·보증 지침에 따라 자동 삽입" />
        {review.privacy && <Check pass={review.privacy.pass} label="개인정보 노출 없음" detail={review.privacy.detail} />}
      </ul>
      {review.channelChecks && review.channelChecks.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-xs font-bold text-mute">채널별 형식 규칙 · 코드 검사</p>
          <ul className="divide-y divide-line/60">
            {review.channelChecks.map((c, i) => <Check key={i} pass={c.pass} label={c.label} detail={c.detail} />)}
          </ul>
        </>
      )}
      {review.missionChecks.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-xs font-bold text-mute">블로그 미션 · AI 검수</p>
          <ul className="divide-y divide-line/60">
            {review.missionChecks.map((m, i) => <Check key={i} pass={m.pass} label={m.mission} detail={m.note} />)}
          </ul>
        </>
      )}
    </Panel>
  );
}

function PlanTab({ run, differentiators }: { run: Run; differentiators: { id: string; title: string }[] }) {
  const plan = run.plan!;
  const max = Math.max(...run.trends.map((t) => Math.abs(t.change)), 1);
  const voc = run.vocItem;
  return (
    <div className="space-y-4">
      {voc && (
        <Panel title="이 주제가 답하는 고객 질문">
          <p className="text-xl font-extrabold leading-snug tracking-tight">{voc.question}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {run.vocMode === "sample" && <Badge tone="warn">[샘플]</Badge>}
            <Badge>{voc.category}</Badge>
            <Badge tone="good">통화 {voc.count}건</Badge>
            {voc.differentiatorIds.map((id) => (
              <Link key={id} href={`/insights#${id}`} className="rounded-full focus-visible:outline-2">
                <Badge tone="solid">{differentiators.find((d) => d.id === id)?.title ?? id} →</Badge>
              </Link>
            ))}
          </div>
          {voc.quotes.length > 0 && (
            <div className="mt-4 rounded-xl bg-canvas p-4">
              <p className="text-xs font-bold text-mute">내부 확인용 · 외부 콘텐츠에는 쓰지 않음</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink">
                {voc.quotes.map((q, i) => <li key={i}>“{q}”</li>)}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-mute">
            {run.vocMode === "sample" ? "가상의 샘플 통화 요약에서 나온 질문입니다(실제 고객 데이터 아님). " : ""}
            외부 콘텐츠에는 일반화한 질문만 쓰고, 통화 수와 인용은 이 화면에서만 보입니다.
          </p>
        </Panel>
      )}
      <Panel title="이 주제를 고른 이유" action={
        <span className="flex flex-wrap gap-1.5">
          <Badge>타깃 · {resolveSettings(run.settings).audience}</Badge>
          <Badge>컨셉 · {conceptOf(run.settings?.concept).label}</Badge>
          <Badge>디자인 · {designOf(run.settings?.design).label}</Badge>
        </span>
      }>
        <p className="text-sm leading-relaxed">{plan.reason}</p>
        {plan.coreMessage && (
          <p className="mt-4 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm leading-relaxed">
            <span className="block text-xs font-bold text-warn">모든 채널이 반복하는 핵심 메시지</span>
            <strong className="mt-1 block text-base font-extrabold">{plan.coreMessage}</strong>
          </p>
        )}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-canvas p-4">
            <dt className="text-xs font-bold text-mute">풀어 가는 관점</dt>
            <dd className="mt-1.5 text-sm leading-relaxed">{plan.angle}</dd>
          </div>
          <div className="rounded-xl bg-brand-soft p-4">
            <dt className="text-xs font-bold text-brand">연결한 차별점</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {plan.differentiatorIds.map((id) => (
                <Badge key={id} tone="solid">{differentiators.find((d) => d.id === id)?.title ?? id}</Badge>
              ))}
            </dd>
          </div>
        </dl>
      </Panel>
      {run.channels && (
        <Panel title="채널별 역할">
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ["1. 처음 알리기", "인스타그램 · 쇼츠·릴스 · 카카오톡 배너", "스크롤을 멈추게 하는 훅과 한 줄 메시지"],
              ["2. 비교·검토 잡기", "블로그 · 검색광고", "검색 의도에 답하는 글과 구매 의도 키워드"],
              ["3. 전환·재방문", "이메일", "관심을 보인 사람에게 행동 하나만 요청"],
            ].map(([stage, channels, how]) => (
              <li key={stage} className="rounded-xl bg-canvas p-4">
                <p className="text-xs font-bold text-brand">{stage}</p>
                <p className="mt-1.5 text-sm font-bold leading-snug">{channels}</p>
                <p className="mt-1 text-xs leading-relaxed text-mute">{how}</p>
              </li>
            ))}
          </ol>
        </Panel>
      )}
      <Panel title="최근 2주 검색어 트렌드" action={<Badge tone={run.trendMode === "live" ? "good" : "warn"}>{run.trendMode === "live" ? "네이버 데이터랩" : "샘플 데이터"}</Badge>}>
        <ul className="space-y-2.5">
          {run.trends.map((t) => {
            const picked = t.keyword === plan.trendKeyword;
            return (
              <li key={t.keyword} className="grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 text-sm">
                <span className={`truncate ${picked ? "font-extrabold" : "text-mute"}`}>{t.keyword}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-canvas">
                  <span className={`block h-full rounded-full ${t.change < 0 ? "bg-line" : picked ? "bg-accent" : "bg-brand/50"}`} style={{ width: `${Math.max((Math.abs(t.change) / max) * 100, 3)}%` }} />
                </span>
                <span className={`text-right tabular-nums ${picked ? "font-extrabold" : "text-mute"}`}>{t.change > 0 ? "+" : ""}{t.change}%</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-mute">직전 2주 대비 검색 관심도 변화율입니다. 강조된 키워드가 이번 주제에 쓰였습니다.</p>
      </Panel>
      {run.news.length > 0 && (
        <Panel title="참고한 뉴스">
          <ul className="space-y-2">
            {run.news.map((n, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm leading-relaxed">
                <Badge>{n.keyword}</Badge>
                {/^https?:\/\//.test(n.link) ? (
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{n.title}</a>
                ) : (
                  <span>{n.title}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

