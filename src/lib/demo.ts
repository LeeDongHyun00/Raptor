import type { Blog, BlogSection, CardNews, Channels, Guideline, MissionCheck, NewsItem, Plan, TrendItem, Workspace } from "./types";

/**
 * Canned responses used when no Anthropic API key is configured, so the whole
 * flow (plan -> generate -> review -> fix -> approve) can be demonstrated offline.
 * The first draft intentionally misses two guideline items to show the auto-fix step.
 */

export const sampleTrends: TrendItem[] = [
  { keyword: "AI 업무자동화", change: 38, series: [41, 44, 43, 48, 52, 58, 61, 66] },
  { keyword: "영업 생산성", change: 21, series: [30, 29, 33, 32, 35, 37, 38, 40] },
  { keyword: "고객 응대 품질", change: 12, series: [22, 24, 23, 25, 25, 26, 27, 28] },
  { keyword: "통화녹음", change: 9, series: [55, 54, 57, 56, 58, 60, 59, 62] },
  { keyword: "CRM", change: 4, series: [48, 47, 49, 50, 49, 50, 51, 51] },
  { keyword: "재택근무", change: -6, series: [36, 35, 35, 34, 33, 33, 32, 32] },
];

export const sampleNews: NewsItem[] = [
  { keyword: "AI 업무자동화", title: "[샘플] 중소기업도 AI 업무자동화 도입 속도… 반복 업무부터 줄인다", link: "", pubDate: "" },
  { keyword: "AI 업무자동화", title: "[샘플] 회의록·통화 요약, 생성형 AI가 가장 먼저 바꾼 사무 업무", link: "", pubDate: "" },
  { keyword: "영업 생산성", title: "[샘플] 영업사원 하루의 3분의 1은 기록과 보고에 쓰인다", link: "", pubDate: "" },
  { keyword: "고객 응대 품질", title: "[샘플] 담당자 교체 때마다 반복되는 질문, 고객 이탈로 이어져", link: "", pubDate: "" },
];

interface DemoTopic {
  plan: Omit<Plan, "differentiatorIds">;
  intro: BlogSection;
  trend: BlogSection;
  leads: Record<string, string>;
  closingDraft: string[];
  closingFixed: string[];
  cardProblem: { title: string; body: string };
  coreMessage: string;
  email: { subjects: string[]; preheader: string; story: string[] };
  kakao: { copy: string; sub: string; cta: string; hook: "숫자" | "손실 회피" | "질문"; target: string }[];
  shorts: { title: string; hookLine: string; hookOverlay: string; result: string };
  adHeadline: string;
  adKeyword: string;
}

