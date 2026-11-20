"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Channels, Review, Run } from "@/lib/types";
import { blogBodyHtml } from "@/lib/blogHtml";
import { CHANNEL_LABEL, LIMITS, blogPlainText, emailSubject } from "@/lib/review";
import { emailDocumentHtml } from "@/lib/emailHtml";
import { STEPS } from "@/lib/pipelineCore";
import { bannerUrl, blogExportUrl, cardUrl, downloadHtml, assetUrl, decideRun, downloadBlogHtml, getRun } from "@/lib/client/api";
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
  const [tab, setTab] = useState<Tab>("blog");
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

  const ready = !!(run.blog && run.cards && run.review) && run.status !== "running" && run.status !== "failed";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className={btn.text}>← 대시보드</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={run.status} />
              {run.plan && <Badge>트렌드 · {run.plan.trendKeyword}</Badge>}
              <Badge tone={run.aiMode === "live" ? "good" : "warn"}>{run.aiMode === "live" ? "Claude 생성" : "데모 모드 준비 원고"}</Badge>
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
        <p className="rounded-xl border border-forest/20 bg-forest-soft px-4 py-3 text-sm leading-relaxed text-forest">
          승인된 결과물입니다. 블로그 글은 복사하거나 HTML로 내보내고, 카드뉴스는 PNG로 내려받아 직접 업로드하세요.
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
              <div role="tablist" className="flex w-max gap-1 rounded-full border border-line bg-paper p-1 text-sm font-bold">
                {([
                  ["blog", "블로그"], ["cards", "인스타그램"],
                  ...(run.channels ? ([["email", "이메일"], ["kakao", "카카오톡 배너"], ["shorts", "쇼츠·릴스"], ["search", "검색광고"]] as const) : []),
                  ["plan", "기획 근거"],
                ] as const).map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 transition-colors ${tab === k ? "bg-forest text-cream" : "text-mute hover:text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {tab === "blog" && <BlogTab run={run} disclosure={disclosure} />}
            {tab === "cards" && <CardsTab run={run} disclosure={disclosure} adHashtag={adHashtag} />}
            {run.channels && tab === "email" && <EmailTab run={run} channels={run.channels} footer={emailFooter} />}
            {run.channels && tab === "kakao" && <KakaoTab run={run} channels={run.channels} />}
            {run.channels && tab === "shorts" && <ShortsTab channels={run.channels} />}
            {run.channels && tab === "search" && <SearchTab channels={run.channels} />}
            {tab === "plan" && <PlanTab run={run} differentiators={differentiators} />}
          </div>
          <aside className="space-y-4">
            <Checklist review={run.review!} />
            {run.revisions.length > 0 && run.firstReview && (
              <Panel title="자동 보완 내역">
                <p className="text-sm leading-relaxed text-mute">
                  초안은 <strong className="text-ink">{run.firstReview.passed}/{run.firstReview.total}</strong>개 항목을 충족했고,
                  미충족 부분만 다시 써서 <strong className="text-ink">{run.review!.passed}/{run.review!.total}</strong>이 되었습니다.
                </p>
                <ol className="mt-3 space-y-3">
                  {run.revisions.map((rv) => (
                    <li key={`${rv.round}-${rv.channels?.join() ?? ""}`} className="rounded-xl bg-cream p-3 text-xs leading-relaxed">
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
            <li key={s} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${state === "done" ? "border-forest/20 bg-forest-soft text-forest" : state === "now" ? "animate-pulse border-horn/50 bg-horn-soft text-[#8a5a0b]" : "border-line bg-cream text-mute"}`}>
              <span className="block text-xs font-semibold opacity-70">{state === "done" ? "완료" : state === "now" ? "진행 중" : "대기"}</span>
              {s}
            </li>
          );
        })}
      </ol>
      <div className="mt-5" aria-live="polite"><Logs run={run} /></div>
      {run.aiMode === "live" && <p className="mt-4 text-xs text-mute">실제 생성은 보통 1~3분 걸립니다. 이 페이지를 닫아도 작업은 계속됩니다.</p>}
    </Panel>
  );
}

function Logs({ run }: { run: Run }) {
  if (run.logs.length === 0) return <p className="text-sm text-mute">시작하는 중…</p>;
  return (
    <ol className="space-y-2.5">
      {run.logs.map((l, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
          <span><strong className="font-bold">{l.step}</strong> <span className="text-mute">{l.message}</span></span>
        </li>
      ))}
    </ol>
  );
}

function Check({ pass, label, detail }: { pass: boolean; label: string; detail?: string }) {
  return (
    <li className="flex gap-2.5 py-2">
      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${pass ? "bg-forest text-cream" : "bg-bad text-white"}`}>
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

function Checklist({ review }: { review: Review }) {
  const all = review.passed === review.total;
  return (
    <Panel title="가이드라인 충족도" action={<Badge tone={all ? "good" : "bad"}>{review.passed} / {review.total}</Badge>}>
      <div className="h-2 overflow-hidden rounded-full bg-cream">
        <div className={`h-full rounded-full ${all ? "bg-forest" : "bg-horn"}`} style={{ width: `${(review.passed / review.total) * 100}%` }} />
      </div>
      <p className="mb-1 mt-4 text-xs font-bold text-mute">블로그·인스타그램 · 코드 검사</p>
      <ul className="divide-y divide-line/60">
        {review.keywordChecks.map((k) => (
          <Check key={k.keyword} pass={k.pass} label={k.keyword} detail={`${k.count}회 사용 · 기준 ${k.minCount}회 이상`} />
        ))}
        <Check pass={review.charCount >= review.minChars} label="본문 분량" detail={`공백 제외 ${review.charCount.toLocaleString()}자 · ${review.minChars ? `기준 ${review.minChars.toLocaleString()}자 이상` : "가이드라인에 기준 없음"}`} />
        <Check pass={review.cardCountOk} label="카드뉴스 6~8장" />
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

function CopyButton({ label, getData, className = btn.ghost }: {
  label: string; getData: () => { text: string; html?: string }; className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  return (
    <button
      className={className}
      onClick={async () => {
        const { text, html } = getData();
        try {
          if (html && typeof ClipboardItem !== "undefined") {
            // Rich + plain together so pasting into the blog editor keeps headings.
            await navigator.clipboard.write([new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            })]);
          } else {
            await navigator.clipboard.writeText(text);
          }
          setState("done");
        } catch {
          setState("error");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
    >
      <span role="status">{state === "done" ? "복사했습니다" : state === "error" ? "복사 실패" : label}</span>
    </button>
  );
}

function BlogTab({ run, disclosure }: { run: Run; disclosure: string }) {
  const blog = run.blog!;
  const revised = new Set(run.revisions.flatMap((r) => r.sectionIndexes));
  return (
    <Panel
      title="네이버 블로그 글"
      action={
        <div className="flex flex-wrap gap-2">
          <CopyButton
            label="글 복사"
            getData={() => ({
              text: `${disclosure}\n\n${blogPlainText(blog)}\n\n${blog.tags.map((t) => `#${t}`).join(" ")}`,
              // No images in the clipboard: the blog editor drops pasted image data, so screenshots are uploaded by hand.
              html: blogBodyHtml(disclosure, blog, () => null),
            })}
          />
          {blogExportUrl(run) ? (
            <a className={btn.ghost} href={blogExportUrl(run)!}>HTML 내보내기</a>
          ) : (
            <button className={btn.ghost} onClick={() => downloadBlogHtml(run, blog, disclosure)}>HTML 내보내기</button>
          )}
        </div>
      }
    >
      <article className="mx-auto max-w-2xl">
        <p className="rounded-lg border border-line bg-cream px-3 py-2 text-xs text-mute">{disclosure}</p>
        <h2 className="mt-5 text-2xl font-extrabold leading-snug tracking-tight">{blog.title}</h2>
        {blog.sections.map((s, i) => (
          <section key={i} className="mt-8">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-extrabold leading-snug">
              {s.heading}
              {revised.has(i) && <Badge tone="warn">자동 보완됨</Badge>}
            </h3>
            {s.paragraphs.map((p, j) => <p key={j} className="mt-3 text-[15px] leading-[1.9] text-[#26332c]">{p}</p>)}
            {s.screenshotId && (
              <figure className="mt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(s.screenshotId)} alt={s.caption ?? ""} className="mx-auto max-h-[520px] w-auto max-w-full rounded-xl border border-line" />
                {s.caption && <figcaption className="mt-2 text-center text-xs text-mute">▲ {s.caption}</figcaption>}
              </figure>
            )}
          </section>
        ))}
        <p className="mt-8 text-sm font-semibold text-forest">{blog.tags.map((t) => `#${t}`).join(" ")}</p>
      </article>
      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        ‘글 복사’는 서식과 함께 본문을 복사합니다. 화면 캡처는 붙여넣기에 포함되지 않으니 블로그 편집기에서 해당 위치에 직접 올려 주세요. ‘HTML 내보내기’ 파일에는 이미지가 함께 들어 있습니다.
      </p>
    </Panel>
  );
}

function CardsTab({ run, disclosure, adHashtag }: { run: Run; disclosure: string; adHashtag: string }) {
  const cards = run.cards!;
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState(false);
  const hashtags = [adHashtag, ...cards.hashtags.filter((h) => h !== adHashtag)].map((h) => `#${h}`).join(" ");
  const caption = `${disclosure}\n\n${cards.caption}\n\n${hashtags}`;

  async function downloadAll() {
    setZipping(true);
    setZipError(false);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(cards.slides.map(async (_, i) => {
        const res = await fetch(cardUrl(run, i));
        if (!res.ok) throw new Error();
        zip.file(`card-${String(i + 1).padStart(2, "0")}.png`, await res.blob());
      }));
      const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `cardnews-${run.id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setZipError(true);
    }
    setZipping(false);
  }

  return (
    <div className="space-y-4">
      <Panel
        title="인스타그램 카드뉴스"
        action={
          <div className="flex items-center gap-3">
            {zipError && <span role="alert" className="text-xs text-bad">내려받지 못했습니다</span>}
            <button className={btn.ghost} onClick={downloadAll} disabled={zipping}>{zipping ? "묶는 중…" : "PNG 전체 다운로드"}</button>
          </div>
        }
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {cards.slides.map((s, i) => (
            <li key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardUrl(run, i)} alt={`${i + 1}번 카드: ${s.title}`} width={1080} height={1350} loading="lazy" className="h-auto w-full rounded-xl border border-line bg-cream" />
              <a href={cardUrl(run, i, true)} download={`card-${String(i + 1).padStart(2, "0")}.png`} className="mt-1.5 block text-center text-xs font-semibold text-mute hover:text-ink">{i + 1}번 PNG 받기</a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-mute">1080×1350px(4:5) · 첫 장에 ‘광고’ 표기가 들어갑니다.</p>
      </Panel>
      <Panel title="본문과 해시태그" action={<CopyButton label="본문 복사" getData={() => ({ text: caption })} />}>
        <p className="whitespace-pre-line text-sm leading-relaxed">{caption}</p>
      </Panel>
    </div>
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
            <div className="mt-4 rounded-xl bg-cream p-4">
              <p className="text-xs font-bold text-mute">내부 확인용 · 외부 콘텐츠에는 쓰지 않음</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[#33423a]">
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
      <Panel title="이 주제를 고른 이유">
        <p className="text-sm leading-relaxed">{plan.reason}</p>
        {plan.coreMessage && (
          <p className="mt-4 rounded-xl border border-horn/40 bg-horn-soft p-4 text-sm leading-relaxed">
            <span className="block text-xs font-bold text-[#8a5a0b]">모든 채널이 반복하는 핵심 메시지</span>
            <strong className="mt-1 block text-base font-extrabold">{plan.coreMessage}</strong>
          </p>
        )}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-cream p-4">
            <dt className="text-xs font-bold text-mute">풀어 가는 관점</dt>
            <dd className="mt-1.5 text-sm leading-relaxed">{plan.angle}</dd>
          </div>
          <div className="rounded-xl bg-forest-soft p-4">
            <dt className="text-xs font-bold text-forest">연결한 차별점</dt>
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
              <li key={stage} className="rounded-xl bg-cream p-4">
                <p className="text-xs font-bold text-forest">{stage}</p>
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
                <span className="h-2.5 overflow-hidden rounded-full bg-cream">
                  <span className={`block h-full rounded-full ${t.change < 0 ? "bg-line" : picked ? "bg-horn" : "bg-forest/50"}`} style={{ width: `${Math.max((Math.abs(t.change) / max) * 100, 3)}%` }} />
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

const Count = ({ text, max }: { text: string; max: number }) => (
  <span className={`ml-2 whitespace-nowrap text-xs tabular-nums ${text.length > max ? "font-bold text-bad" : "text-mute"}`}>{text.length}/{max}자</span>
);

function EmailTab({ run, channels, footer }: { run: Run; channels: Channels; footer: string }) {
  const email = channels.email;
  const [pick, setPick] = useState(0);
  const subject = emailSubject(email.subjects[pick] ?? email.subjects[0] ?? "");
  const text = `${subject}\n${email.preheader}\n\n${email.greeting}\n\n${email.paragraphs.join("\n\n")}\n\n[${email.ctaLabel}]\n\n${footer}`;
  return (
    <Panel
      title="이메일"
      action={
        <div className="flex flex-wrap gap-2">
          <CopyButton label="메일 복사" getData={() => ({ text })} />
          <button className={btn.ghost} onClick={() => downloadHtml(`email-${run.id}.html`, emailDocumentHtml(email, subject, footer))}>HTML 내보내기</button>
        </div>
      }
    >
      <p className="text-xs font-bold text-mute">제목 A/B 후보 · 선택한 제목으로 미리보기와 내보내기가 바뀝니다</p>
      <div className="mt-2 space-y-2">
        {email.subjects.map((sub, i) => (
          <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${pick === i ? "border-forest bg-forest-soft" : "border-line bg-cream/50"}`}>
            <input type="radio" name="subject" checked={pick === i} onChange={() => setPick(i)} className="accent-[#1f4d3a]" />
            <span className="font-bold text-mute">{String.fromCharCode(65 + i)}</span>
            <span className="min-w-0 flex-1 font-semibold">{emailSubject(sub)}</span>
            <Count text={sub} max={LIMITS.emailSubject} />
          </label>
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line bg-cream/60 px-5 py-3">
          <p className="text-sm font-bold leading-snug">{subject}</p>
          <p className="mt-0.5 text-xs text-mute">{email.preheader}</p>
        </div>
        <div className="space-y-3 px-5 py-5 text-[15px] leading-[1.8]">
          <p>{email.greeting}</p>
          {email.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <p className="pt-2"><span className="inline-block rounded-full bg-forest px-6 py-3 text-sm font-bold text-cream">{email.ctaLabel}</span></p>
        </div>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-mute">{footer}</p>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        제목 앞 ‘(광고)’와 수신거부 안내는 정보통신망법에 따라 자동으로 들어갑니다. {"{{이름}}"}과 버튼 링크는 발송 도구에서 채워 주세요. 광고성 메일은 사전에 수신 동의를 받은 사람에게만 보낼 수 있습니다.
      </p>
    </Panel>
  );
}

function KakaoTab({ run, channels }: { run: Run; channels: Channels }) {
  return (
    <Panel title="카카오톡 배너(비즈보드)">
      <ul className="space-y-5">
        {channels.kakao.map((k, i) => (
          <li key={i} className="rounded-xl border border-line bg-cream/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl(run, i)} alt={`배너 소재 ${i + 1}: ${k.copy}`} width={1029} height={258} loading="lazy" className="h-auto w-full rounded-lg border border-line bg-cream" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="solid">소재 {i + 1}</Badge>
              <Badge tone="warn">{k.hook}</Badge>
              <Badge>대상 · {k.target}</Badge>
              <a href={bannerUrl(run, i, true)} download={`kakao-banner-${i + 1}.png`} className="ml-auto text-xs font-semibold text-mute hover:text-ink">PNG 받기</a>
            </div>
            <p className="mt-2 text-sm"><strong className="font-bold">{k.copy}</strong><Count text={k.copy} max={LIMITS.kakaoCopy} /></p>
            <p className="text-sm text-mute">{k.sub} · 버튼 “{k.cta}”</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        1029×258px 시안입니다. 소재는 여러 개를 함께 운영하다 1~2주 단위로 교체하고, 배너에서 약속한 내용이 클릭 후 첫 화면에 바로 보이게 해 주세요. 마감·한정 같은 긴급성 표현은 사실일 때만 쓸 수 있어 자동 생성에서는 쓰지 않습니다. 실제 등록 전 카카오 비즈보드 제작 가이드를 확인하세요.
      </p>
    </Panel>
  );
}

function ShortsTab({ channels }: { channels: Channels }) {
  const sh = channels.shorts;
  const total = sh.scenes.reduce((a, s) => a + s.seconds, 0);
  const starts = sh.scenes.map((_, i) => sh.scenes.slice(0, i).reduce((a, s) => a + s.seconds, 0));
  const text = `${sh.title} (${total}초)\n\n${sh.scenes.map((s, i) => `[${starts[i]}~${starts[i] + s.seconds}초]\n화면: ${s.visual}\n대사: ${s.narration}\n자막: ${s.overlay}`).join("\n\n")}\n\n루프: ${sh.loop}\n\n고정 댓글: ${sh.pinnedComment}`;
  return (
    <Panel title="쇼츠·릴스·틱톡 대본" action={<CopyButton label="대본 복사" getData={() => ({ text })} />}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-extrabold leading-snug">{sh.title}</h3>
        <Badge tone="good">총 {total}초</Badge>
      </div>
      <ol className="mt-4 space-y-3">
        {sh.scenes.map((sc, i) => (
          <li key={i} className="grid gap-3 rounded-xl border border-line bg-cream/40 p-4 sm:grid-cols-[5.5rem_1fr]">
            <div>
              <p className="text-xs font-bold text-forest">{i === 0 ? "훅" : `장면 ${i + 1}`}</p>
              <p className="text-sm font-extrabold tabular-nums">{starts[i]}~{starts[i] + sc.seconds}초</p>
            </div>
            <dl className="space-y-1.5 text-sm leading-relaxed">
              <div><dt className="inline text-xs font-bold text-mute">화면 </dt><dd className="inline">{sc.visual}</dd></div>
              <div><dt className="inline text-xs font-bold text-mute">대사 </dt><dd className="inline">“{sc.narration}”</dd></div>
              <div><dt className="inline text-xs font-bold text-mute">자막 </dt><dd className="inline"><span className="rounded bg-ink px-2 py-0.5 text-xs font-bold text-cream">{sc.overlay}</span></dd></div>
            </dl>
          </li>
        ))}
      </ol>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-cream p-4">
          <dt className="text-xs font-bold text-mute">다시 보게 만드는 루프</dt>
          <dd className="mt-1.5 text-sm leading-relaxed">{sh.loop}</dd>
        </div>
        <div className="rounded-xl bg-forest-soft p-4">
          <dt className="text-xs font-bold text-forest">고정 댓글</dt>
          <dd className="mt-1.5 text-sm leading-relaxed">{sh.pinnedComment}</dd>
        </div>
      </dl>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        촬영용 대본입니다. 영상 자체는 만들지 않습니다. 같은 대본을 유튜브 쇼츠, 인스타그램 릴스, 틱톡에 함께 쓸 수 있고, 업로드할 때 유료 광고 포함 표시를 설정해 주세요.
      </p>
    </Panel>
  );
}

function SearchTab({ channels }: { channels: Channels }) {
  const ads = channels.searchAds;
  const text = `[키워드]\n${ads.keywords.join("\n")}\n\n[제외 키워드]\n${ads.negativeKeywords.join("\n")}\n\n${ads.ads.map((a, i) => `[광고 ${i + 1}]\n제목: ${a.headline}\n설명: ${a.description}`).join("\n\n")}\n\n[서브링크]\n${ads.sitelinks.join(" / ")}`;
  return (
    <Panel title="검색광고(네이버·구글)" action={<CopyButton label="소재 복사" getData={() => ({ text })} />}>
      <ul className="space-y-3">
        {ads.ads.map((a, i) => (
          <li key={i} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-mute"><span className="mr-1.5 rounded border border-line px-1 font-bold">광고</span>검색 결과 미리보기 {i + 1}</p>
            <p className="mt-1.5 text-base font-bold text-[#1a4fb5]">{a.headline}<Count text={a.headline} max={LIMITS.adHeadline} /></p>
            <p className="mt-0.5 text-sm leading-relaxed">{a.description}<Count text={a.description} max={LIMITS.adDescription} /></p>
            <p className="mt-2 text-xs text-[#1a4fb5]">{ads.sitelinks.join(" · ")}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-forest-soft p-4">
          <dt className="text-xs font-bold text-forest">구매 의도 키워드</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">{ads.keywords.map((k) => <Badge key={k} tone="solid">{k}</Badge>)}</dd>
        </div>
        <div className="rounded-xl bg-cream p-4">
          <dt className="text-xs font-bold text-mute">제외 키워드</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">{ads.negativeKeywords.map((k) => <Badge key={k}>{k}</Badge>)}</dd>
        </div>
      </dl>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
        제목 15자·설명 45자 기준으로 검사합니다. 집행 전에 전환 추적을 먼저 설정하고, 광고마다 메시지가 일치하는 전용 랜딩 페이지를 연결하세요. 브랜드 검색어는 별도 캠페인으로 방어하고, 입찰가와 요일·시간대 조정은 광고 관리자에서 직접 설정합니다.
      </p>
    </Panel>
  );
}
