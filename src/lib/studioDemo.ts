import type { PromoInput, PromoResult } from "./types";

/**
 * Sample promo used without an API key (and in the static Pages build).
 * It only echoes what the user typed, so it never pretends to have read the document.
 */
export function demoPromo(input: PromoInput, photoCount: number): PromoResult {
  const name = input.name || "우리 제품";
  const photo = (i: number) => (i < photoCount ? i : null);
  const differentiators = [
    {
      title: "흩어진 기록을 한곳에",
      plain: `${name}은 여러 곳에 흩어진 업무 기록을 한 화면에 모아 줍니다.`,
      conventional: "메신저, 엑셀, 메모장에 기록이 나뉘어 있어 찾는 데 시간이 듭니다.",
      ours: "기록이 자동으로 한곳에 쌓여 검색 한 번으로 찾을 수 있습니다.",
      evidence: [{ doc: "샘플", page: null, quote: "샘플 결과입니다. 실제 분석은 API 키 설정 후 가능합니다." }],
    },
    {
      title: "설치 없이 바로 시작",
      plain: "별도 장비나 복잡한 설정 없이 바로 쓸 수 있습니다.",
      conventional: "새 도구를 들이려면 설치와 교육에 몇 주가 걸립니다.",
      ours: "가입 후 바로 쓰고, 화면이 단순해 교육 부담이 적습니다.",
      evidence: [{ doc: "샘플", page: null, quote: "샘플 결과입니다." }],
    },
    {
      title: "관리자는 한눈에",
      plain: "팀 전체 현황을 관리자가 한 화면에서 확인합니다.",
      conventional: "현황을 보려면 담당자마다 따로 물어봐야 합니다.",
      ours: "대시보드에서 팀 현황과 놓친 업무를 바로 확인합니다.",
      evidence: [{ doc: "샘플", page: null, quote: "샘플 결과입니다." }],
    },
  ];
  return {
    mode: "demo",
    model: "sample",
    differentiators,
    photos: Array.from({ length: photoCount }, (_, i) => ({ index: i, description: `업로드한 사진 ${i + 1}` })),
    promo: {
      eyebrow: input.company || "신제품 소개",
      headline: `일이 쌓이기 전에, ${name}`,
      subheadline: input.summary || "복잡한 업무를 단순하게 바꾸는 방법",
      hook: `${input.audience || "실무자"}라면 한 번쯤 ‘그 기록 어디 있었지?’ 하며 시간을 쓴 적이 있을 겁니다.`,
      heroPhotoIndex: photo(0),
      highlights: differentiators.map((d, i) => ({
        title: d.title,
        body: d.ours,
        differentiatorIndex: i,
        photoIndex: photo(i + 1),
        photoAlt: i + 1 < photoCount ? `${d.title}을 보여 주는 화면` : null,
      })),
      ctaLabel: "도입 상담 신청하기",
      ctaNote: "우리 팀에 맞는지 먼저 확인해 보세요.",
    },
    sns: {
      caption: `‘그 기록 어디 있었지?’\n${name}이면 찾는 시간이 사라집니다.\n자세한 내용은 프로필 링크에서 확인하세요.`,
      hashtags: ["업무효율", "협업툴", name.replace(/\s/g, "")],
    },
  };
}