const TOPICS: DemoTopic[] = [
  {
    plan: {
      topic: "AI 업무자동화, 영업팀은 ‘통화 정리’부터 시작하세요",
      trendKeyword: "AI 업무자동화",
      angle: "거창한 자동화보다 매일 반복되는 통화 기록부터 AI에 맡기자는 실용적 접근",
      reason: "‘AI 업무자동화’ 검색량이 최근 2주간 가장 크게 늘었고, 통화 요약을 자동화하는 AI 리포트 차별점과 직접 연결됩니다.",
    },
    intro: {
      heading: "AI를 도입하라는데, 어디서부터 시작해야 할까요",
      paragraphs: [
        "요즘 어느 회의에서나 AI 업무자동화 이야기가 나옵니다. 하지만 막상 우리 팀에 적용하려고 하면 어디서부터 손을 대야 할지 막막합니다. 큰 시스템을 새로 들이기에는 부담스럽고, 그렇다고 손 놓고 있기에는 뒤처지는 느낌이 듭니다.",
        "영업·상담 조직이라면 답은 의외로 가까운 곳에 있습니다. 매일 수십 통씩 오가는 고객 통화, 그리고 통화가 끝난 뒤 이어지는 메모와 보고입니다. 이 반복 업무만 줄여도 체감이 확 달라집니다.",
      ],
      screenshotId: null, caption: null,
    },
    trend: {
      heading: "자동화의 첫 대상은 ‘매일 반복되는 일’입니다",
      paragraphs: [
        "최근 AI 업무자동화에 대한 관심은 화려한 기능보다 실제로 시간을 아껴 주는 영역으로 옮겨 가고 있습니다. 회의록 정리, 문서 요약처럼 누구나 매일 하지만 누구도 좋아하지 않는 일들입니다.",
        "고객 통화는 그 대표적인 예입니다. 비즈레코딩은 통화를 기록하고, 고객 정보와 연결하고, 내용을 요약하는 세 단계를 한 번에 자동화합니다.",
      ],
      screenshotId: null, caption: null,
    },
    leads: {
      d_record: "자동화의 출발점은 기록입니다.",
      d_crm: "기록이 쌓였다면 다음은 연결입니다.",
      d_report: "마지막 단계가 바로 AI가 가장 잘하는 요약입니다.",
    },
    closingDraft: [
      "AI 업무자동화는 멀리 있는 이야기가 아닙니다. 매일 반복되는 통화 기록과 보고를 덜어 내는 것만으로도 팀은 고객과 대화하는 데 더 많은 시간을 쓸 수 있습니다.",
      "비즈레코딩으로 가장 가까운 업무부터 자동화를 시작해 보세요.",
    ],
    closingFixed: [
      "AI 업무자동화는 멀리 있는 이야기가 아닙니다. 통화녹음부터 고객 관리, AI 리포트까지 한 번에 이어지면 팀은 기록이 아니라 고객과의 대화에 더 많은 시간을 쓸 수 있습니다.",
      "우리 팀에 맞는 도입 방법이 궁금하다면 비즈레코딩 도입 문의를 남겨 주세요. 담당자가 현재 업무 방식에 맞춰 안내해 드립니다.",
    ],
    cardProblem: { title: "AI 도입, 어디서부터?", body: "큰 시스템은 부담스럽고 손 놓기엔 불안하다면, 매일 반복되는 통화 기록부터 시작하세요." },
    coreMessage: "통화가 끝나면 기록·정리·요약은 이미 끝나 있습니다.",
    email: {
      subjects: ["AI 업무자동화, 통화 정리부터 맡겨 보세요", "통화 끝나고 메모, 아직 직접 하세요?"],
      preheader: "녹음, 고객 기록, 요약이 한 번에 이어집니다",
      story: [
        "AI를 도입하라는 이야기는 많은데, 막상 어디서부터 시작할지는 아무도 알려 주지 않습니다.",
        "저희가 만난 영업·상담팀들은 의외로 가까운 곳에서 답을 찾았습니다. 매일 반복되는 통화 메모와 보고입니다.",
      ],
    },
    kakao: [
      { copy: "아직도 통화 내용 손으로 적으세요?", sub: "통화가 끝나면 AI가 정리합니다", cta: "확인하기", hook: "손실 회피", target: "영업·상담 실무자" },
      { copy: "우리 팀 통화 기록, 어디에 있나요?", sub: "고객별로 자동 정리되는 통화녹음", cta: "알아보기", hook: "질문", target: "팀장·관리자" },
      { copy: "통화 솔루션 3가지를 하나로", sub: "통화녹음·CRM·AI 리포트 비즈레코딩", cta: "살펴보기", hook: "숫자", target: "솔루션 도입 검토자" },
    ],
    shorts: { title: "AI 자동화, 통화 메모부터 없애기", hookLine: "AI 도입하라는데, 뭐부터 하죠?", hookOverlay: "AI 도입, 어디서부터?", result: "통화 정리는 AI에게, 나는 다음 고객에게." },
    adHeadline: "통화 정리, AI에 맡기세요",
    adKeyword: "AI 통화 요약",
  },
  {
    plan: {
      topic: "영업 생산성을 갉아먹는 건 통화가 아니라 통화 ‘후’입니다",
      trendKeyword: "영업 생산성",
      angle: "통화 자체보다 통화 후 기록·보고에 드는 시간을 줄여 영업 생산성을 높이는 방법",
      reason: "‘영업 생산성’ 검색 관심이 꾸준히 오르고 있고, 통화 이력이 자동으로 붙는 CRM 차별점으로 기록 시간을 줄인다는 메시지를 만들 수 있습니다.",
    },
    intro: {
      heading: "통화는 5분, 정리는 15분",
      paragraphs: [
        "고객과의 통화는 5분 만에 끝났는데, 내용을 메모하고 엑셀에 옮기고 팀장에게 보고하다 보면 15분이 훌쩍 지나갑니다. 하루에 통화가 스무 건이면 정리에만 몇 시간이 들어갑니다.",
        "영업 생산성이 오르지 않는 이유는 통화를 덜 해서가 아닙니다. 통화가 끝난 뒤의 일이 너무 많기 때문입니다.",
      ],
      screenshotId: null, caption: null,
    },
    trend: {
      heading: "영업 생산성의 기준이 달라지고 있습니다",
      paragraphs: [
        "예전에는 통화 건수와 방문 횟수가 생산성의 기준이었습니다. 요즘은 영업 담당자가 고객에게 온전히 집중하는 시간이 얼마나 되는지를 봅니다. 기록과 보고에 쓰는 시간을 줄이는 것이 곧 영업 생산성을 높이는 길입니다.",
        "비즈레코딩은 통화 후에 생기는 일을 시스템이 대신 처리하도록 설계되어 있습니다.",
      ],
      screenshotId: null, caption: null,
    },
    leads: {
      d_record: "먼저 받아 적는 일부터 없앱니다.",
      d_crm: "옮겨 적는 일도 사라집니다.",
      d_report: "보고서 작성도 AI가 초안을 잡아 줍니다.",
    },
    closingDraft: [
      "통화 후 업무를 줄이면 같은 인원으로 더 많은 고객을 더 깊이 만날 수 있습니다. 영업 생산성은 결국 고객에게 쓰는 시간에서 나옵니다.",
      "비즈레코딩으로 통화 후 15분을 되찾아 보세요.",
    ],
    closingFixed: [
      "통화녹음과 고객 기록, AI 리포트가 자동으로 이어지면 같은 인원으로 더 많은 고객을 더 깊이 만날 수 있습니다. 영업 생산성은 결국 고객에게 쓰는 시간에서 나옵니다.",
      "통화 후 15분을 되찾고 싶다면 비즈레코딩 도입 문의를 남겨 주세요. 팀 규모와 업무 방식에 맞춰 상담해 드립니다.",
    ],
    cardProblem: { title: "통화는 5분, 정리는 15분", body: "메모하고, 엑셀에 옮기고, 보고하고. 영업 시간을 잡아먹는 건 통화 ‘후’의 일입니다." },
    coreMessage: "통화 후 15분의 정리 업무를 시스템이 대신합니다.",
    email: {
      subjects: ["통화는 5분인데, 정리는 왜 15분일까요", "영업 생산성, 통화 ‘후’에서 갈립니다"],
      preheader: "메모·입력·보고를 시스템이 대신합니다",
      story: [
        "고객과의 통화는 금방 끝나는데, 메모하고 엑셀에 옮기고 보고하다 보면 하루가 갑니다.",
        "영업 생산성이 오르지 않는 이유는 통화를 덜 해서가 아니라, 통화가 끝난 뒤의 일이 너무 많기 때문입니다.",
      ],
    },
    kakao: [
      { copy: "통화보다 정리가 더 오래 걸린다면", sub: "통화 후 기록을 자동으로", cta: "확인하기", hook: "손실 회피", target: "영업 담당자" },
      { copy: "오늘 통화, 몇 건이나 기록했나요?", sub: "받아 적지 않아도 남는 통화녹음", cta: "알아보기", hook: "질문", target: "영업팀장" },
      { copy: "통화 솔루션 3가지를 하나로", sub: "통화녹음·CRM·AI 리포트 비즈레코딩", cta: "살펴보기", hook: "숫자", target: "솔루션 도입 검토자" },
    ],
    shorts: { title: "통화 후 정리, 안 해도 되는 이유", hookLine: "통화는 금방 끝났는데, 정리가 안 끝나요.", hookOverlay: "통화보다 긴 통화 정리", result: "정리는 시스템이, 나는 다음 통화로." },
    adHeadline: "통화 후 기록 자동화",
    adKeyword: "영업 관리 프로그램 추천",
  },
  {
    plan: {
      topic: "담당자가 바뀌어도 고객 응대 품질이 유지되는 팀의 비밀",
      trendKeyword: "고객 응대 품질",
      angle: "개인 기억이 아니라 공유된 통화 이력으로 응대 품질을 유지하는 방법",
      reason: "‘고객 응대 품질’ 관련 관심이 늘고 있고, 통화 이력이 고객 카드에 남는 CRM과 AI 리포트 차별점이 인수인계 문제를 직접 해결합니다.",
    },
    intro: {
      heading: "“지난번에 말씀드렸는데요”라는 말을 듣는 순간",
      paragraphs: [
        "담당자가 휴가를 가거나 퇴사하면 고객은 같은 이야기를 처음부터 다시 해야 합니다. “지난번에 다 말씀드렸는데요”라는 말이 나오는 순간, 고객의 신뢰는 조금씩 깎여 나갑니다.",
        "문제는 사람이 아닙니다. 상담 내용이 담당자 개인의 기억과 수첩에만 남아 있는 구조가 문제입니다.",
      ],
      screenshotId: null, caption: null,
    },
    trend: {
      heading: "응대 품질은 이제 ‘팀의 기록’에서 나옵니다",
      paragraphs: [
        "고객은 누가 전화를 받든 같은 수준의 응대를 기대합니다. 그래서 최근에는 개인 역량보다 팀이 공유하는 기록의 품질이 고객 응대 품질을 좌우한다는 인식이 커지고 있습니다.",
        "비즈레코딩은 모든 통화를 팀의 자산으로 남겨, 담당자가 바뀌어도 대화가 끊기지 않게 합니다.",
      ],
      screenshotId: null, caption: null,
    },
    leads: {
      d_record: "기억에 의존하지 않으려면 기록이 빠짐없이 남아야 합니다.",
      d_crm: "남은 기록은 고객 단위로 모여 있어야 쓸모가 있습니다.",
      d_report: "긴 이력도 빠르게 파악할 수 있어야 합니다.",
    },
    closingDraft: [
      "좋은 응대는 뛰어난 한 사람이 아니라 잘 공유된 기록에서 나옵니다. 담당자가 바뀌어도 고객이 같은 설명을 반복하지 않는 팀이 신뢰를 얻습니다.",
      "비즈레코딩으로 팀의 응대 품질을 지켜 보세요.",
    ],
    closingFixed: [
      "좋은 응대는 뛰어난 한 사람이 아니라 잘 공유된 기록에서 나옵니다. 통화녹음과 고객 이력, AI 리포트가 한곳에 모이면 담당자가 바뀌어도 고객은 같은 설명을 반복하지 않습니다.",
      "우리 팀의 인수인계 고민을 줄이고 싶다면 비즈레코딩 도입 문의를 남겨 주세요. 현재 상담 방식에 맞는 활용 방법을 안내해 드립니다.",
    ],
    cardProblem: { title: "“지난번에 말씀드렸는데요”", body: "담당자가 바뀔 때마다 고객이 같은 설명을 반복한다면, 기록이 개인에게만 남아 있기 때문입니다." },
    coreMessage: "통화 이력이 팀에 남아, 담당자가 바뀌어도 대화가 이어집니다.",
    email: {
      subjects: ["“지난번에 말씀드렸는데요” 줄이는 법", "담당자가 바뀌어도 이어지는 고객 응대"],
      preheader: "통화 이력을 팀의 기록으로 남기세요",
      story: [
        "담당자가 바뀌면 고객은 같은 이야기를 처음부터 다시 해야 합니다. 그때마다 신뢰는 조금씩 깎입니다.",
        "문제는 사람이 아니라, 상담 내용이 개인의 기억과 수첩에만 남는 구조입니다.",
      ],
    },
    kakao: [
      { copy: "담당자 바뀌면 고객도 떠납니다", sub: "통화 이력을 팀의 기록으로", cta: "확인하기", hook: "손실 회피", target: "CS·영업 관리자" },
      { copy: "지난 통화 내용, 바로 찾아지나요?", sub: "고객 카드에 남는 통화 타임라인", cta: "알아보기", hook: "질문", target: "상담 실무자" },
      { copy: "통화 솔루션 3가지를 하나로", sub: "통화녹음·CRM·AI 리포트 비즈레코딩", cta: "살펴보기", hook: "숫자", target: "솔루션 도입 검토자" },
    ],
    shorts: { title: "담당자가 바뀌어도 응대가 이어지는 팀", hookLine: "“지난번에 다 말씀드렸는데요.”", hookOverlay: "고객이 가장 싫어하는 순간", result: "누가 받아도, 대화는 이어집니다." },
    adHeadline: "담당자 바뀌어도 이력 그대로",
    adKeyword: "고객 상담 이력 관리",
  },
];

