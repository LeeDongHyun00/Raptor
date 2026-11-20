import type { Blog, CardNews, ChannelCheck, ChannelId, Channels, Guideline, KeywordCheck, MissionCheck, PrivacyCheck, Review, Workspace } from "./types";
import { containsQuote, findPII } from "./voc";

/** Disclosure text required by the KFTC endorsement guidelines; inserted by code, never left to the model. */
export function adDisclosure(ws: Workspace): string {
  return `[광고] 이 게시물은 ${ws.product.company}의 ${ws.product.name} 홍보를 위해 제작된 광고 콘텐츠입니다.`;
}

export const AD_HASHTAG = "광고";

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  email: "이메일",
  kakao: "카카오톡 배너",
  shorts: "쇼츠·릴스",
  searchAds: "검색광고",
};

/** Our own format rules per channel. Search-ad limits follow the Naver powerlink text limits. */
export const LIMITS = {
  emailSubject: 30,
  kakaoCopy: 20,
  kakaoSub: 22,
  shortsMin: 15,
  shortsMax: 30,
  adHeadline: 15,
  adDescription: 45,
};

/** The Information and Communications Network Act requires "(광고)" at the start of the subject. */
export const emailSubject = (subject: string) => `(광고) ${subject.replace(/^\s*[\[(]광고[\])]\s*/, "")}`;

export function emailFooter(ws: Workspace): string {
  return `본 메일은 ${ws.product.company}의 광고성 정보 수신에 동의하신 분께 발송되었습니다. 수신을 원하지 않으시면 [수신거부]를 눌러 주세요. 발신: ${ws.product.company}`;
}

// A deadline that is not real is a labeling-law risk, so any urgency wording is surfaced for a human to verify.
const URGENCY = /오늘만|오늘 자정|마감|선착순|한정|곧 종료|단 \d+일/;

/** Deterministic format checks for the channels beyond blog and card news. */
export function checkChannels(ch: Channels): ChannelCheck[] {
  const over = (items: string[], max: number) => items.filter((t) => t.length > max);
  const lenDetail = (bad: string[], max: number, unit: string) =>
    bad.length ? `${max}자 초과 ${bad.length}개: ${bad.map((b) => `“${b}”(${b.length}자)`).join(", ")}` : `모두 ${max}자 이내 ${unit}`;

  const subjBad = over(ch.email.subjects, LIMITS.emailSubject);
  const copyBad = over(ch.kakao.map((k) => k.copy), LIMITS.kakaoCopy);
  const subBad = over(ch.kakao.map((k) => k.sub), LIMITS.kakaoSub);
  const urgent = ch.kakao.filter((k) => URGENCY.test(`${k.copy} ${k.sub}`));
  const seconds = ch.shorts.scenes.reduce((a, s) => a + s.seconds, 0);
  const headBad = over(ch.searchAds.ads.map((a) => a.headline), LIMITS.adHeadline);
  const descBad = over(ch.searchAds.ads.map((a) => a.description), LIMITS.adDescription);

  return [
    { channel: "email", label: "이메일 제목 길이", pass: subjBad.length === 0, detail: lenDetail(subjBad, LIMITS.emailSubject, "· ‘(광고)’는 자동 표기") },
    { channel: "email", label: "이메일 행동 유도는 하나만", pass: !!ch.email.ctaLabel.trim() && !/https?:\/\//.test(ch.email.paragraphs.join(" ")), detail: "버튼 1개, 본문에 다른 링크 없음 · 수신거부 안내는 자동 삽입" },
    { channel: "kakao", label: "배너 한 줄 문구 길이", pass: copyBad.length + subBad.length === 0, detail: lenDetail([...copyBad, ...subBad], LIMITS.kakaoCopy, "· 소재 " + ch.kakao.length + "개") },
    { channel: "kakao", label: "배너에 마감·한정 표현 없음", pass: urgent.length === 0, detail: urgent.length ? `사실 확인이 필요한 긴급성 표현: ${urgent.map((u) => `“${u.copy}”`).join(", ")}` : "거짓 긴급성 위험이 있는 표현을 쓰지 않았습니다" },
    { channel: "shorts", label: "쇼츠 길이 15~30초", pass: seconds >= LIMITS.shortsMin && seconds <= LIMITS.shortsMax, detail: `총 ${seconds}초 · 장면 ${ch.shorts.scenes.length}개` },
    { channel: "shorts", label: "모든 장면에 자막", pass: ch.shorts.scenes.every((sc) => sc.overlay.trim()), detail: "소리를 끄고 봐도 이해되도록 화면 자막을 넣습니다" },
    { channel: "searchAds", label: "검색광고 제목·설명 길이", pass: headBad.length + descBad.length === 0, detail: headBad.length + descBad.length ? `제목 ${LIMITS.adHeadline}자·설명 ${LIMITS.adDescription}자 초과: ${[...headBad, ...descBad].map((b) => `“${b}”(${b.length}자)`).join(", ")}` : `제목 ${LIMITS.adHeadline}자·설명 ${LIMITS.adDescription}자 이내 · 광고 ${ch.searchAds.ads.length}개` },
  ];
}

/** Failed channel rules grouped per channel, used to regenerate only those channels. */
export function channelProblems(review: Review): Partial<Record<ChannelId, string[]>> {
  const out: Partial<Record<ChannelId, string[]>> = {};
  for (const c of review.channelChecks ?? []) {
    if (!c.pass) (out[c.channel] ??= []).push(`${c.label}: ${c.detail}`);
  }
  for (const id of review.privacy?.channels ?? []) {
    (out[id] ??= []).push(`개인정보 노출: ${review.privacy!.detail}. 전화번호·이메일·통화 인용·고객 이름을 빼고 다시 써야 합니다.`);
  }
  return out;
}

export function blogPlainText(blog: Blog): string {
  return [blog.title, ...blog.sections.flatMap((s) => [s.heading, ...s.paragraphs, s.caption ?? ""])].join("\n");
}

function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  return text.split(keyword).length - 1;
}

