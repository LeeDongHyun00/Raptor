import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type {
  Blog, BlogSection, CardNews, ChannelId, Channels, Differentiator, Guideline, Material, MissionCheck, NewsItem, Plan, TrendItem, VocBoard, VocItem, Workspace,
} from "./types";
import { getAsset } from "./store";
import { demoBlog, demoCards, demoChannels, demoPlan, demoReviewMissions, demoRevise, sampleVoc } from "./demo";
import { maskPII } from "./voc";
import { LIMITS } from "./review";
import { seedDifferentiators } from "./seed";
import { NO_INVENTED, TONE } from "./prompts";

export const aiMode: "live" | "demo" =
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "live" : "demo";

/** Sonnet: document analysis, vision, trend-product matching, copywriting. */
const WRITER_MODEL = "claude-sonnet-5-5";
/** Haiku: fast, cheap guideline review. */
const REVIEWER_MODEL = "claude-haiku-5-5";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

type Content = Anthropic.Beta.BetaContentBlockParam[];

async function write<T>(schema: z.ZodType<T>, system: string, content: Content, effort: "low" | "medium" | "high" = "medium"): Promise<T> {
  const res = await anthropic().beta.messages.parse({
    model: WRITER_MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
    // If a safety classifier declines, let the API retry on its default fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청의 생성을 거절했습니다. 자료 내용을 확인해 주세요.");
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new Error("AI 응답이 완성되지 않았습니다. 다시 실행해 주세요.");
  return res.parsed_output;
}

async function review<T>(schema: z.ZodType<T>, system: string, text: string): Promise<T> {
  const res = await anthropic().messages.parse({
    model: REVIEWER_MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: text }],
    output_config: { effort: "low", format: zodOutputFormat(schema) },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("AI 검수 응답을 받지 못했습니다. 다시 실행해 주세요.");
  return res.parsed_output;
}


/* ---------- 1. Differentiator analysis ---------- */

const DiffSchema = z.object({
  differentiators: z.array(z.object({
    title: z.string(),
    plain: z.string(),
    conventional: z.string(),
    ours: z.string(),
    evidence: z.array(z.object({ doc: z.string(), page: z.number(), quote: z.string() })),
  })),
});

async function materialBlocks(docs: Material[]): Promise<Content> {
  const blocks: Content = [];
  for (const d of docs) {
    if (d.mime === "application/pdf") {
      const asset = await getAsset(d.id);
      if (!asset) continue;
      blocks.push({ type: "text", text: `다음 문서의 파일명: ${d.name}` });
      blocks.push({ type: "document", title: d.name, source: { type: "base64", media_type: "application/pdf", data: asset.data } });
    } else if (d.text) {
      blocks.push({ type: "text", text: `<document name="${d.name}">\n${d.text}\n</document>` });
    }
  }
  return blocks;
}

export async function analyzeDifferentiators(ws: Workspace): Promise<Differentiator[]> {
  const docs = ws.materials.filter((m) => m.kind === "doc" && !m.demo);
  if (aiMode === "demo" || docs.length === 0) return seedDifferentiators;
  const blocks = await materialBlocks(docs);
  if (blocks.length === 0) throw new Error("분석할 수 있는 문서 내용이 없습니다. PDF 또는 PPTX 자료를 올려 주세요.");
  const out = await write(
    DiffSchema,
    `당신은 B2B 기술 솔루션 마케팅 분석가입니다. ${TONE}`,
    [
      ...blocks,
      {
        type: "text",
        text: `위 자료는 ${ws.product.company}의 ‘${ws.product.name}’(${ws.product.summary}) 제안서와 매뉴얼입니다.
이 제품이 일반적인 업무 방식이나 흔한 대안과 비교해 갖는 차별점을 4~6개 뽑아 주세요.

각 항목:
- title: 차별점 이름(20자 이내)
- plain: 고객이 바로 이해할 한 문장
- conventional: 일반적인 방식에서는 어떻게 하는지
- ours: 이 제품에서는 어떻게 달라지는지
- evidence: 근거 1~3개. doc은 위에 표시된 파일명 그대로, page는 해당 내용이 있는 실제 페이지(슬라이드) 번호, quote는 그 페이지의 문구를 짧게 그대로 인용

자료에서 근거를 찾을 수 없는 내용은 차별점으로 넣지 마세요.`,
      },
    ],
    "high",
  );
  return out.differentiators.map((d, i) => ({ ...d, id: `d_${Date.now().toString(36)}_${i}` }));
}

/* ---------- 2. Screenshot understanding ---------- */

const ShotSchema = z.object({ screenshots: z.array(z.object({ id: z.string(), description: z.string() })) });

export async function describeScreenshots(ws: Workspace, shots: Material[]): Promise<Record<string, string>> {
  const todo = shots.filter((s) => !s.description);
  if (aiMode === "demo" || todo.length === 0) return {};
  const content: Content = [];
  for (const s of todo) {
    const asset = await getAsset(s.id);
    if (!asset || !/^image\/(png|jpeg|webp|gif)$/.test(asset.mime)) continue;
    content.push({ type: "text", text: `화면 캡처 id: ${s.id} (파일명: ${s.name})` });
    content.push({ type: "image", source: { type: "base64", media_type: asset.mime as "image/png", data: asset.data } });
  }
  if (content.length === 0) return {};
  content.push({
    type: "text",
    text: `위 이미지는 ‘${ws.product.name}’의 실제 사용 화면입니다. 각 화면이 어떤 기능을 보여 주는지 한 문장으로 설명해 주세요. 화면에 보이는 것만 쓰고, id는 주어진 값을 그대로 돌려주세요.`,
  });
  const out = await write(ShotSchema, "당신은 소프트웨어 화면을 읽고 설명하는 분석가입니다.", content, "low");
  return Object.fromEntries(out.screenshots.map((s) => [s.id, s.description]));
}

/* ---------- 3. Trend-product matching ---------- */

const PlanSchema = z.object({
  topic: z.string(),
  trendKeyword: z.string(),
  angle: z.string(),
  reason: z.string(),
  differentiatorIds: z.array(z.string()),
  coreMessage: z.string(),
  vocId: z.string().nullable(),
});

const diffList = (ds: Differentiator[]) =>
  ds.map((d) => `- [${d.id}] ${d.title}: ${d.plain} (일반 방식: ${d.conventional} / 이 제품: ${d.ours})`).join("\n");

export async function planTopic(args: {
  ws: Workspace; trends: TrendItem[]; news: NewsItem[]; usedTopics: string[]; voc?: VocItem[]; usedVocIds?: string[];
}): Promise<Plan> {
  const { ws, trends, news, usedTopics, voc = [], usedVocIds = [] } = args;
  if (aiMode === "demo") return demoPlan(usedTopics, voc, usedVocIds);
  // Only questions the documents can answer, and that no earlier run has answered, are candidates.
  const openVoc = voc.filter((v) => !usedVocIds.includes(v.id) && v.differentiatorIds.length > 0);
  const vocBlock = openVoc.length
    ? `

고객 질문 목록(실제 상담 통화에서 나온 질문을 일반화한 것, 통화 수가 많은 순):
${[...openVoc].sort((a, b) => b.count - a.count).map((v) => `- [${v.id}] ${v.question} (${v.category}, 통화 ${v.count}건, 답할 수 있는 차별점: ${v.differentiatorIds.join(", ")})`).join("\n")}

이 목록에서 통화 수가 많고 차별점으로 답할 수 있는 질문 하나를 골라, 그 질문에 답하는 콘텐츠로 기획합니다. 어울리는 트렌드가 있으면 함께 연결합니다.`
    : "";
  const plan = await write(
    PlanSchema,
    `당신은 B2B 콘텐츠 마케팅 기획자입니다. ${TONE}`,
    [{
      type: "text",
      text: `제품: ${ws.product.company} ‘${ws.product.name}’ — ${ws.product.summary}

제품 차별점:
${diffList(ws.differentiators)}

최근 2주 네이버 검색어 트렌드(직전 2주 대비 변화율):
${trends.map((t) => `- ${t.keyword}: ${t.change >= 0 ? "+" : ""}${t.change}%`).join("\n")}

관련 뉴스 제목:
${news.map((n) => `- (${n.keyword}) ${n.title}`).join("\n") || "- 없음"}

이전에 이미 다룬 주제(같은 주제나 같은 각도는 다시 쓰지 않습니다):
${usedTopics.map((t) => `- ${t}`).join("\n") || "- 없음"}

이번 격주 콘텐츠의 기획을 하나 정해 주세요. 요즘 관심이 오르는 이슈 중 제품 차별점과 자연스럽게 이어지는 것을 고르되, 억지 연결은 피합니다.${vocBlock}
- topic: 블로그 글 제목으로도 쓸 수 있는 주제(40자 이내)
- trendKeyword: 위 트렌드 목록에서 고른 키워드 하나(표기 그대로)
- angle: 어떤 관점으로 풀지 한 문장
- reason: 이 트렌드와 차별점을 연결한 이유(담당자가 읽는 설명, 2문장 이내)
- differentiatorIds: 이번 글에서 다룰 차별점 id 2~3개(대괄호 안의 id 그대로)
- coreMessage: 블로그·인스타그램·이메일·카카오톡 배너·쇼츠·검색광고가 형식만 바꿔 똑같이 반복할 핵심 메시지 한 문장(40자 이내)
- vocId: 고객 질문 목록에서 고른 질문의 id(대괄호 안 그대로). 목록이 없으면 null
- reason은 담당자만 보는 내부 설명이므로 “최근 통화 N건에서 나온 질문”처럼 통화 수를 써도 됩니다`,
    }],
  );
  const validIds = plan.differentiatorIds.filter((id) => ws.differentiators.some((d) => d.id === id));
  const picked = openVoc.find((v) => v.id === plan.vocId);
  const { vocId: _ignored, ...rest } = plan;
  void _ignored;
  return {
    ...rest,
    differentiatorIds: validIds.length ? validIds : ws.differentiators.slice(0, 3).map((d) => d.id),
    // The question text always comes from the stored item, never from the model's paraphrase.
    ...(picked ? { vocId: picked.id, customerQuestion: picked.question } : {}),
  };
}

/* ---------- 4. One source -> blog + card news ---------- */

const SectionSchema = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()),
  screenshotId: z.string().nullable(),
  caption: z.string().nullable(),
});
const BlogSchema = z.object({ title: z.string(), sections: z.array(SectionSchema), tags: z.array(z.string()) });