const FEATURE: Record<string, { heading: string; text: string; shot: string; caption: string; card: string }> = {
  d_record: {
    heading: "통화가 끝나면 기록은 이미 남아 있습니다",
    text: "비즈레코딩에서는 업무 통화가 자동으로 녹음되고 고객·담당자·날짜별로 정리됩니다. 직원이 개인 앱으로 통화 녹음을 따로 하고 파일을 찾아 헤맬 필요가 없습니다. 필요한 통화는 고객 이름이나 기간으로 바로 찾아 들을 수 있습니다.",
    shot: "demo_shot_calls",
    caption: "고객별로 자동 정리된 통화녹음 목록 화면",
    card: "업무 통화가 자동으로 녹음되고 고객별로 정리됩니다. 파일을 찾아 헤맬 일이 없습니다.",
  },
  d_crm: {
    heading: "고객 카드를 열면 지난 대화가 한눈에",
    text: "녹음된 통화는 CRM의 고객 카드에 자동으로 연결됩니다. 엑셀에 상담 내용을 옮겨 적지 않아도 언제 누가 어떤 이야기를 나눴는지 타임라인으로 확인할 수 있습니다. 담당자가 바뀌어도 이전 대화의 맥락이 그대로 이어집니다.",
    shot: "demo_shot_crm",
    caption: "고객 정보와 통화 타임라인이 함께 보이는 고객 카드 화면",
    card: "통화 기록이 고객 카드에 자동으로 붙습니다. 담당자가 바뀌어도 맥락이 이어집니다.",
  },
  d_report: {
    heading: "다시 듣지 않아도 되는 이유, AI 리포트",
    text: "AI 리포트는 통화 내용을 요약하고 주요 키워드와 다음에 할 일을 정리해 줍니다. 관리자는 녹음을 하나씩 다시 듣지 않고도 상담 흐름을 파악할 수 있고, 담당자는 보고서 초안을 쓰는 시간을 아낄 수 있습니다.",
    shot: "demo_shot_report",
    caption: "통화 요약과 후속 조치가 정리된 AI 리포트 화면",
    card: "AI가 통화를 요약하고 다음 할 일을 정리합니다. 녹음을 다시 들을 필요가 없습니다.",
  },
};

