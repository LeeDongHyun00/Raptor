"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Review, Run } from "@/lib/types";
import { blogBodyHtml } from "@/lib/blogHtml";
import { blogPlainText } from "@/lib/review";
import { Badge, Panel, StatusBadge, btn, fmtDate } from "./ui";

const STEPS = ["트렌드 수집", "주제 선정", "콘텐츠 생성", "자동 검수", "보완", "승인 대기"];
type Tab = "blog" | "cards" | "plan";

interface Props {
  initial: Run;
  disclosure: string;
  adHashtag: string;
  differentiators: { id: string; title: string }[];
}

export function RunView({ initial, disclosure, adHashtag, differentiators }: Props) {
  const [run, setRun] = useState(initial);
  const [tab, setTab] = useState<Tab>("blog");
  const [deciding, setDeciding] = useState(false);
  const [actionError, setActionError] = useState("");

  // Poll while the pipeline is still working so each finished step shows up live.
  useEffect(() => {
    if (run.status !== "running") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/runs/${run.id}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setRun((await res.json()).run);
    }, 1200);
    return () => clearInterval(t);
  }, [run.status, run.id]);

  async function decide(status: "approved" | "rejected" | "pending") {
    setDeciding(true);
    setActionError("");
    const res = await fetch(`/api/runs/${run.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setRun(json.run);
    else setActionError(json.error ?? "상태를 바꾸지 못했습니다.");
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
              <Badge tone={run.aiMode === "live" ? "good" : "warn"}>{run.aiMode === "live" ? "Claude 생성" : "데모 모드 샘플"}</Badge>
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
            <div role="tablist" className="flex gap-1 rounded-full border border-line bg-paper p-1 text-sm font-bold sm:w-fit">
              {([["blog", "블로그 글"], ["cards", `카드뉴스 ${run.cards!.slides.length}장`], ["plan", "기획 근거"]] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 transition-colors ${tab === k ? "bg-forest text-cream" : "text-mute hover:text-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "blog" && <BlogTab run={run} disclosure={disclosure} />}
            {tab === "cards" && <CardsTab run={run} disclosure={disclosure} adHashtag={adHashtag} />}
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
                    <li key={rv.round} className="rounded-xl bg-cream p-3 text-xs leading-relaxed">
                      <p className="font-bold">{rv.round}차 보완 · 섹션 {rv.sectionIndexes.map((i) => i + 1).join(", ")}번 재작성</p>
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
      <p className="mb-1 mt-4 text-xs font-bold text-mute">필수 키워드 · 코드 검사</p>
      <ul className="divide-y divide-line/60">
        {review.keywordChecks.map((k) => (
          <Check key={k.keyword} pass={k.pass} label={k.keyword} detail={`${k.count}회 사용 · 기준 ${k.minCount}회 이상`} />
        ))}
        <Check pass={review.charCount >= review.minChars} label="본문 분량" detail={`공백 제외 ${review.charCount.toLocaleString()}자 · 기준 ${review.minChars.toLocaleString()}자 이상`} />
        <Check pass={review.cardCountOk} label="카드뉴스 6~8장" />
        <Check pass={review.adDisclosure} label="‘광고’ 표기" detail="공정위 추천·보증 지침에 따라 자동 삽입" />
      </ul>
      {review.missionChecks.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-xs font-bold text-mute">미션 · AI 검수</p>
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
          <a className={btn.ghost} href={`/api/runs/${run.id}/blog`}>HTML 내보내기</a>
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
                <img src={`/api/assets/${s.screenshotId}`} alt={s.caption ?? ""} className="w-full rounded-xl border border-line" />
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
        const res = await fetch(`/api/runs/${run.id}/cards/${i}`);
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
              <img src={`/api/runs/${run.id}/cards/${i}`} alt={`${i + 1}번 카드: ${s.title}`} width={1080} height={1350} loading="lazy" className="h-auto w-full rounded-xl border border-line bg-cream" />
              <a href={`/api/runs/${run.id}/cards/${i}?download`} className="mt-1.5 block text-center text-xs font-semibold text-mute hover:text-ink">{i + 1}번 PNG 받기</a>
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
  return (
    <div className="space-y-4">
      <Panel title="이 주제를 고른 이유">
        <p className="text-sm leading-relaxed">{plan.reason}</p>
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
