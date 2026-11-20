import type { Blog, CardNews, Guideline, KeywordCheck, MissionCheck, Review, Workspace } from "./types";

/** Disclosure text required by the KFTC endorsement guidelines; inserted by code, never left to the model. */
export function adDisclosure(ws: Workspace): string {
  return `[광고] 이 게시물은 ${ws.product.company}의 ${ws.product.name} 홍보를 위해 제작된 광고 콘텐츠입니다.`;
}

export const AD_HASHTAG = "광고";

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

export function buildReview(guideline: Guideline, blog: Blog, cards: CardNews, missionChecks: MissionCheck[]): Review {
  const keywordChecks = checkKeywords(guideline, blog);
  const charCount = blog.sections.flatMap((s) => s.paragraphs).join("").replace(/\s/g, "").length;
  const cardCountOk = cards.slides.length >= 6 && cards.slides.length <= 8;
  const flags = [
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
    passed: flags.filter(Boolean).length,
    total: flags.length,
  };
}

/** What still needs rewriting, as (reason, section) pairs for the targeted fix step. */
export function collectProblems(review: Review, blog: Blog): { reasons: string[]; sectionIndexes: number[] } {
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
      (valid.length ? valid : [last]).forEach((i) => indexes.add(i));
    }
  }
  if (review.charCount < review.minChars) {
    reasons.push(`본문이 공백 제외 ${review.minChars}자 이상이어야 합니다(현재 ${review.charCount}자). 설명을 구체적으로 보강하세요.`);
    indexes.add(Math.min(1, last));
  }
  return { reasons, sectionIndexes: [...indexes].sort((a, b) => a - b) };
}