export const DEMO_TOPIC_COUNT = TOPICS.length;

/** Index of a sample topic, used to locate its pre-rendered card images. */
export function demoTopicIndex(topic: string): number {
  return TOPICS.findIndex((t) => t.plan.topic === topic);
}

function topicFor(plan: Plan): DemoTopic {
  return TOPICS.find((t) => t.plan.topic === plan.topic) ?? TOPICS[0];
}

export function demoPlan(usedTopics: string[]): Plan {
  const next = TOPICS.find((t) => !usedTopics.includes(t.plan.topic));
  if (!next) {
    throw new Error(
      `데모 모드의 샘플 주제 ${TOPICS.length}개를 모두 사용했습니다. 이전에 다룬 주제는 다시 쓰지 않으므로, 대시보드에서 이력을 초기화하거나 ANTHROPIC_API_KEY를 설정해 실제 생성으로 전환하세요.`,
    );
  }
  return { ...next.plan, coreMessage: next.coreMessage, differentiatorIds: Object.keys(FEATURE) };
}

export function demoBlog(plan: Plan): Blog {
  const t = topicFor(plan);
  const features: BlogSection[] = Object.entries(FEATURE).map(([id, f]) => ({
    heading: f.heading,
    paragraphs: [`${t.leads[id]} ${f.text}`],
    screenshotId: f.shot,
    caption: f.caption,
  }));
  return {
    title: plan.topic,
    sections: [
      t.intro,
      t.trend,
      ...features,
      { heading: "정리하며", paragraphs: t.closingDraft, screenshotId: null, caption: null },
    ],
    tags: ["비즈레코딩", "통화녹음", plan.trendKeyword.replace(/\s/g, ""), "CRM", "AI리포트"],
  };
}

