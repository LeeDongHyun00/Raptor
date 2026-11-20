import type { Blog, CardNews, Channels, Run } from "./types";

/** Everything a run produced that a person may edit, addressed by dotted paths like "cards.slides.2.title". */
export interface RunContent {
  blog?: Blog;
  cards?: CardNews;
  channels?: Partial<Channels>;
}

export const contentOf = (run: Run): RunContent => ({ blog: run.blog, cards: run.cards, channels: run.channels });

type Node = Record<string, unknown> | unknown[];

export function getAt(content: RunContent, path: string): string | undefined {
  let node: unknown = content;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" ? node : undefined;
}

/** Returns a copy of `content` with the string at `path` replaced. */
export function setAt(content: RunContent, path: string, value: string): RunContent {
  const copy = structuredClone(content);
  const keys = path.split(".");
  let node = copy as unknown as Node;
  for (const key of keys.slice(0, -1)) {
    const next = (node as Record<string, unknown>)[key];
    if (next == null || typeof next !== "object") return content;
    node = next as Node;
  }
  const last = keys[keys.length - 1];
  if (typeof (node as Record<string, unknown>)[last] !== "string") return content;
  (node as Record<string, unknown>)[last] = value;
  return copy;
}

// Structure, not wording: these stay as generated even if an edit payload carries other values.
const LOCKED = new Set(["screenshotId", "kind", "hook", "id"]);

/**
 * Copies edited wording from `input` onto `stored` and nothing else: the shape, numbers,
 * screenshot placement and array lengths always come from the stored version, so an
 * edit request cannot add fields or restructure a run.
 */
export function mergeText<T>(stored: T, input: unknown, max = 3000): T {
  if (typeof stored === "string") return (typeof input === "string" ? input.slice(0, max) : stored) as T;
  if (Array.isArray(stored)) {
    const arr = Array.isArray(input) ? input : [];
    return stored.map((item, i) => mergeText(item, arr[i], max)) as T;
  }
  if (stored && typeof stored === "object") {
    const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    return Object.fromEntries(
      Object.entries(stored).map(([k, v]) => [k, LOCKED.has(k) ? v : mergeText(v, src[k], max)]),
    ) as T;
  }
  return stored;
}

const CHANNEL_NAME: Record<string, string> = { email: "이메일", kakao: "카카오톡 배너", shorts: "쇼츠·릴스 대본", searchAds: "검색광고" };
const FIELD_NAME: Record<string, string> = {
  title: "제목", heading: "소제목", paragraphs: "본문", caption: "캡션", eyebrow: "꼬리표", body: "설명", hashtags: "해시태그", tags: "태그",
  subjects: "제목 후보", preheader: "미리보기 문구", greeting: "인사말", ctaLabel: "버튼 문구", copy: "메인 문구", sub: "보조 문구", cta: "버튼 문구",
  target: "대상", visual: "화면", narration: "대사", overlay: "자막", loop: "루프 설명", pinnedComment: "고정 댓글",
  keywords: "키워드", negativeKeywords: "제외 키워드", headline: "광고 제목", description: "광고 설명", sitelinks: "서브링크",
};

/** Human label for a path, used as context when asking for rewrite suggestions. */
export function labelOf(path: string): string {
  const keys = path.split(".");
  const where = keys[0] === "blog" ? "블로그 글" : keys[0] === "cards" ? "인스타그램 카드뉴스" : CHANNEL_NAME[keys[1]] ?? "콘텐츠";
  const field = [...keys].reverse().find((k) => FIELD_NAME[k]);
  return `${where}의 ${field ? FIELD_NAME[field] : "문구"}`;
}