const guidelineText = (g: Guideline) => `필수 키워드(표기와 띄어쓰기를 그대로, 최소 횟수 이상):
${g.requiredKeywords.map((k) => `- ‘${k.keyword}’ ${k.minCount}회 이상`).join("\n")}
미션:
${g.missions.map((m, i) => `${i + 1}. ${m}`).join("\n")}
글 구성 순서: ${g.structure.join(" → ")}
분량: 본문 공백 제외 ${g.minChars}자 이상`;

const shotList = (shots: Material[]) =>
  shots.map((s) => `- [${s.id}] ${s.description ?? s.name}`).join("\n") || "- 없음";

const briefing = (ws: Workspace, plan: Plan) => `제품: ${ws.product.company} ‘${ws.product.name}’ — ${ws.product.summary}

이번 기획
- 주제: ${plan.topic}
- 연결한 트렌드: ${plan.trendKeyword}
- 관점: ${plan.angle}
- 모든 채널이 공유하는 핵심 메시지: ${plan.coreMessage ?? plan.topic}
${plan.customerQuestion ? `
이번 콘텐츠가 답할 고객 질문: ${plan.customerQuestion}
- 이 질문은 실제 상담 통화에서 나온 질문을 일반화한 것입니다. 질문에 직접 답하는 것이 콘텐츠의 목적입니다.
- 고객 수, 통화 건수, 통화 인용, 고객사 이름은 쓰지 않습니다.
` : ""}
이번에 다룰 차별점:
${diffList(ws.differentiators.filter((d) => plan.differentiatorIds.includes(d.id)))}`;