export function demoRevise(plan: Plan, blog: Blog, sectionIndexes: number[]): { index: number; section: BlogSection }[] {
  const t = topicFor(plan);
  const last = blog.sections.length - 1;
  return sectionIndexes
    .filter((i) => i === last)
    .map((i) => ({ index: i, section: { ...blog.sections[i], paragraphs: t.closingFixed } }));
}

export function demoCards(plan: Plan, ws: Workspace): CardNews {
  const t = topicFor(plan);
  const points = Object.values(FEATURE).map((f, i) => ({
    kind: "point" as const, eyebrow: `해결 ${i + 1}`, title: f.heading, body: f.card, screenshotId: f.shot,
  }));
  return {
    slides: [
      { kind: "cover", eyebrow: plan.trendKeyword, title: plan.topic, body: "", screenshotId: null },
      { kind: "point", eyebrow: "이런 적 있나요", title: t.cardProblem.title, body: t.cardProblem.body, screenshotId: null },
      ...points,
      { kind: "point", eyebrow: "한눈에 정리", title: "기록 → 연결 → 요약", body: "통화녹음, CRM, AI 리포트가 하나로 이어져 통화 후 업무가 줄어듭니다.", screenshotId: null },
      { kind: "cta", eyebrow: ws.product.company, title: `${ws.product.name} 도입 문의`, body: "프로필 링크에서 상담을 신청하세요.", screenshotId: null },
    ],
    caption: `${t.intro.paragraphs[0]}\n\n${ws.product.name}은 통화녹음부터 CRM, AI 리포트까지 한 번에 이어 줍니다. 자세한 내용은 프로필 링크에서 확인하세요.`,
    hashtags: ["비즈레코딩", "티링크", "통화녹음", "CRM", "AI리포트", plan.trendKeyword.replace(/\s/g, ""), "업무자동화", "B2B솔루션"],
  };
}