/** Required keywords are checked deterministically in code (exact match, spacing included). */
export function checkKeywords(guideline: Guideline, blog: Blog): KeywordCheck[] {
  const text = blogPlainText(blog);
  return guideline.requiredKeywords.map(({ keyword, minCount }) => {
    const count = countOccurrences(text, keyword);
    return { keyword, minCount, count, pass: count >= minCount };
  });
}

const channelText: { [K in ChannelId]: (c: Channels[K]) => string } = {
  email: (e) => [...e.subjects, e.preheader, e.greeting, ...e.paragraphs, e.ctaLabel].join("\n"),
  kakao: (k) => k.map((b) => `${b.copy} ${b.sub} ${b.cta}`).join("\n"),
  shorts: (sh) => [sh.title, ...sh.scenes.flatMap((sc) => [sc.narration, sc.overlay]), sh.pinnedComment].join("\n"),
  searchAds: (a) => [...a.keywords, ...a.ads.flatMap((x) => [x.headline, x.description]), ...a.sitelinks].join("\n"),
};

/**
 * Deterministic privacy gate for everything that will be published: no phone numbers,
 * emails or resident numbers, and no reuse of the internal call quotes behind the plan.
 */
export function checkPrivacy(blog: Blog, cards: CardNews, channels: Channels | undefined, quotes: string[]): PrivacyCheck {
  const problems: string[] = [];
  const scan = (text: string, where: string): boolean => {
    const pii = findPII(text);
    const quote = containsQuote(text, quotes);
    if (pii.length) problems.push(`${where}: ${pii.map((p) => `${p.label} “${p.match}”`).join(", ")}`);
    if (quote) problems.push(`${where}: 내부 확인용 통화 인용이 그대로 쓰였습니다`);
    return pii.length > 0 || !!quote;
  };
  const blogSections: number[] = [];
  if (scan(blog.title, "블로그 제목")) blogSections.push(0);
  blog.sections.forEach((s, i) => {
    if (scan([s.heading, ...s.paragraphs, s.caption ?? ""].join("\n"), `블로그 섹션 ${i + 1}`) && !blogSections.includes(i)) blogSections.push(i);
  });
  scan([...cards.slides.flatMap((s) => [s.eyebrow, s.title, s.body]), cards.caption, ...cards.hashtags].join("\n"), "카드뉴스");
  const bad: ChannelId[] = [];
  if (channels) {
    for (const id of Object.keys(channelText) as ChannelId[]) {
      if (scan((channelText[id] as (c: unknown) => string)(channels[id]), CHANNEL_LABEL[id])) bad.push(id);
    }
  }
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.join(" / ") : "전화번호·이메일·주민번호와 통화 인용이 어느 채널에도 없습니다",
    blogSections,
    channels: bad,
  };
}

