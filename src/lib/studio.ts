import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { PromoInput, PromoResult } from "./types";
import { NO_INVENTED, TONE, aiMode } from "./ai";
import { demoPromo } from "./studioDemo";

/**
 * Promo studio runs on Haiku: one request reads the document and the photos and
 * returns analysis + copy together, so a cheap, fast model keeps the page interactive.
 */
export const STUDIO_MODEL = "claude-haiku-5-5";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export type StudioDoc =
  | { name: string; kind: "pdf"; data: string }
  | { name: string; kind: "text"; text: string };

export interface StudioPhoto {
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
}

const PromoSchema = z.object({
  differentiators: z.array(z.object({
    title: z.string(),
    plain: z.string(),
    conventional: z.string(),
    ours: z.string(),
    evidence: z.array(z.object({ doc: z.string(), page: z.number().nullable(), quote: z.string() })),
  })),
  photos: z.array(z.object({ index: z.number(), description: z.string() })),
  promo: z.object({
    eyebrow: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    hook: z.string(),
    heroPhotoIndex: z.number().nullable(),
    highlights: z.array(z.object({
      title: z.string(),
      body: z.string(),
      differentiatorIndex: z.number(),
      photoIndex: z.number().nullable(),
      photoAlt: z.string().nullable(),
    })),
    ctaLabel: z.string(),
    ctaNote: z.string(),
  }),
  sns: z.object({ caption: z.string(), hashtags: z.array(z.string()) }),
});

const instructions = (input: PromoInput, photoCount: number) => `제품 정보
- 제품명: ${input.name}
- 회사: ${input.company || "(미입력)"}
- 한 줄 소개: ${input.summary || "(미입력)"}
- 홍보 대상 고객: ${input.audience || "(미입력: 문서에서 가장 알맞은 고객을 추정)"}

위 문서는 이 제품의 소개 자료이고, 이미지는 담당자가 올린 제품 사진·화면 ${photoCount}장입니다(0번부터 순서대로).
1) 문서를 근거로 기술적 차별점을 찾고, 2) 사진을 활용해 고객의 관심을 끄는 홍보 콘텐츠를 만들어 주세요.

differentiators (3~5개, 문서에서 근거를 찾을 수 있는 것만)
- title: 차별점 이름(20자 이내)
- plain: 고객이 바로 이해할 한 문장
- conventional: 흔한 대안이나 기존 방식은 어떻게 하는지
- ours: 이 제품의 기술이 무엇을 다르게 하는지(구체적인 기술·방식을 쉬운 말로)
- evidence: 근거 1~2개. doc은 문서 파일명 그대로, page는 페이지(슬라이드) 번호(알 수 없으면 null), quote는 문서 문구를 짧게 그대로 인용

photos: 각 사진(index)에 무엇이 보이는지 한 문장. 보이는 것만 씁니다.

promo: 제품 소개 페이지 상단에 들어갈 홍보 콘텐츠
- eyebrow: 헤드라인 위 작은 꼬리표(12자 이내)
- headline: 스크롤을 멈추게 하는 헤드라인(28자 이내). 고객이 얻는 결과나 공감되는 문제를 말합니다
- subheadline: 헤드라인을 받쳐 주는 한 문장(60자 이내)
- hook: 고객이 겪는 상황에서 시작하는 도입 문단(2문장)
- heroPhotoIndex: 첫 화면에 크게 쓸 사진 번호(가장 눈길을 끄는 사진, 없으면 null)
- highlights: 차별점마다 하나씩. title(18자 이내), body(2문장, 기능이 아니라 고객에게 생기는 변화 중심), differentiatorIndex(위 differentiators의 0부터 시작하는 번호), photoIndex(그 내용을 보여 주는 사진 번호, 없으면 null. heroPhotoIndex와 겹치지 않게 하고 같은 사진을 두 번 쓰지 않습니다), photoAlt(사진 대체 텍스트, 사진이 없으면 null)
- ctaLabel: 행동 동사로 끝나는 버튼 문구(12자 이내)
- ctaNote: 버튼 아래 부담을 덜어 주는 한 줄

sns: 같은 메시지를 인스타그램 게시물로
- caption: 3~5문장, 첫 줄은 훅. ‘광고’ 표기는 시스템이 넣으므로 쓰지 않습니다
- hashtags: 6~10개(# 없이, 공백 없이)

${NO_INVENTED}`;

/** Drops photo references the model invented and keeps each photo used at most once. */
function sanitize(out: z.infer<typeof PromoSchema>, photoCount: number): PromoResult {
  const valid = (i: number | null) => (i != null && Number.isInteger(i) && i >= 0 && i < photoCount ? i : null);
  const used = new Set<number>();
  const take = (i: number | null) => {
    const v = valid(i);
    if (v == null || used.has(v)) return null;
    used.add(v);
    return v;
  };
  const heroPhotoIndex = take(out.promo.heroPhotoIndex);
  const last = Math.max(0, out.differentiators.length - 1);
  return {
    mode: "live",
    model: STUDIO_MODEL,
    differentiators: out.differentiators,
    photos: out.photos.filter((p) => valid(p.index) != null),
    promo: {
      ...out.promo,
      heroPhotoIndex,
      highlights: out.promo.highlights.map((h) => {
        const photoIndex = take(h.photoIndex);
        return {
          ...h,
          differentiatorIndex: Math.min(Math.max(0, Math.round(h.differentiatorIndex)), last),
          photoIndex,
          photoAlt: photoIndex == null ? null : h.photoAlt,
        };
      }),
    },
    sns: { ...out.sns, hashtags: out.sns.hashtags.map((t) => t.replace(/^#/, "").replace(/\s/g, "")).filter(Boolean) },
  };
}

export async function generatePromo(input: PromoInput, docs: StudioDoc[], photos: StudioPhoto[]): Promise<PromoResult> {
  if (aiMode === "demo") return demoPromo(input, photos.length);

  const content: Anthropic.ContentBlockParam[] = [];
  for (const d of docs) {
    if (d.kind === "pdf") {
      content.push({ type: "text", text: `다음 문서의 파일명: ${d.name}` });
      content.push({ type: "document", title: d.name, source: { type: "base64", media_type: "application/pdf", data: d.data } });
    } else {
      content.push({ type: "text", text: `<document name="${d.name}">\n${d.text}\n</document>` });
    }
  }
  photos.forEach((p, i) => {
    content.push({ type: "text", text: `사진 ${i}` });
    content.push({ type: "image", source: { type: "base64", media_type: p.mime, data: p.data } });
  });
  content.push({ type: "text", text: instructions(input, photos.length) });

  const res = await anthropic().messages.parse({
    model: STUDIO_MODEL,
    max_tokens: 16000,
    system: `당신은 기술 제품의 차별점을 찾아 고객의 관심을 끄는 홍보 콘텐츠로 바꾸는 마케팅 카피라이터입니다. ${TONE}`,
    messages: [{ role: "user", content }],
    // Haiku 5.5 defaults to medium; set it explicitly so a default change cannot shift quality or cost.
    output_config: { effort: "medium", format: zodOutputFormat(PromoSchema) },
  });
  // Haiku has no server-side refusal fallback, so surface the refusal instead of retrying.
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청의 생성을 거절했습니다. 자료 내용을 확인해 주세요.");
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new Error("AI 응답이 완성되지 않았습니다. 다시 실행해 주세요.");
  return sanitize(res.parsed_output, photos.length);
}
