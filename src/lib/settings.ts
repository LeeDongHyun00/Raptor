import type { ProductionSettings } from "./types";

/** Everything a run can produce; the first two are the original MVP outputs. */
export const OUTPUTS = [
  { id: "blog", label: "네이버 블로그", stage: "비교·검토" },
  { id: "instagram", label: "인스타그램", stage: "처음 알리기" },
  { id: "shorts", label: "쇼츠·릴스", stage: "처음 알리기" },
  { id: "kakao", label: "카카오톡 배너", stage: "처음 알리기" },
  { id: "searchAds", label: "검색광고", stage: "비교·검토" },
  { id: "email", label: "이메일", stage: "전환·재방문" },
] as const;

export type OutputId = (typeof OUTPUTS)[number]["id"];

export const CONCEPTS = [
  { id: "info", label: "정보형", hint: "질문에 답하고 방법을 알려 주는 차분한 설명", prompt: "정보형: 독자의 질문에 답하고 방법을 단계별로 알려 주는 차분한 설명 위주로 씁니다." },
  { id: "empathy", label: "공감형", hint: "현장에서 겪는 상황에서 출발하는 이야기", prompt: "공감형: 독자가 현장에서 겪는 구체적인 상황과 감정에서 출발해 이야기처럼 풀어 갑니다." },
  { id: "compare", label: "비교형", hint: "기존 방식과 나란히 놓고 차이를 보여 줌", prompt: "비교형: 기존 방식과 이 제품의 방식을 나란히 놓고 무엇이 달라지는지를 중심으로 씁니다. 경쟁사 이름은 쓰지 않습니다." },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]["id"];

/** Card news and banner palettes. `forest` is the house style. */
export const DESIGNS = [
  { id: "forest", label: "포레스트", hint: "짙은 녹색과 크림", dark: "#1F4D3A", light: "#F6F1E7", accent: "#E8A33D", ink: "#14231C", mute: "#5F6B63", line: "#D9D2C3", onDarkMute: "#B9CBBF" },
  { id: "navy", label: "네이비", hint: "남색과 흰색, 신뢰감", dark: "#16244F", light: "#F4F6FB", accent: "#4F8DF7", ink: "#0E1730", mute: "#5A6480", line: "#D5DBEA", onDarkMute: "#B4BEDD" },
  { id: "warm", label: "웜", hint: "밝은 바탕과 코랄 포인트", dark: "#2B2622", light: "#FFF8F1", accent: "#F26B4E", ink: "#2B2622", mute: "#7A6E64", line: "#EADFD3", onDarkMute: "#CFC4BA" },
] as const;

export type DesignId = (typeof DESIGNS)[number]["id"];

export const designOf = (id?: string) => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
export const conceptOf = (id?: string) => CONCEPTS.find((c) => c.id === id) ?? CONCEPTS[0];

export const defaultSettings: ProductionSettings = {
  outputs: { blog: true, instagram: true, shorts: true, kakao: true, searchAds: true, email: true },
  concept: "info",
  design: "forest",
  audience: "중소기업·소규모 영업팀",
  productNotes: "",
};

/** Fills in anything missing, so workspaces saved before settings existed keep working. */
export function resolveSettings(s?: Partial<ProductionSettings>): ProductionSettings {
  const outputs = { ...defaultSettings.outputs, ...(s?.outputs ?? {}) };
  // A run with nothing to make is never what the user meant.
  if (!Object.values(outputs).some(Boolean)) outputs.blog = true;
  return {
    outputs,
    concept: conceptOf(s?.concept).id,
    design: designOf(s?.design).id,
    audience: (s?.audience ?? defaultSettings.audience).slice(0, 80),
    productNotes: (s?.productNotes ?? "").slice(0, 400),
  };
}