export function buildReview(
  guideline: Guideline, blog: Blog, cards: CardNews, missionChecks: MissionCheck[], channels?: Channels, vocQuotes: string[] = [],
): Review {
  const keywordChecks = checkKeywords(guideline, blog);
  const charCount = blog.sections.flatMap((s) => s.paragraphs).join("").replace(/\s/g, "").length;
  const cardCountOk = cards.slides.length >= 6 && cards.slides.length <= 8;
  const channelChecks = channels ? checkChannels(channels) : undefined;
  const privacy = checkPrivacy(blog, cards, channels, vocQuotes);
  const flags = [
    privacy.pass,
    ...(channelChecks ?? []).map((c) => c.pass),
    ...keywordChecks.map((k) => k.pass),
    ...missionChecks.map((m) => m.pass),
    charCount >= guideline.minChars,
    cardCountOk,
    true, // ad disclosure is always added at render/export time
  ];
  return {
    keywordChecks,
    missionChecks,
    charCount,
    minChars: guideline.minChars,
    adDisclosure: true,
    cardCountOk,
    channelChecks,
    privacy,
    passed: flags.filter(Boolean).length,
    total: flags.length,
  };
}

/** What still needs rewriting, as (reason, section) pairs for the targeted fix step. */
export function collectProblems(review: Review, blog: Blog): { reasons: string[]; sectionIndexes: number[]; fixTitle: boolean } {
  const reasons: string[] = [];
  const indexes = new Set<number>();
  const last = blog.sections.length - 1;
  for (const k of review.keywordChecks) {
    if (!k.pass) {
      reasons.push(`필수 키워드 ‘${k.keyword}’: 표기와 띄어쓰기를 그대로 ${k.minCount}회 이상 써야 합니다(현재 ${k.count}회).`);
      // The closing section is the least disruptive place to work a missing keyword in.
      indexes.add(last);
    }
  }
  for (const m of review.missionChecks) {
    if (!m.pass) {
      reasons.push(`미션 미충족: ${m.mission} (${m.note})`);
      const valid = m.sectionIndexes.filter((i) => i >= 0 && i <= last);
      // A title-only failure needs no section rewrite unless the reviewer named one.
      (valid.length ? valid : m.fixTitle ? [] : [last]).forEach((i) => indexes.add(i));
    }
  }
  if (review.privacy && review.privacy.blogSections.length) {
    reasons.push(`개인정보 노출: ${review.privacy.detail}. 전화번호·이메일·통화 인용·고객 이름을 빼고 다시 써야 합니다.`);
    review.privacy.blogSections.forEach((i) => indexes.add(Math.min(i, last)));
  }
  if (review.charCount < review.minChars) {
    reasons.push(`본문이 공백 제외 ${review.minChars}자 이상이어야 합니다(현재 ${review.charCount}자). 설명을 구체적으로 보강하세요.`);
    indexes.add(Math.min(1, last));
  }
  return { reasons, sectionIndexes: [...indexes].sort((a, b) => a - b), fixTitle: review.missionChecks.some((m) => !m.pass && m.fixTitle) };
}