/** Same plan, four more formats: email, KakaoTalk banner, short-form video script, search ads. */
export function demoChannels(plan: Plan, ws: Workspace): Channels {
  const t = topicFor(plan);
  const name = ws.product.name;
  return {
    email: {
      subjects: t.email.subjects,
      preheader: t.email.preheader,
      greeting: "{{이름}}님, 안녕하세요.",
      paragraphs: [
        ...t.email.story,
        `${name}은 업무 통화를 자동으로 녹음해 고객별로 정리하고, AI 리포트로 요약과 다음 할 일까지 정리해 드립니다. ${t.coreMessage}`,
        "우리 팀 업무 방식에 맞는 활용 방법을 담당자가 안내해 드립니다.",
      ],
      ctaLabel: "도입 상담 신청하기",
    },
    kakao: t.kakao,
    shorts: {
      title: t.shorts.title,
      scenes: [
        { seconds: 2, visual: "통화를 끊자마자 수첩을 찾는 직원의 1인칭 시점", narration: t.shorts.hookLine, overlay: t.shorts.hookOverlay },
        { seconds: 5, visual: "메모, 엑셀, 메신저 보고 창을 오가는 화면을 빠르게 교차", narration: "메모하고, 옮겨 적고, 보고하고. 통화보다 정리가 더 깁니다.", overlay: "메모 → 엑셀 → 보고" },
        { seconds: 6, visual: `${name} 통화 목록 화면 녹화: 통화가 끝나자 목록에 바로 추가됨`, narration: `${name}은 통화가 끝나면 녹음이 고객별로 알아서 정리돼요.`, overlay: "통화녹음 자동 정리" },
        { seconds: 6, visual: "AI 리포트 화면 녹화: 요약과 다음 할 일이 표시됨", narration: "AI 리포트가 요약이랑 다음 할 일까지 써 줍니다.", overlay: "AI가 요약 + 할 일 정리" },
        { seconds: 4, visual: "직원이 수첩을 덮고 다음 전화를 받는 모습", narration: t.shorts.result, overlay: t.shorts.result },
        { seconds: 2, visual: "첫 장면과 같은 구도로 전화벨이 다시 울림", narration: "그런데 다음 통화는요?", overlay: "다음 통화는?" },
      ],
      loop: "마지막 전화벨 장면이 첫 장면의 통화 종료 직후와 같은 구도로 이어져, 자연스럽게 처음부터 다시 보게 됩니다.",
      pinnedComment: `통화 정리에 쓰는 시간을 줄이고 싶다면 → 프로필 링크에서 ${name} 도입 문의를 남겨 주세요.`,
    },
    searchAds: {
      keywords: ["업무용 통화녹음", "통화녹음 프로그램 추천", "통화녹음 CRM", "상담 녹취 솔루션 가격", t.adKeyword],
      negativeKeywords: ["무료 다운로드", "개인용", "아이폰 통화녹음", "녹음기"],
      ads: [
        { headline: `업무용 통화녹음 ${name}`, description: "통화가 끝나면 녹음이 고객별로 자동 정리됩니다. 도입 상담 신청." },
        { headline: t.adHeadline, description: "통화녹음·CRM·AI 리포트를 하나로. 통화 후 업무를 줄이세요." },
        { headline: "통화녹음부터 AI 리포트까지", description: "AI가 통화를 요약하고 다음 할 일을 정리합니다. 지금 문의하세요." },
      ],
      sitelinks: ["기능 소개", "AI 리포트", "CRM 연동", "도입 문의"],
    },
  };
}

