import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type {
  Blog, BlogSection, CardNews, Differentiator, Guideline, Material, MissionCheck, NewsItem, Plan, TrendItem, Workspace,
} from "./types";
import { getAsset } from "./store";
import { demoBlog, demoCards, demoPlan, demoReviewMissions, demoRevise } from "./demo";
import { seedDifferentiators } from "./seed";

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

const TONE = `글은 기술을 모르는 실무자도 바로 이해할 수 있는 쉬운 한국어로 씁니다. 전문 용어는 풀어 쓰고, 과장·최상급 표현과 근거 없는 수치, 경쟁사 비방은 쓰지 않습니다. 제공된 자료에 없는 기능이나 사실을 지어내지 않습니다.`;

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
    // Claude vision accepts raster images only; SVG placeholders are skipped.
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
});

const diffList = (ds: Differentiator[]) =>
  ds.map((d) => `- [${d.id}] ${d.title}: ${d.plain} (일반 방식: ${d.conventional} / 이 제품: ${d.ours})`).join("\n");

export async function planTopic(args: {
  ws: Workspace; trends: TrendItem[]; news: NewsItem[]; usedTopics: string[];
}): Promise<Plan> {
  const { ws, trends, news, usedTopics } = args;
  if (aiMode === "demo") return demoPlan(usedTopics);
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

이번 격주 콘텐츠의 기획을 하나 정해 주세요. 요즘 관심이 오르는 이슈 중 제품 차별점과 자연스럽게 이어지는 것을 고르되, 억지 연결은 피합니다.
- topic: 블로그 글 제목으로도 쓸 수 있는 주제(40자 이내)
- trendKeyword: 위 트렌드 목록에서 고른 키워드 하나(표기 그대로)
- angle: 어떤 관점으로 풀지 한 문장
- reason: 이 트렌드와 차별점을 연결한 이유(담당자가 읽는 설명, 2문장 이내)
- differentiatorIds: 이번 글에서 다룰 차별점 id 2~3개(대괄호 안의 id 그대로)`,
    }],
  );
  const validIds = plan.differentiatorIds.filter((id) => ws.differentiators.some((d) => d.id === id));
  return { ...plan, differentiatorIds: validIds.length ? validIds : ws.differentiators.slice(0, 3).map((d) => d.id) };
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

위 기획으로 네이버 블로그 글을 써 주세요.
- sections는 5~7개. 각 섹션은 소제목(heading)과 문단(paragraphs) 1~3개
- 화면 캡처는 그 기능을 설명하는 섹션에 배치하고, caption에 화면이 무엇을 보여 주는지 한 문장으로 답니다. 캡처가 없는 섹션은 screenshotId와 caption을 null로 둡니다
- 같은 캡처를 두 번 쓰지 않습니다
- ‘광고’ 표기는 시스템이 따로 넣으므로 본문에 쓰지 않습니다
- tags: 블로그 태그 5~8개(# 없이)`,
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

같은 기획으로 블로그 글도 함께 만들어집니다. 인스타그램 카드뉴스를 써 주세요.
- slides는 6~8장. 첫 장은 kind "cover", 마지막 장은 kind "cta", 나머지는 "point"
- 한 장에 메시지 하나. title은 22자 이내, body는 70자 이내(cover의 body는 빈 문자열)
- eyebrow는 장 위에 작게 들어가는 꼬리표(10자 이내). cover의 eyebrow는 트렌드 키워드
- 기능을 설명하는 장에는 어울리는 화면 캡처를 배치하고, 없으면 screenshotId를 null로
- 흐름: 공감되는 문제 → 트렌드와 연결 → 차별점별 해결 → 정리 → 문의 유도
- caption: 인스타그램 본문(3~5문장, 줄바꿈 가능). ‘광고’ 표기는 시스템이 따로 넣으므로 쓰지 않습니다
- hashtags: 8~12개(# 없이, 공백 없이)`,
    }],
  );
  return { ...cards, slides: sanitizeShots(cards.slides, shots) };
}

/* ---------- 5. Guideline review (missions) and targeted rewrite ---------- */

const MissionSchema = z.object({
  checks: z.array(z.object({
    missionNumber: z.number(),
    pass: z.boolean(),
    note: z.string(),
    sectionIndexes: z.array(z.number()),
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
- sectionIndexes: 지키지 못했다면 고쳐 써야 할 섹션 번호들, 지켰다면 빈 배열`,
  );
  return guideline.missions.map((mission, i) => {
    const c = out.checks.find((x) => x.missionNumber === i + 1);
    // A mission the reviewer skipped counts as unverified, not as passed.
    return c
      ? { mission, pass: c.pass, note: c.note, sectionIndexes: c.sectionIndexes }
      : { mission, pass: false, note: "검수 결과를 받지 못했습니다", sectionIndexes: [] };
  });
}

const ReviseSchema = z.object({ sections: z.array(z.object({ index: z.number(), section: SectionSchema })) });

/** Rewrites only the sections that failed review; everything else stays untouched. */
export async function reviseBlog(args: {
  ws: Workspace; plan: Plan; blog: Blog; shots: Material[]; reasons: string[]; sectionIndexes: number[];
}): Promise<{ index: number; section: BlogSection }[]> {
  const { ws, plan, blog, shots, reasons, sectionIndexes } = args;
  if (aiMode === "demo") return demoRevise(plan, blog, sectionIndexes);
  const out = await write(
    ReviseSchema,
    `당신은 네이버 블로그에 올릴 B2B 솔루션 소개 글을 고쳐 쓰는 카피라이터입니다. ${TONE}`,
    [{
      type: "text",
      text: `${briefing(ws, plan)}

사용할 수 있는 화면 캡처:
${shotList(shots)}

현재 원고:
${numberedBlog(blog)}

자동 검수에서 아래 항목을 지키지 못했습니다:
${reasons.map((r) => `- ${r}`).join("\n")}

섹션 ${sectionIndexes.join(", ")}번만 고쳐 써서 위 항목을 모두 해결해 주세요. 다른 섹션은 그대로 두며 결과에 넣지 않습니다. 고친 섹션은 앞뒤 섹션과 자연스럽게 이어져야 하고, index에는 원래 섹션 번호를 넣습니다. 필수 키워드는 표기와 띄어쓰기를 그대로 써야 횟수로 인정됩니다.`,
    }],
  );
  const fixed = out.sections.filter((s) => sectionIndexes.includes(s.index));
  return fixed.map((f) => ({ index: f.index, section: sanitizeShots([f.section], shots)[0] }));
}
