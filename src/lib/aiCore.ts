import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Differentiator, Workspace } from "./types";
import { NO_INVENTED, TONE } from "./prompts";
import type { EditSuggestion } from "./suggestRules";

export { heuristicSuggestions, type EditSuggestion } from "./suggestRules";

/**
 * Requests that must work both on the server and in the browser (static build or a
 * deployment without a server key, where the viewer supplies their own key).
 * The caller passes the client; nothing here touches the store or the filesystem.
 */

export type AnalysisDoc =
  | { name: string; kind: "pdf"; data: string }
  | { name: string; kind: "text"; text: string };

const DiffSchema = z.object({
  differentiators: z.array(z.object({
    title: z.string(),
    plain: z.string(),
    conventional: z.string(),
    ours: z.string(),
    evidence: z.array(z.object({ doc: z.string(), page: z.number(), quote: z.string() })),
  })),
});

/** Reads the product documents and returns differentiators with page-level evidence. */
export async function requestDifferentiators(client: Anthropic, product: Workspace["product"], docs: AnalysisDoc[]): Promise<Differentiator[]> {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const d of docs) {
    if (d.kind === "pdf") {
      blocks.push({ type: "text", text: `다음 문서의 파일명: ${d.name}` });
      blocks.push({ type: "document", title: d.name, source: { type: "base64", media_type: "application/pdf", data: d.data } });
    } else if (d.text.trim()) {
      blocks.push({ type: "text", text: `<document name="${d.name}">\n${d.text}\n</document>` });
    }
  }
  if (blocks.length === 0) throw new Error("분석할 수 있는 문서 내용이 없습니다. PDF 또는 PPTX 자료를 올려 주세요.");
  const res = await client.beta.messages.parse({
    model: "claude-sonnet-5-5",
    max_tokens: 16000,
    system: `당신은 B2B 기술 솔루션 마케팅 분석가입니다. ${TONE}`,
    messages: [{
      role: "user",
      content: [
        ...blocks,
        {
          type: "text",
          text: `위 자료는 ${product.company}의 ‘${product.name}’(${product.summary}) 제안서와 매뉴얼입니다.
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
    }],
    output_config: { effort: "high", format: betaZodOutputFormat(DiffSchema) },
    // If a safety classifier declines, let the API retry on its default fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 문서의 분석을 거절했습니다. 자료 내용을 확인해 주세요.");
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new Error("AI 응답이 완성되지 않았습니다. 다시 실행해 주세요.");
  const stamp = Date.now().toString(36);
  return res.parsed_output.differentiators.map((d, i) => ({ ...d, id: `d_${stamp}_${i}` }));
}

const SuggestSchema = z.object({ suggestions: z.array(z.object({ direction: z.string(), rewrite: z.string() })) });

/** Three different ways to improve the passage a person selected in a draft. */
export async function requestSuggestions(client: Anthropic, args: {
  selection: string; paragraph: string; heading: string; topic: string; audience: string; keywords: string[];
}): Promise<EditSuggestion[]> {
  const res = await client.messages.parse({
    // Interactive, so the fast model.
    model: "claude-haiku-5-5",
    max_tokens: 2000,
    system: `당신은 B2B 솔루션 홍보 글을 다듬는 편집자입니다. ${TONE} ${NO_INVENTED}`,
    messages: [{
      role: "user",
      content: `글의 주제: ${args.topic}
타깃 독자: ${args.audience}
이 부분이 속한 소제목: ${args.heading}
전체 문단:
${args.paragraph}

담당자가 고치고 싶어서 선택한 부분:
<selection>${args.selection}</selection>

선택한 부분을 고칠 서로 다른 방향 3가지를 추천해 주세요.
- direction: 무엇을 어떻게 바꾸면 좋은지와 그 이유를 한 문장으로
- rewrite: 그 방향으로 선택한 부분만 다시 쓴 문장. 앞뒤 문단과 자연스럽게 이어져야 하고, 원문에 없는 사실이나 수치는 넣지 않습니다
- 필수 키워드(${args.keywords.join(", ") || "없음"})가 선택한 부분에 있으면 표기 그대로 유지합니다`,
    }],
    output_config: { effort: "low", format: zodOutputFormat(SuggestSchema) },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("AI 추천을 받지 못했습니다. 다시 시도해 주세요.");
  return res.parsed_output.suggestions.slice(0, 3).map((s) => ({ direction: s.direction, rewrite: s.rewrite.trim() || undefined }));
}

