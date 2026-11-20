"use client";

import { useState } from "react";
import type { EmailContent, KakaoBanner, Run, SearchAds, ShortsScript } from "@/lib/types";
import { blogBodyHtml } from "@/lib/blogHtml";
import { LIMITS, blogPlainText, emailSubject } from "@/lib/review";
import { emailDocumentHtml } from "@/lib/emailHtml";
import { assetUrl, blogExportUrl, downloadBlogHtml, downloadHtml } from "@/lib/client/api";
import { T, useEditing } from "./EditKit";
import { RunImage, downloadRunImage, runImageBlob } from "./RunImage";
import { Badge, Panel, btn } from "./ui";

/** Channel tabs of a run. Every text goes through <T>, so all of it can be edited or selected for AI advice. */

function CopyButton({ label, getData }: { label: string; getData: () => { text: string; html?: string } }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  return (
    <button
      className={btn.ghost}
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

const Count = ({ text, max }: { text: string; max: number }) => (
  <span className={`ml-2 whitespace-nowrap text-xs tabular-nums ${text.length > max ? "font-bold text-bad" : "text-mute"}`}>{text.length}/{max}자</span>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">{children}</p>
);

/** Small labelled row used for short fields (eyebrow, CTA, target…). */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline gap-2 text-sm">
    <span className="w-14 shrink-0 text-xs font-bold text-mute">{label}</span>
    <span className="min-w-0 flex-1">{children}</span>
  </div>
);

export function BlogTab({ run, disclosure }: { run: Run; disclosure: string }) {
  const blog = run.blog!;
  const revised = new Set(run.revisions.flatMap((r) => r.sectionIndexes));
  const exportUrl = blogExportUrl(run);
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
          {exportUrl ? <a className={btn.ghost} href={exportUrl}>HTML 내보내기</a> : <button className={btn.ghost} onClick={() => downloadBlogHtml(run, blog, disclosure)}>HTML 내보내기</button>}
        </div>
      }
    >
      <article className="mx-auto max-w-2xl">
        <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-mute">{disclosure}</p>
        <T path="blog.title" as="h2" className="mt-5 block text-2xl font-extrabold leading-snug tracking-tight" />
        {blog.sections.map((s, i) => (
          <section key={i} className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <T path={`blog.sections.${i}.heading`} as="h3" className="text-lg font-extrabold leading-snug" />
              {revised.has(i) && <Badge tone="warn">자동 보완됨</Badge>}
            </div>
            {s.paragraphs.map((_, j) => (
              <T key={j} path={`blog.sections.${i}.paragraphs.${j}`} as="p" multiline className="mt-3 block text-[15px] leading-[1.9] text-ink" />
            ))}
            {s.screenshotId && (
              <figure className="mt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(s.screenshotId)} alt={s.caption ?? ""} className="mx-auto max-h-[520px] w-auto max-w-full rounded-xl border border-line" />
                {s.caption != null && <T path={`blog.sections.${i}.caption`} as="figcaption" className="mt-2 block text-center text-xs text-mute" />}
              </figure>
            )}
          </section>
        ))}
        <p className="mt-8 flex flex-wrap gap-x-2 gap-y-1 text-sm font-semibold text-brand">
          {blog.tags.map((_, i) => <span key={i} className="inline-flex">#<T path={`blog.tags.${i}`} /></span>)}
        </p>
      </article>
      <Note>‘글 복사’는 서식과 함께 본문을 복사하며 화면 캡처는 포함되지 않으니 블로그 편집기에서 직접 올려 주세요. ‘HTML 내보내기’ 파일에는 이미지가 함께 들어 있습니다.</Note>
    </Panel>
  );
}

export function CardsTab({ run, disclosure, adHashtag }: { run: Run; disclosure: string; adHashtag: string }) {
  const cards = run.cards!;
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState(false);
  const hashtags = [adHashtag, ...cards.hashtags.filter((h) => h !== adHashtag)].map((h) => `#${h}`).join(" ");
  const caption = `${disclosure}\n\n${cards.caption}\n\n${hashtags}`;
  const file = (i: number) => `card-${String(i + 1).padStart(2, "0")}.png`;

  async function downloadAll() {
    setZipping(true);
    setZipError(false);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(cards.slides.map(async (_, i) => zip.file(file(i), await runImageBlob(run, "card", i))));
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {cards.slides.map((s, i) => (
            <li key={i} className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-3 rounded-xl border border-line bg-canvas/40 p-3">
              <div>
                <RunImage run={run} kind="card" index={i} alt={`${i + 1}번 카드: ${s.title}`} className="h-auto w-full rounded-lg border border-line bg-canvas" />
                <button className="mt-1.5 block w-full text-center text-xs font-semibold text-mute hover:text-ink" onClick={() => downloadRunImage(run, "card", i, file(i))}>{i + 1}번 PNG 받기</button>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Field label="꼬리표"><T path={`cards.slides.${i}.eyebrow`} /></Field>
                <Field label="제목"><T path={`cards.slides.${i}.title`} className="font-bold" /></Field>
                {(s.body || s.kind !== "cover") && <Field label="설명"><T path={`cards.slides.${i}.body`} multiline className="leading-relaxed text-mute" /></Field>}
              </div>
            </li>
          ))}
        </ul>
        <Note>1080×1350px(4:5) · 첫 장에 ‘광고’ 표기가 들어갑니다. 문구를 고치고 저장하면 이미지도 새 문구로 다시 그려집니다.</Note>
      </Panel>
      <Panel title="본문과 해시태그" action={<CopyButton label="본문 복사" getData={() => ({ text: caption })} />}>
        <p className="text-sm leading-relaxed text-mute">{disclosure}</p>
        <T path="cards.caption" as="p" multiline className="mt-3 block whitespace-pre-line text-sm leading-relaxed" />
        <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm font-semibold text-brand">
          <span>#{adHashtag}</span>
          {cards.hashtags.map((h, i) => (h === adHashtag ? null : <span key={i} className="inline-flex">#<T path={`cards.hashtags.${i}`} /></span>))}
        </p>
      </Panel>
    </div>
  );
}

export function EmailTab({ run, email, footer }: { run: Run; email: EmailContent; footer: string }) {
  const [pick, setPick] = useState(0);
  const editing = useEditing();
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
      <p className="text-xs font-bold text-mute">제목 A/B 후보 · 선택한 제목으로 내보냅니다</p>
      <div className="mt-2 space-y-2">
        {email.subjects.map((sub, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${pick === i ? "border-brand bg-brand-soft" : "border-line bg-canvas/50"}`}>
            <input type="radio" name="subject" aria-label={`제목 ${String.fromCharCode(65 + i)} 선택`} checked={pick === i} onChange={() => setPick(i)} className="accent-brand" />
            <span className="font-bold text-mute">{String.fromCharCode(65 + i)}</span>
            <span className="min-w-0 flex-1 font-semibold">{!editing && "(광고) "}<T path={`channels.email.subjects.${i}`} /></span>
            <Count text={sub} max={LIMITS.emailSubject} />
          </div>
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line bg-canvas/60 px-5 py-3">
          <p className="text-sm font-bold leading-snug">{subject}</p>
          <T path="channels.email.preheader" as="p" className="mt-0.5 block text-xs text-mute" />
        </div>
        <div className="space-y-3 px-5 py-5 text-[15px] leading-[1.8]">
          <T path="channels.email.greeting" as="p" className="block" />
          {email.paragraphs.map((_, i) => <T key={i} path={`channels.email.paragraphs.${i}`} as="p" multiline className="block" />)}
          <p className="pt-2"><T path="channels.email.ctaLabel" className={editing ? "" : "inline-block rounded-full bg-brand px-6 py-3 text-sm font-bold text-surface"} /></p>
        </div>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-mute">{footer}</p>
      </div>
      <Note>제목 앞 ‘(광고)’와 수신거부 안내는 정보통신망법에 따라 자동으로 들어갑니다. {"{{이름}}"}과 버튼 링크는 발송 도구에서 채워 주세요. 광고성 메일은 사전에 수신 동의를 받은 사람에게만 보낼 수 있습니다.</Note>
    </Panel>
  );
}

export function KakaoTab({ run, banners }: { run: Run; banners: KakaoBanner[] }) {
  return (
    <Panel title="카카오톡 배너(비즈보드)">
      <ul className="space-y-5">
        {banners.map((k, i) => (
          <li key={i} className="rounded-xl border border-line bg-canvas/40 p-4">
            <RunImage run={run} kind="banner" index={i} alt={`배너 소재 ${i + 1}: ${k.copy}`} className="h-auto w-full rounded-lg border border-line bg-canvas" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="solid">소재 {i + 1}</Badge>
              <Badge tone="warn">{k.hook}</Badge>
              <button className="ml-auto text-xs font-semibold text-mute hover:text-ink" onClick={() => downloadRunImage(run, "banner", i, `kakao-banner-${i + 1}.png`)}>PNG 받기</button>
            </div>
            <div className="mt-3 space-y-1.5">
              <Field label="메인"><T path={`channels.kakao.${i}.copy`} className="font-bold" /><Count text={k.copy} max={LIMITS.kakaoCopy} /></Field>
              <Field label="보조"><T path={`channels.kakao.${i}.sub`} className="text-mute" /></Field>
              <Field label="버튼"><T path={`channels.kakao.${i}.cta`} /></Field>
              <Field label="대상"><T path={`channels.kakao.${i}.target`} className="text-mute" /></Field>
            </div>
          </li>
        ))}
      </ul>
      <Note>1029×258px 시안입니다. 소재는 여러 개를 함께 운영하다 1~2주 단위로 교체하고, 배너에서 약속한 내용이 클릭 후 첫 화면에 바로 보이게 해 주세요. 마감·한정 같은 긴급성 표현은 사실일 때만 쓸 수 있어 자동 생성에서는 쓰지 않습니다. 실제 등록 전 카카오 비즈보드 제작 가이드를 확인하세요.</Note>
    </Panel>
  );
}

export function ShortsTab({ shorts: sh }: { shorts: ShortsScript }) {
  const total = sh.scenes.reduce((a, s) => a + s.seconds, 0);
  const starts = sh.scenes.map((_, i) => sh.scenes.slice(0, i).reduce((a, s) => a + s.seconds, 0));
  const text = `${sh.title} (${total}초)\n\n${sh.scenes.map((s, i) => `[${starts[i]}~${starts[i] + s.seconds}초]\n화면: ${s.visual}\n대사: ${s.narration}\n자막: ${s.overlay}`).join("\n\n")}\n\n루프: ${sh.loop}\n\n고정 댓글: ${sh.pinnedComment}`;
  return (
    <Panel title="쇼츠·릴스·틱톡 대본" action={<CopyButton label="대본 복사" getData={() => ({ text })} />}>
      <div className="flex flex-wrap items-center gap-2">
        <T path="channels.shorts.title" as="h3" className="text-lg font-extrabold leading-snug" />
        <Badge tone="good">총 {total}초</Badge>
      </div>
      <ol className="mt-4 space-y-3">
        {sh.scenes.map((sc, i) => (
          <li key={i} className="grid gap-3 rounded-xl border border-line bg-canvas/40 p-4 sm:grid-cols-[5.5rem_1fr]">
            <div>
              <p className="text-xs font-bold text-brand">{i === 0 ? "훅" : `장면 ${i + 1}`}</p>
              <p className="text-sm font-extrabold tabular-nums">{starts[i]}~{starts[i] + sc.seconds}초</p>
            </div>
            <div className="space-y-1.5 leading-relaxed">
              <Field label="화면"><T path={`channels.shorts.scenes.${i}.visual`} multiline /></Field>
              <Field label="대사"><T path={`channels.shorts.scenes.${i}.narration`} multiline /></Field>
              <Field label="자막"><T path={`channels.shorts.scenes.${i}.overlay`} className="font-bold" /></Field>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-bold text-mute">다시 보게 만드는 루프</p>
          <T path="channels.shorts.loop" as="p" multiline className="mt-1.5 block text-sm leading-relaxed" />
        </div>
        <div className="rounded-xl bg-brand-soft p-4">
          <p className="text-xs font-bold text-brand">고정 댓글</p>
          <T path="channels.shorts.pinnedComment" as="p" multiline className="mt-1.5 block text-sm leading-relaxed" />
        </div>
      </div>
      <Note>촬영용 대본입니다. 영상 자체는 만들지 않습니다. 같은 대본을 유튜브 쇼츠, 인스타그램 릴스, 틱톡에 함께 쓸 수 있고, 업로드할 때 유료 광고 포함 표시를 설정해 주세요.</Note>
    </Panel>
  );
}

export function SearchTab({ ads }: { ads: SearchAds }) {
  const text = `[키워드]\n${ads.keywords.join("\n")}\n\n[제외 키워드]\n${ads.negativeKeywords.join("\n")}\n\n${ads.ads.map((a, i) => `[광고 ${i + 1}]\n제목: ${a.headline}\n설명: ${a.description}`).join("\n\n")}\n\n[서브링크]\n${ads.sitelinks.join(" / ")}`;
  const chips = (key: "keywords" | "negativeKeywords" | "sitelinks") =>
    ads[key].map((_, i) => (
      <span key={i} className="inline-flex rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold"><T path={`channels.searchAds.${key}.${i}`} /></span>
    ));
  return (
    <Panel title="검색광고(네이버·구글)" action={<CopyButton label="소재 복사" getData={() => ({ text })} />}>
      <ul className="space-y-3">
        {ads.ads.map((a, i) => (
          <li key={i} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-mute"><span className="mr-1.5 rounded border border-line px-1 font-bold">광고</span>검색 결과 미리보기 {i + 1}</p>
            <p className="mt-1.5 text-base font-bold text-brand"><T path={`channels.searchAds.ads.${i}.headline`} /><Count text={a.headline} max={LIMITS.adHeadline} /></p>
            <p className="mt-0.5 text-sm leading-relaxed"><T path={`channels.searchAds.ads.${i}.description`} multiline /><Count text={a.description} max={LIMITS.adDescription} /></p>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-brand-soft p-4">
          <p className="text-xs font-bold text-brand">구매 의도 키워드</p>
          <p className="mt-2 flex flex-wrap gap-1.5">{chips("keywords")}</p>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-bold text-mute">제외 키워드</p>
          <p className="mt-2 flex flex-wrap gap-1.5">{chips("negativeKeywords")}</p>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-bold text-mute">서브링크</p>
          <p className="mt-2 flex flex-wrap gap-1.5">{chips("sitelinks")}</p>
        </div>
      </div>
      <Note>제목 15자·설명 45자 기준으로 검사합니다. 집행 전에 전환 추적을 먼저 설정하고, 광고마다 메시지가 일치하는 전용 랜딩 페이지를 연결하세요. 브랜드 검색어는 별도 캠페인으로 방어하고, 입찰가와 요일·시간대 조정은 광고 관리자에서 직접 설정합니다.</Note>
    </Panel>
  );
}