/** Rule-based stand-in for the AI mission review; only understands the sample missions. */
export function demoReviewMissions(guideline: Guideline, blog: Blog): MissionCheck[] {
  const last = blog.sections.length - 1;
  const shots = blog.sections.filter((s) => s.screenshotId && s.caption).length;
  const closing = blog.sections[last]?.paragraphs.join(" ") ?? "";
  return guideline.missions.map((mission) => {
    if (/캡처|이미지|화면/.test(mission)) {
      const pass = shots >= 2;
      return { mission, pass, note: `캡션이 달린 화면 캡처 ${shots}장 사용`, sectionIndexes: pass ? [] : [2] };
    }
    if (/문의|행동 유도|CTA/i.test(mission)) {
      const pass = /문의/.test(closing);
      return {
        mission, pass,
        note: pass ? "마지막 문단에 도입 문의 안내가 있습니다" : "마지막 문단에 도입 문의로 이어지는 문구가 없습니다",
        sectionIndexes: pass ? [] : [last],
      };
    }
    if (/도입|문제/.test(mission)) {
      return { mission, pass: true, note: "첫 문단에서 독자의 문제 상황을 제시합니다", sectionIndexes: [] };
    }
    return { mission, pass: true, note: "데모 모드에서는 이 항목의 AI 검수를 건너뜁니다", sectionIndexes: [] };
  });
}