function sanitizeShots<T extends { screenshotId: string | null }>(items: T[], shots: Material[]): T[] {
  return items.map((it) => (it.screenshotId && !shots.some((s) => s.id === it.screenshotId) ? { ...it, screenshotId: null } : it));
}

export async function writeBlog(ws: Workspace, plan: Plan, shots: Material[]): Promise<Blog> {
  if (aiMode === "demo") return demoBlog(plan);
  const blog = await write(
    BlogSchema,
    `당신은 네이버 블로그에 올릴 B2B 솔루션 소개 글을 쓰는 카피라이터입니다. ${TONE}`,
    [{
      type: "text",
      text: `${briefing(ws, plan)}

사용할 수 있는 화면 캡처(본문에 배치할 때는 대괄호 안의 id를 screenshotId에 그대로 넣습니다):
${shotList(shots)}

가이드라인:
${guidelineText(ws.guideline)}

위 기획으로 네이버 블로그 글을 써 주세요. 블로그는 검색으로 찾아온 사람이 읽습니다. 광고처럼 보이는 글이 아니라 검색한 질문에 답하고 문제를 풀어 주는 정보성 글이어야 합니다.
- 제목은 사람들이 실제로 검색할 만한 표현(“○○ 방법”, “○○ 추천”, “○○ 비교” 등)을 앞쪽에 둡니다
- 첫 섹션의 첫 문단 3줄 안에 질문에 대한 결론을 먼저 말하고, 자세한 설명은 뒤에 둡니다
- 일반적인 방식과 이 제품의 방식을 상황별로 비교하거나, 문제를 푸는 단계별 과정 안에 제품을 녹입니다
- 훑어 읽기 쉽게 소제목을 구체적으로 쓰고 문단은 짧게 끊습니다
- 행동 유도는 글 중간에 한 번, 끝에 한 번, 부담 없는 표현으로 넣습니다
- sections는 5~7개. 각 섹션은 소제목(heading)과 문단(paragraphs) 1~3개
- 화면 캡처는 그 기능을 설명하는 섹션에 배치하고, caption에 화면이 무엇을 보여 주는지 한 문장으로 답니다. 캡처가 없는 섹션은 screenshotId와 caption을 null로 둡니다
- 같은 캡처를 두 번 쓰지 않습니다
- ‘광고’ 표기는 시스템이 따로 넣으므로 본문에 쓰지 않습니다
- tags: 블로그 태그 5~8개(# 없이)${plan.customerQuestion ? `\n- 소제목 하나는 고객 질문을 질문 형태 그대로 쓰고, 첫 섹션 첫 문단 3줄 안에서 그 질문에 대한 답을 먼저 말합니다` : ""}`,
    }],
  );
  return { ...blog, sections: sanitizeShots(blog.sections, shots) };
}

const CardsSchema = z.object({
  slides: z.array(z.object({
    kind: z.enum(["cover", "point", "cta"]),
    eyebrow: z.string(),
    title: z.string(),
    body: z.string(),
    screenshotId: z.string().nullable(),
  })),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export async function writeCards(ws: Workspace, plan: Plan, shots: Material[]): Promise<CardNews> {
  if (aiMode === "demo") return demoCards(plan, ws);
  const cards = await write(
    CardsSchema,
    `당신은 인스타그램 카드뉴스를 만드는 B2B 콘텐츠 에디터입니다. ${TONE}`,
    [{
      type: "text",
      text: `${briefing(ws, plan)}

사용할 수 있는 화면 캡처(대괄호 안의 id를 screenshotId에 그대로):
${shotList(shots)}

같은 기획으로 블로그 글도 함께 만들어집니다. 인스타그램 카드뉴스(캐러셀)를 써 주세요. 인스타그램은 첫 1초에 스크롤을 멈추게 하고, 저장·공유하고 싶게 만들어야 성과가 납니다.
- 첫 장 title은 공감되는 상황이나 질문으로 스크롤을 멈추게 하는 훅입니다
- “○○ 하는 법 3가지”처럼 나중에 다시 보려고 저장할 만한 정보형 구성으로 만듭니다
- 가능하면 한 장은 기존 방식(Before)과 제품 사용 후(After)의 대비를 보여 줍니다
- 유행 형식을 빌리더라도 메시지는 제품의 문제 해결로 이어져야 합니다
- slides는 6~8장. 첫 장은 kind "cover", 마지막 장은 kind "cta", 나머지는 "point"
- 한 장에 메시지 하나. title은 22자 이내, body는 70자 이내(cover의 body는 빈 문자열)
- eyebrow는 장 위에 작게 들어가는 꼬리표(10자 이내). cover의 eyebrow는 트렌드 키워드
- 기능을 설명하는 장에는 어울리는 화면 캡처를 배치하고, 없으면 screenshotId를 null로
- 흐름: 공감되는 문제 → 트렌드와 연결 → 차별점별 해결 → 정리 → 문의 유도
- caption: 인스타그램 본문(3~5문장, 줄바꿈 가능). ‘광고’ 표기는 시스템이 따로 넣으므로 쓰지 않습니다
- hashtags: 8~12개(# 없이, 공백 없이)${plan.customerQuestion ? `\n- 첫 장(cover)의 title은 고객 질문을 그대로(길면 뜻을 유지해 줄여서) 씁니다` : ""}`,
    }],
  );
  return { ...cards, slides: sanitizeShots(cards.slides, shots) };
}

/* ---------- 4b. Same plan in four more formats ---------- */

const EmailSchema = z.object({
  subjects: z.array(z.string()), preheader: z.string(), greeting: z.string(), paragraphs: z.array(z.string()), ctaLabel: z.string(),
});
const KakaoSchema = z.object({
  banners: z.array(z.object({
    copy: z.string(), sub: z.string(), cta: z.string(), hook: z.enum(["숫자", "손실 회피", "질문"]), target: z.string(),
  })),
});
const ShortsSchema = z.object({
  title: z.string(),
  scenes: z.array(z.object({ seconds: z.number(), visual: z.string(), narration: z.string(), overlay: z.string() })),
  loop: z.string(),
  pinnedComment: z.string(),
});
const SearchAdsSchema = z.object({
  keywords: z.array(z.string()),
  negativeKeywords: z.array(z.string()),
  ads: z.array(z.object({ headline: z.string(), description: z.string() })),
  sitelinks: z.array(z.string()),
});

const fixNote = (notes?: string[]) =>
  notes?.length ? `\n\n이전 결과는 자동 검수에서 아래 규칙을 지키지 못했습니다. 이번에는 반드시 지켜 주세요:\n${notes.map((n) => `- ${n}`).join("\n")}` : "";


const channelWriters: { [K in ChannelId]: (ws: Workspace, plan: Plan, notes?: string[]) => Promise<Channels[K]> } = {
  email: (ws, plan, notes) =>
    write(EmailSchema, `당신은 B2B 솔루션의 이메일 마케팅 카피라이터입니다. ${TONE}`, [{
      type: "text",
      text: `${briefing(ws, plan)}

이미 관심을 보인 잠재 고객에게 보내는 1:1 편지 같은 이메일을 써 주세요. 열게 하는 제목과, 행동 하나만 요구하는 본문이 핵심입니다.
- subjects: A/B 테스트용 제목 2개. 혜택이나 궁금증을 짧고 구체적으로, 각각 ${LIMITS.emailSubject}자 이내. ‘(광고)’ 표기는 시스템이 제목 앞에 넣으므로 쓰지 않습니다
- preheader: 제목을 보완하는 미리보기 문구 한 줄(40자 이내)
- greeting: 인사 한 줄. 받는 사람 이름 자리에는 {{이름}}을 씁니다
- paragraphs: 본문 3~4문단. 고객이 겪는 상황에서 시작하는 이야기처럼 사람 냄새 나게 쓰고, 모바일에서 읽기 쉽게 문단은 2~3문장으로 짧게
- ctaLabel: 버튼 문구 하나(12자 이내). 본문에는 다른 링크나 두 번째 행동 요청을 넣지 않습니다
- 수신거부 안내는 시스템이 넣으므로 쓰지 않습니다${plan.customerQuestion ? `\n- 제목 후보 2개 중 하나는 고객 질문을 담은 질문형으로 씁니다` : ""}
${NO_INVENTED}${fixNote(notes)}`,
    }]),
  kakao: async (ws, plan, notes) =>
    (await write(KakaoSchema, `당신은 카카오톡 비즈보드 배너 카피라이터입니다. ${TONE}`, [{
      type: "text",
      text: `${briefing(ws, plan)}

카카오톡 대화 목록 위에 뜨는 배너 문구를 서로 다른 소재 3개로 써 주세요. 0.5초 안에 읽히는 한 줄이어야 합니다.
- copy: 메인 한 줄, 메시지는 하나만. ${LIMITS.kakaoCopy}자 이내(공백 포함)
- sub: 보조 한 줄. ${LIMITS.kakaoSub}자 이내
- cta: 행동 동사로 끝나는 버튼 문구(“확인하기”, “알아보기”처럼 5자 이내)
- hook: 소재 유형. "숫자"(구체적인 숫자로 주는 충격), "손실 회피"(“아직도 ○○ 직접 하세요?”처럼 안 쓰면 손해라는 느낌), "질문"(호기심을 부르는 질문) 중 하나. 세 소재는 가능하면 유형을 다르게 합니다
- target: 이 소재가 겨냥하는 대상(예: 영업팀장)
- 숫자는 자료나 제품 구성에서 확인되는 것만 씁니다
${NO_INVENTED}${fixNote(notes)}`,
    }])).banners,
  shorts: (ws, plan, notes) =>
    write(ShortsSchema, `당신은 유튜브 쇼츠·인스타그램 릴스·틱톡용 짧은 영상 대본 작가입니다. ${TONE}`, [{
      type: "text",
      text: `${briefing(ws, plan)}

쇼츠·릴스·틱톡에 함께 쓸 세로형 짧은 영상 대본을 써 주세요.
- 전체 길이 ${LIMITS.shortsMin}~${LIMITS.shortsMax}초, 영상 하나에 메시지 하나
- 첫 장면(1~2초)은 문제 상황을 바로 보여 주는 훅
- “문제 → 해결 → 결과” 순서로 끝냅니다
- scenes: 장면 4~7개. seconds는 장면 길이(초, 정수), visual은 화면에 보이는 것(사람 얼굴과 목소리가 나오는 1인칭 촬영 위주, 연출보다 날것의 느낌. 제품 화면 녹화가 필요한 장면은 그렇게 적습니다), narration은 말하는 대사, overlay는 큰 글씨 자막(소리를 끄고 봐도 이해되도록 모든 장면에 넣고, 14자 이내)
- loop: 마지막 장면이 첫 장면으로 자연스럽게 이어져 다시 보게 되는 구조 설명 한 문장
- pinnedComment: 고정 댓글에 넣을 문구(행동 유도 포함, 링크 자리는 ‘프로필 링크’로 표현)
- title: 영상 제목(30자 이내)${plan.customerQuestion ? `\n- 첫 장면의 대사는 고객 질문으로 시작합니다` : ""}
${NO_INVENTED}${fixNote(notes)}`,
    }]),
  searchAds: (ws, plan, notes) =>
    write(SearchAdsSchema, `당신은 네이버·구글 검색광고 운영자입니다. ${TONE}`, [{
      type: "text",
      text: `${briefing(ws, plan)}

지금 솔루션을 찾고 있는 사람을 잡는 검색광고 소재를 써 주세요.
- keywords: 구매 의도가 강한 검색어 5~8개(“추천”, “가격”, “비교”, “프로그램”처럼 도입을 검토하는 표현 위주)
- negativeKeywords: 전환 가능성이 낮아 제외할 검색어 4~6개(개인용, 무료 다운로드 등)
- ads: 광고 3개. headline은 검색어를 그대로 담아 ${LIMITS.adHeadline}자 이내(공백 포함), description은 ${LIMITS.adDescription}자 이내로 차별점 하나를 분명히 말하고 행동 유도로 끝냅니다
- sitelinks: 확장 소재로 쓸 서브링크 이름 4개(각 8자 이내)
- 경쟁사 이름은 쓰지 않습니다${plan.customerQuestion ? `\n- keywords에는 고객 질문에서 나온 질문형 검색어(“○○ 방법”, “○○ 되나요”)를 2개 이상 넣습니다` : ""}
${NO_INVENTED}${fixNote(notes)}`,
    }]),
};

export async function writeChannels(args: {
  ws: Workspace; plan: Plan; only?: ChannelId[]; notes?: Partial<Record<ChannelId, string[]>>;
}): Promise<Partial<Channels>> {
  const { ws, plan, only, notes } = args;
  if (aiMode === "demo") return demoChannels(plan, ws);
  const ids = only ?? (Object.keys(channelWriters) as ChannelId[]);
  const results = await Promise.all(ids.map((id) => channelWriters[id](ws, plan, notes?.[id])));
  return Object.fromEntries(ids.map((id, i) => [id, results[i]])) as Partial<Channels>;
}

/* ---------- 5. Guideline review (missions) and targeted rewrite ---------- */

const MissionSchema = z.object({
  checks: z.array(z.object({
    missionNumber: z.number(),
    pass: z.boolean(),
    note: z.string(),
    sectionIndexes: z.array(z.number()),
    fixTitle: z.boolean(),
  })),
});

const numberedBlog = (blog: Blog) =>
  `제목: ${blog.title}\n\n` +
  blog.sections.map((s, i) =>
    `[섹션 ${i}] ${s.heading}\n${s.paragraphs.join("\n")}${s.screenshotId ? `\n(화면 캡처 배치됨: ${s.screenshotId} / 캡션: ${s.caption ?? "없음"})` : ""}`,
  ).join("\n\n");

export async function reviewMissions(guideline: Guideline, blog: Blog): Promise<MissionCheck[]> {
  if (guideline.missions.length === 0) return [];
  if (aiMode === "demo") return demoReviewMissions(guideline, blog);
  const out = await review(
    MissionSchema,
    "당신은 블로그 원고가 가이드라인의 미션을 지켰는지 판정하는 검수자입니다. 원고에 실제로 쓰인 내용만 근거로 엄격하게 판정합니다.",
    `미션 목록:
${guideline.missions.map((m, i) => `${i + 1}. ${m}`).join("\n")}

원고:
${numberedBlog(blog)}

각 미션에 대해 판정해 주세요.
- missionNumber: 미션 번호
- pass: 지켰으면 true
- note: 판정 근거 한 문장
- sectionIndexes: 지키지 못했다면 고쳐 써야 할 섹션 번호들, 지켰다면 빈 배열. ‘첫 문단’에 관한 미션이면 0번
- fixTitle: 제목을 고쳐야만 해결되는 실패면 true, 아니면 false`,
  );
  return guideline.missions.map((mission, i) => {
    const c = out.checks.find((x) => x.missionNumber === i + 1);
    // A mission the reviewer skipped counts as unverified, not as passed.
    return c
      ? { mission, pass: c.pass, note: c.note, sectionIndexes: c.sectionIndexes, fixTitle: !c.pass && c.fixTitle }
      : { mission, pass: false, note: "검수 결과를 받지 못했습니다", sectionIndexes: [] };
  });
}

const ReviseSchema = z.object({
  title: z.string().nullable(),
  sections: z.array(z.object({ index: z.number(), section: SectionSchema })),
});

/** Rewrites only what failed review (sections, and the title when a rule concerns it); the rest stays untouched. */
export async function reviseBlog(args: {
  ws: Workspace; plan: Plan; blog: Blog; shots: Material[]; reasons: string[]; sectionIndexes: number[]; fixTitle?: boolean;
}): Promise<{ title?: string; sections: { index: number; section: BlogSection }[] }> {
  const { ws, plan, blog, shots, reasons, sectionIndexes, fixTitle } = args;
  if (aiMode === "demo") return demoRevise(plan, blog, sectionIndexes);
  const scope = [
    fixTitle ? "제목" : "",
    sectionIndexes.length ? `섹션 ${sectionIndexes.join(", ")}번` : "",
  ].filter(Boolean).join("과 ");
  const out = await write(
    ReviseSchema,
    `당신은 네이버 블로그에 올릴 B2B 솔루션 소개 글을 고쳐 쓰는 카피라이터입니다. ${TONE}`,
    [{
      type: "text",
      text: `${briefing(ws, plan)}

사용할 수 있는 화면 캡처:
${shotList(shots)}

가이드라인의 필수 키워드: ${ws.guideline.requiredKeywords.map((k) => `‘${k.keyword}’`).join(", ") || "없음"}

현재 원고:
${numberedBlog(blog)}

자동 검수에서 아래 항목을 지키지 못했습니다:
${reasons.map((r) => `- ${r}`).join("\n")}

${scope}만 고쳐 써서 위 항목을 모두 해결해 주세요.
- title: ${fixTitle ? "새 제목을 씁니다. 제목에 들어가야 하는 키워드를 표기 그대로 모두 넣습니다" : "제목은 고치지 않으므로 null"}
- sections: 고친 섹션만 넣고 index에는 원래 섹션 번호를 넣습니다. 다른 섹션은 그대로 두며 결과에 넣지 않습니다${sectionIndexes.length ? "" : " (이번에는 빈 배열)"}
- 고친 부분은 앞뒤와 자연스럽게 이어져야 하고, 필수 키워드는 표기와 띄어쓰기를 그대로 써야 횟수로 인정됩니다`,
    }],
  );
  const fixed = out.sections.filter((x) => sectionIndexes.includes(x.index));
  return {
    title: fixTitle && out.title?.trim() ? out.title.trim() : undefined,
    sections: fixed.map((f) => ({ index: f.index, section: sanitizeShots([f.section], shots)[0] })),
  };
}

/* ---------- 6. Voice of customer: call summaries -> question board ---------- */

const VocSchema = z.object({
  items: z.array(z.object({
    question: z.string(),
    category: z.enum(["도입 문의", "기능 질문", "도입 우려", "불만·장애"]),
    count: z.number(),
    quotes: z.array(z.string()),
    differentiatorIds: z.array(z.string()),
    angle: z.string(),
  })),
});

/**
 * Groups masked call summaries into at most eight customer questions.
 * `summaries` must already be PII-masked; only the analysis result is kept.
 */
export async function extractVoc(ws: Workspace, summaries: string[], sourceLabel: string): Promise<VocBoard> {
  if (aiMode === "demo") return sampleVoc;
  const out = await write(
    VocSchema,
    `당신은 B2B 솔루션의 고객 상담 통화를 분석해 고객이 자주 묻는 질문을 정리하는 분석가입니다. ${TONE}`,
    [{
      type: "text",
      text: `제품: ${ws.product.company} ‘${ws.product.name}’ — ${ws.product.summary}

제품 차별점(제품 문서로 확인된 내용):
${ws.differentiators.map((d) => `- [${d.id}] ${d.title}: ${d.ours}`).join("\n")}

아래는 상담 통화 요약 ${summaries.length}건입니다. 전화번호와 이메일은 이미 가려져 있습니다.
${summaries.map((t, i) => `<call n="${i + 1}">\n${t}\n</call>`).join("\n")}

고객이 통화에서 물어본 질문을 유형별로 묶어 최대 8개로 정리해 주세요. 비슷한 질문은 하나로 묶습니다.
- question: 고객이 실제로 할 법한 말투의 질문형 한 문장. 사람 이름, 전화번호, 회사명, 특정 거래 내용은 빼고 누구나 할 수 있는 질문으로 일반화합니다
- category: "도입 문의", "기능 질문", "도입 우려", "불만·장애" 중 하나
- count: 이 질문으로 묶인 통화 수(실제로 센 값)
- quotes: 내부 확인용 짧은 인용 1~2개(각 40자 이내). 사람 이름, 회사명, 번호가 들어간 부분은 인용하지 않습니다
- differentiatorIds: 이 질문에 답할 수 있는 차별점 id(대괄호 안 그대로). 위 차별점으로 답할 수 없는 질문이면 빈 배열로 둡니다. "불만·장애" 질문은 차별점에 해결 기능이 분명히 있을 때만 연결합니다
- angle: 이 질문에 답하는 콘텐츠를 어떤 각도로 풀지 한 문장`,
    }],
  );
  const stamp = Date.now().toString(36);
  const items: VocItem[] = out.items.slice(0, 8).map((it, i) => ({
    id: `v_${stamp}_${i}`,
    question: maskPII(it.question),
    category: it.category,
    count: Math.max(1, Math.round(it.count)),
    // Masked again on the way out, in case the model echoed something the input masking missed.
    quotes: it.quotes.slice(0, 2).map(maskPII),
    differentiatorIds: it.differentiatorIds.filter((id) => ws.differentiators.some((d) => d.id === id)),
    angle: it.angle,
  }));
  return { source: sourceLabel, analyzedAt: new Date().toISOString(), mode: "live", items: items.sort((a, b) => b.count - a.count) };
}
