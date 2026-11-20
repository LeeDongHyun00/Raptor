import type { Blog, BlogSection, CardNews, Channels, Guideline, VocBoard, VocItem, MissionCheck, NewsItem, Plan, TrendItem, Workspace } from "./types";

/**
 * Canned responses used when no Anthropic API key is configured, so the whole
 * flow (plan -> generate -> review -> fix -> approve) can be demonstrated offline.
 * The copy is written from the company documents and guideline; the first draft
 * intentionally misses two guideline items to show the auto-fix step.
 */

import { CONTACT, GUIDE_TAGS } from "./seed";

export const sampleTrends: TrendItem[] = [
  { keyword: "업무자동화", change: 34, series: [41, 44, 43, 48, 52, 58, 61, 66] },
  { keyword: "AI 통화요약", change: 27, series: [18, 19, 21, 20, 23, 25, 26, 28] },
  { keyword: "고객관리 프로그램", change: 15, series: [30, 29, 33, 32, 35, 37, 38, 40] },
  { keyword: "콜센터 프로그램", change: 9, series: [55, 54, 57, 56, 58, 60, 59, 62] },
  { keyword: "휴대폰 통화녹음", change: 6, series: [48, 47, 49, 50, 49, 50, 51, 51] },
  { keyword: "회의록 작성", change: -4, series: [36, 35, 35, 34, 33, 33, 32, 32] },
];

export const sampleNews: NewsItem[] = [
  { keyword: "업무자동화", title: "[샘플] 중소기업도 업무자동화 도입 속도… 반복 업무부터 줄인다", link: "", pubDate: "" },
  { keyword: "AI 통화요약", title: "[샘플] 통화·회의 요약, 생성형 AI가 가장 먼저 바꾼 사무 업무", link: "", pubDate: "" },
  { keyword: "AI 통화요약", title: "[샘플] 영업사원 하루의 상당 부분은 기록과 보고에 쓰인다", link: "", pubDate: "" },
  { keyword: "고객관리 프로그램", title: "[샘플] 담당자 교체 때마다 반복되는 질문, 고객 이탈로 이어져", link: "", pubDate: "" },
];

/**
 * Fictional call-summary analysis for the demo. Not real customer data: every screen
 * showing it carries a [샘플] badge and the source line says so.
 */
export const sampleVoc: VocBoard = {
  source: "[샘플] 가상 통화 요약 42건 (실제 고객 데이터 아님)",
  period: "최근 2주",
  analyzedAt: "2026-11-20T00:00:00.000Z",
  mode: "sample",
  items: [
    {
      id: "v_mobile", category: "도입 문의", count: 9, differentiatorIds: ["d_unified"],
      question: "외근 중에 휴대폰으로 한 통화도 회사에서 같이 볼 수 있나요?",
      quotes: ["밖에서 거래처랑 통화한 건 나중에 확인할 방법이 없어서요", "사무실 전화는 녹음되는데 영업 나가면 그게 안 되니까요"],
      angle: "휴대폰·인터넷전화·PC폰 통화가 하나의 목록에 모이는 과정을 보여 준다",
    },
    {
      id: "v_daily", category: "기능 질문", count: 7, differentiatorIds: ["d_summary", "d_report"],
      question: "영업사원이 매일 쓰는 통화 메모랑 일일 보고서를 줄일 수 있나요?",
      quotes: ["저녁마다 보고서 쓰느라 직원들 불만이 많거든요"],
      angle: "통화가 끝나면 남는 AI 요약과 리포트가 메모와 보고를 대신하는 흐름을 보여 준다",
    },
    {
      id: "v_handover", category: "도입 우려", count: 6, differentiatorIds: ["d_crm"],
      question: "담당자가 퇴사하면 그 고객과 나눈 상담 이력은 어떻게 되나요?",
      quotes: ["전임자가 뭐라고 약속했는지 아무도 몰라서 곤란했던 적이 있어요"],
      angle: "통화기록이 고객 이력으로 남아 담당자가 바뀌어도 이어지는 점을 보여 준다",
    },
    {
      id: "v_security", category: "도입 우려", count: 5, differentiatorIds: ["d_security"],
      question: "녹음 파일을 아무나 들을 수 있으면 곤란한데, 권한을 나눌 수 있나요?",
      quotes: ["통화 녹음이 돌아다니면 문제가 될 것 같아서 걱정입니다"],
      angle: "재생 사유 입력, 사용 이력 로그, 사용자별 권한으로 열람을 통제하는 점을 설명한다",
    },
    {
      id: "v_stats", category: "기능 질문", count: 4, differentiatorIds: ["d_stats"],
      question: "직원별로 통화를 몇 건 했는지, 미결 상담이 뭔지 볼 수 있나요?",
      quotes: ["누가 얼마나 전화하는지 감으로만 알고 있어요"],
      angle: "담당자별 통화 통계와 상담 상태 관리 화면을 보여 준다",
    },
    {
      id: "v_carrier", category: "도입 문의", count: 3, differentiatorIds: ["d_unified"],
      question: "지금 쓰는 통신사를 바꾸지 않고도 쓸 수 있나요?",
      quotes: ["번호나 통신사를 바꿔야 하면 도입이 어렵습니다"],
      angle: "통신사와 관계없이 쓸 수 있다는 점을 도입 절차와 함께 안내한다",
    },
  ],
};

interface DemoTopic {
  /** Customer question this prepared topic answers when VOC is available. */
  vocId: string;
  /** Direct answer that follows the question in the opening paragraph. */
  vocAnswer: string;
  /** Question-shaped email subject and search queries used when the plan answers this question. */
  voc: { subject: string; searches: string[] };
  plan: Omit<Plan, "differentiatorIds">;
  intro: string;
  leads: { record: string; summary: string; manage: string };
  closing: string;
  cardProblem: { title: string; body: string };
  coreMessage: string;
  email: { subjects: string[]; preheader: string; story: string[] };
  kakao: { copy: string; sub: string; cta: string; hook: "숫자" | "손실 회피" | "질문"; target: string }[];
  shorts: { title: string; hookLine: string; hookOverlay: string; result: string };
  adHeadline: string;
  adKeyword: string;
}

const NUMERIC_BANNER = { copy: "통화 3종, 한 화면에서 관리", sub: "휴대폰·인터넷전화·PC폰 통합 녹취", cta: "살펴보기", hook: "숫자" as const, target: "중소기업 대표·도입 검토자" };

const TOPICS: DemoTopic[] = [
  {
    vocId: "v_mobile",
    voc: { subject: "외근 중 휴대폰 통화도 회사에서 볼 수 있나요?", searches: ["휴대폰 통화 회사에서 확인하는 법", "외근 통화 녹음 어떻게 하나요"] },
    vocAnswer: "네, 볼 수 있습니다. 외근 중 휴대폰 통화도 사무실 인터넷전화 통화와 같은 목록에 자동으로 올라옵니다. 직원마다 전화를 쓰는 방식이 달라 통화 기록이 흩어지던 문제를, 녹음을 한곳에 모으는 것으로 풉니다.",
    plan: {
      topic: "영업사원 통화관리 업무자동화, 통화요약까지 되는 콜센터 프로그램 티링크 비즈레코딩",
      trendKeyword: "업무자동화",
      angle: "거창한 시스템보다 매일 반복되는 통화 기록과 보고부터 자동화하자는 실용적 접근",
      reason: "‘업무자동화’ 검색 관심이 최근 2주간 가장 크게 늘었고, 통화가 끝나면 STT와 AI 요약이 자동으로 남는 차별점과 직접 이어집니다.",
    },
    intro: "업무자동화를 하라는 이야기는 많지만, 영업 조직은 어디서부터 손대야 할지 막막합니다. 직원마다 휴대폰과 인터넷전화를 쓰는 방식이 달라서 통화 기록과 상담 내용이 한곳에 모이지 않기 때문입니다. 통화는 했는데 기록은 각자의 휴대폰과 수첩에 흩어져 있습니다.",
    leads: {
      record: "자동화의 출발점은 빠짐없는 기록입니다.",
      summary: "기록이 쌓였다면 다음은 정리입니다.",
      manage: "정리된 기록은 관리의 근거가 됩니다.",
    },
    closing: "업무자동화는 멀리 있는 이야기가 아닙니다. 매일 반복되는 통화 기록과 보고부터 시스템에 맡기면 영업사원은 고객과의 대화에 더 많은 시간을 쓸 수 있습니다.",
    cardProblem: { title: "통화는 했는데 기록은 어디에?", body: "휴대폰, 사무실 전화, 수첩. 통화 기록이 직원마다 흩어져 있다면 자동화의 첫 대상입니다." },
    coreMessage: "어떤 전화로 통화하든 기록·요약·보고가 자동으로 남습니다.",
    email: {
      subjects: ["업무자동화, 통화 기록부터 시작해 보세요", "통화 끝나고 메모, 아직 직접 하세요?"],
      preheader: "녹취, 문자변환, 통화요약이 자동으로 이어집니다",
      story: [
        "업무자동화를 검토하다 보면 정작 매일 하는 일은 그대로인 경우가 많습니다. 고객과 통화하고, 내용을 메모하고, 보고하는 일입니다.",
        "직원마다 휴대폰과 인터넷전화를 쓰는 방식이 달라 통화 기록이 한곳에 모이지 않는다면, 그곳이 자동화의 첫 대상입니다.",
      ],
    },
    kakao: [
      { copy: "아직도 통화 내용 손으로 적으세요?", sub: "통화가 끝나면 AI가 요약합니다", cta: "확인하기", hook: "손실 회피", target: "소규모 영업팀 실무자" },
      { copy: "우리 팀 통화 기록, 어디에 있나요?", sub: "휴대폰·인터넷전화 통합 녹취", cta: "알아보기", hook: "질문", target: "중소기업 영업팀장" },
      NUMERIC_BANNER,
    ],
    shorts: { title: "영업 업무자동화, 통화 메모부터 없애기", hookLine: "업무자동화 하라는데, 뭐부터 하죠?", hookOverlay: "자동화, 어디서부터?", result: "기록은 시스템이, 나는 다음 고객에게." },
    adHeadline: "영업사원 통화관리 자동화",
    adKeyword: "영업 업무자동화",
  },
  {
    vocId: "v_daily",
    voc: { subject: "통화 메모와 일일 보고서, 줄일 수 있을까요?", searches: ["영업 일일 보고서 줄이는 법", "통화 메모 자동으로 하는 법"] },
    vocAnswer: "네, 줄일 수 있습니다. 통화가 끝나면 AI가 요약과 키워드를 남기고 리포트가 현황을 정리하기 때문에, 메모와 일일 보고는 새로 쓰는 일이 아니라 확인하는 일로 바뀝니다. 기록이 사람의 기억과 손을 거치지 않아도 남습니다.",
    plan: {
      topic: "통화요약 AI로 일일 보고서 줄이기, 업무자동화 콜센터 프로그램 티링크 비즈레코딩",
      trendKeyword: "AI 통화요약",
      angle: "통화 후 메모와 일일 보고에 드는 시간을 AI 요약과 리포트로 대신하는 방법",
      reason: "‘AI 통화요약’ 관심이 꾸준히 오르고 있고, AI 요약과 종합 리포트 차별점으로 보고 업무를 줄인다는 메시지를 만들 수 있습니다.",
    },
    intro: "고객과의 통화는 금방 끝나는데, 내용을 메모하고 일일 보고서에 옮겨 적다 보면 하루가 갑니다. 영업사원은 기록하느라 바쁘고, 관리자는 보고서만으로는 실제 통화가 어땠는지 알기 어렵습니다. 통화 내용이 사람의 기억과 손을 거쳐야만 기록되는 구조가 문제입니다.",
    leads: {
      record: "보고를 줄이려면 먼저 통화가 빠짐없이 남아야 합니다.",
      summary: "받아 적는 일은 이제 AI의 몫입니다.",
      manage: "보고서 대신 데이터가 쌓입니다.",
    },
    closing: "통화가 끝나는 순간 기록과 요약이 만들어지면 일일 보고는 확인하는 일로 바뀝니다. 영업사원은 보고서 대신 다음 고객을 준비할 수 있습니다.",
    cardProblem: { title: "통화보다 긴 통화 정리", body: "메모하고, 옮겨 적고, 보고서 쓰고. 통화가 끝난 뒤의 일이 더 오래 걸립니다." },
    coreMessage: "통화가 끝나면 요약과 보고가 이미 만들어져 있습니다.",
    email: {
      subjects: ["일일 보고서, AI 통화요약으로 줄여 보세요", "통화는 짧은데 정리는 왜 길까요"],
      preheader: "통화가 끝나면 요약과 키워드가 자동으로 남습니다",
      story: [
        "고객과의 통화는 금방 끝나는데, 메모하고 일일 보고서에 옮기다 보면 하루가 갑니다.",
        "관리자 입장에서도 보고서만으로는 실제 통화가 어땠는지 알기 어렵습니다. 기록이 사람의 기억을 거쳐야만 남기 때문입니다.",
      ],
    },
    kakao: [
      { copy: "통화보다 정리가 더 오래 걸린다면", sub: "AI 통화요약이 대신 기록합니다", cta: "확인하기", hook: "손실 회피", target: "영업사원" },
      { copy: "오늘 통화, 보고서에 다 적었나요?", sub: "통화가 끝나면 요약이 자동으로", cta: "알아보기", hook: "질문", target: "영업팀장" },
      NUMERIC_BANNER,
    ],
    shorts: { title: "일일 보고서, 안 써도 되는 이유", hookLine: "통화는 끝났는데, 보고서가 안 끝나요.", hookOverlay: "통화보다 긴 보고서", result: "요약은 AI가, 나는 다음 통화로." },
    adHeadline: "AI 통화요약으로 보고 끝",
    adKeyword: "AI 통화요약 프로그램",
  },
  {
    vocId: "v_handover",
    voc: { subject: "담당자가 퇴사하면 상담 이력은 어떻게 되나요?", searches: ["담당자 퇴사 고객 인수인계 방법", "상담 이력 관리 어떻게 하나요"] },
    vocAnswer: "그대로 남습니다. 통화기록과 상담 내용이 담당자 개인이 아니라 고객 단위로 쌓이기 때문에, 담당자가 바뀌어도 다음 사람이 이전 대화를 바로 확인할 수 있습니다. 고객이 같은 이야기를 처음부터 다시 할 필요가 없습니다.",
    plan: {
      topic: "담당자가 바뀌어도 이어지는 고객관리, 통화요약·업무자동화 콜센터 프로그램 티링크 비즈레코딩",
      trendKeyword: "고객관리 프로그램",
      angle: "개인 기억이 아니라 고객별로 쌓인 통화·상담 이력으로 응대를 이어 가는 방법",
      reason: "‘고객관리 프로그램’ 관심이 늘고 있고, 통화기록이 고객 이력으로 이어지는 CRM 차별점이 인수인계 문제를 직접 해결합니다.",
    },
    intro: "담당자가 휴가를 가거나 바뀌면 고객은 같은 이야기를 처음부터 다시 해야 합니다. 상담 내용이 담당자 개인의 휴대폰과 기억에만 남아 있기 때문입니다. 누가 어떤 전화로 통화했는지에 따라 기록이 있기도 하고 없기도 합니다.",
    leads: {
      record: "기억에 의존하지 않으려면 모든 통화가 남아야 합니다.",
      summary: "긴 통화도 빠르게 파악할 수 있어야 인수인계가 됩니다.",
      manage: "이력이 쌓이면 팀 전체의 응대가 보입니다.",
    },
    closing: "좋은 응대는 뛰어난 한 사람이 아니라 잘 쌓인 기록에서 나옵니다. 담당자가 바뀌어도 고객이 같은 설명을 반복하지 않는 팀이 신뢰를 얻습니다.",
    cardProblem: { title: "“지난번에 말씀드렸는데요”", body: "담당자가 바뀔 때마다 고객이 같은 설명을 반복한다면, 기록이 개인에게만 남아 있기 때문입니다." },
    coreMessage: "통화기록이 고객 이력으로 남아, 담당자가 바뀌어도 대화가 이어집니다.",
    email: {
      subjects: ["“지난번에 말씀드렸는데요” 줄이는 법", "담당자가 바뀌어도 이어지는 고객관리"],
      preheader: "통화기록을 고객별 이력으로 남기세요",
      story: [
        "담당자가 바뀌면 고객은 같은 이야기를 처음부터 다시 해야 합니다. 그때마다 신뢰는 조금씩 깎입니다.",
        "문제는 사람이 아니라, 상담 내용이 개인의 휴대폰과 기억에만 남는 구조입니다.",
      ],
    },
    kakao: [
      { copy: "담당자 바뀌면 고객도 떠납니다", sub: "통화기록을 고객 이력으로", cta: "확인하기", hook: "손실 회피", target: "영업·CS 관리자" },
      { copy: "지난 통화 내용, 바로 찾아지나요?", sub: "고객별 통화·상담 이력 한 화면", cta: "알아보기", hook: "질문", target: "상담 실무자" },
      NUMERIC_BANNER,
    ],
    shorts: { title: "담당자가 바뀌어도 응대가 이어지는 팀", hookLine: "“지난번에 다 말씀드렸는데요.”", hookOverlay: "고객이 가장 싫어하는 순간", result: "누가 받아도, 대화는 이어집니다." },
    adHeadline: "담당자 바뀌어도 이력 그대로",
    adKeyword: "고객관리 프로그램 추천",
  },
];

const FOOTER = `홈페이지 ${CONTACT.homepage} · 공식 블로그 ${CONTACT.blog} · 상담 문의 ${CONTACT.phone} (${CONTACT.inquiry})`;
const SECURITY = "기업 통화정보인 만큼 보안도 중요합니다. AES256·SHA256 암호화와 사용자별 접근권한으로 통화정보를 관리하고, 녹취를 재생하거나 내려받을 때는 사유를 입력해야 하며 그 이력이 로그로 남습니다.";
const CONCLUSION = "티링크 비즈레코딩은 단순한 통화녹음 서비스가 아닙니다. 영업 활동을 자동으로 기록하고 경영에 필요한 정보로 정리해 주는 기업용 영업관리 솔루션입니다.";

const USED_DIFFS = ["d_unified", "d_summary", "d_crm", "d_stats", "d_report", "d_security"];

/** Index of a sample topic, used to locate its pre-rendered card images. */
export function demoTopicIndex(topic: string): number {
  return TOPICS.findIndex((t) => t.plan.topic === topic);
}

function topicFor(plan: Plan): DemoTopic {
  return TOPICS.find((t) => t.plan.topic === plan.topic) ?? TOPICS[0];
}

export function demoPlan(usedTopics: string[], voc: VocItem[] = [], usedVocIds: string[] = []): Plan {
  const next = TOPICS.find((t) => !usedTopics.includes(t.plan.topic) && !usedVocIds.includes(t.vocId));
  if (!next) {
    throw new Error(
      `데모 모드에 준비된 주제 ${TOPICS.length}개를 모두 사용했습니다. 이전에 다룬 주제와 고객 질문은 다시 쓰지 않으므로, 대시보드의 ‘이력 초기화’로 처음부터 다시 보거나 ANTHROPIC_API_KEY를 설정해 실제 생성으로 전환하세요.`,
    );
  }
  const plan: Plan = { ...next.plan, coreMessage: next.coreMessage, differentiatorIds: USED_DIFFS };
  const item = voc.find((v) => v.id === next.vocId);
  if (!item) return plan;
  return {
    ...plan,
    vocId: item.id,
    customerQuestion: item.question,
    // Call counts are fine here: the reason is shown on internal screens only.
    reason: `최근 2주 통화 중 ${item.count}건에서 나온 질문이고, 연결된 차별점으로 바로 답할 수 있습니다. ‘${plan.trendKeyword}’ 검색 관심도 오르고 있어 함께 연결했습니다.`,
  };
}

export function demoBlog(plan: Plan): Blog {
  const t = topicFor(plan);
  const sec = (heading: string, paragraphs: string[], screenshotId: string | null = null, caption: string | null = null): BlogSection =>
    ({ heading, paragraphs, screenshotId, caption });
  return {
    title: plan.topic,
    sections: [
      // With a customer question the post opens by asking it and answering right away.
      sec(plan.customerQuestion ?? "흩어진 통화 기록, 기존 영업관리의 문제", [
        plan.customerQuestion ? `${plan.customerQuestion} ${t.vocAnswer}` : t.intro,
        "티링크 비즈레코딩은 휴대폰 통화녹음과 인터넷전화 자동녹취를 하나로 묶어 영업사원 통화관리를 자동화하는 솔루션입니다. 콜센터 프로그램을 찾아보던 중소기업이나, 통화 기록을 따로 챙길 사람이 없는 소규모 영업팀이라면 녹취부터 통화요약과 리포트까지 한 번에 이어지는 구성을 눈여겨볼 만합니다.",
      ]),
      sec("휴대폰·인터넷전화·PC폰 통화를 동시에 녹음합니다", [
        `${t.leads.record} 외근 중에는 휴대폰, 사무실에서는 인터넷전화, 집에서는 PC폰. 티링크 비즈레코딩은 이 통화들을 모두 자동으로 녹음·녹취합니다. 통신사는 KT, SK, LG 모두 사용할 수 있습니다.`,
        "휴대폰에는 앱을 설치하고 녹음 자동전송을 켜 두면 됩니다. 통화가 끝나면 녹음 파일이 자동으로 서버에 전송되고, 전송이 누락된 파일은 앱에서 골라 다시 보낼 수 있습니다.",
      ], "shot_app", "모바일 앱 설정 화면. 녹음·문자 자동전송을 켜 두면 통화 후 자동으로 서버에 전송됩니다"),
      sec("통화 한 건을 직접 녹음해 보면", [
        "과정을 따라가 보겠습니다. 휴대폰으로 고객과 통화하고 끊으면 따로 할 일이 없습니다. 잠시 뒤 관리 화면의 통화 녹음 목록에 방금 통화가 올라옵니다. 통화일, 통화시간, 수신·발신 구분, 기기 유형까지 한 줄로 정리됩니다.",
        "휴대폰 통화와 인터넷전화 통화가 하나의 관리 화면에 모이기 때문에, 직원마다 전화를 쓰는 방식이 달라도 한곳에서 찾을 수 있습니다. 통화일이나 번호로 검색하고 엑셀로 내려받을 수도 있습니다.",
      ], "shot_calls", "통화 녹음 목록. 수신·발신, 통화시간, 기기 유형이 한 화면에 정리됩니다"),
      sec("통화가 끝나면 STT 문자변환과 AI 통화요약이 자동으로", [
        `${t.leads.summary} 목록에서 [상세보기]를 누르면 녹음 재생 버튼 아래로 핵심 키워드, AI 요약, 화자별 대화 스크립트가 나옵니다. STT 문자변환으로 대화 전체가 글자로 남고, AI 통화요약은 대화 개요와 고객 요청사항, 상담원의 답변과 후속 조치 내용을 항목별로 정리합니다.`,
        "녹음을 처음부터 다시 듣지 않아도 무슨 이야기가 오갔는지 알 수 있어, 통화 메모를 따로 쓸 일이 줄어듭니다. 통화요약이 곧 기록이 됩니다.",
      ], "shot_summary", "통화 상세 화면. 키워드, AI 요약, 화자별 대화 스크립트를 함께 확인합니다"),
      sec("고객별 상담 이력은 CRM으로 이어집니다", [
        "통화기록은 CRM의 고객 화면에 연결됩니다. 고객 한 명을 열면 상담, 통화, 문자, 주문 이력이 탭으로 정리되어 있고, 통화 탭에서 바로 녹취를 재생하거나 STT 내용을 볼 수 있습니다.",
        "그래서 담당자가 변경되어도 이전 상담 이력을 빠르게 확인할 수 있습니다. 여러 고객의 담당자를 한꺼번에 바꾸는 기능도 있어 인수인계가 간단합니다.",
      ], "shot_customer", "CRM 고객 상세 화면(개인정보 가림 처리). 상담·통화·문자·주문 이력을 탭으로 확인합니다"),
      sec("영업사원별 통화량과 미결 상담까지 관리합니다", [
        `${t.leads.manage} 관리자는 통계 화면에서 영업사원별 통화량, 응답률, 평균 통화시간을 비교할 수 있습니다. 일별·주별·월별 추이와 시간대별 통화량도 그래프로 제공됩니다.`,
        "고객 상담 이력은 대기·진행중·완료 상태로 나뉘어 있어, 미결 상담과 후속 연락 여부를 놓치지 않고 관리할 수 있습니다.",
      ], "shot_stats", "CRM 통화 통계 화면. 통화 추이와 담당자별 통화 순위를 보여 줍니다"),
      sec("경영진은 종합 리포트와 경영 대시보드로 확인합니다", [
        "AI 기반 리포트는 하루의 통화·상담·매출 현황과 담당자별 실적을 요약하고, 주요 이슈와 개선 포인트, 전일·전주 대비 변화를 분석해 줍니다. 기간을 정해 종합 리포트를 만들고 PDF로 내려받아 공유할 수도 있습니다.",
        "관리자와 경영진은 조직별·직원별 영업 활동과 상담 현황, 미결 업무, 고객 이탈 위험을 종합 리포트와 경영 대시보드에서 한눈에 확인할 수 있습니다. 영업사원은 일일 보고서를 쓰는 시간을 줄이고, 관리자는 객관적인 통화 데이터를 바탕으로 영업 코칭과 성과관리를 할 수 있습니다.",
      ], "shot_dashboard", "현황 대시보드. 당일 통화 현황과 응답률, 시간대별 통화를 한눈에 봅니다"),
      // The first draft leaves out the security note and the contact footer on purpose, to show the auto-fix step.
      sec("정리하며", [t.closing, CONCLUSION]),
    ],
    tags: GUIDE_TAGS.slice(0, 12),
  };
}

export function demoRevise(plan: Plan, blog: Blog, sectionIndexes: number[]): { sections: { index: number; section: BlogSection }[] } {
  const t = topicFor(plan);
  const last = blog.sections.length - 1;
  return {
    sections: sectionIndexes
      .filter((i) => i === last)
      .map((i) => ({ index: i, section: { ...blog.sections[i], paragraphs: [t.closing, SECURITY, CONCLUSION, FOOTER] } })),
  };
}

export function demoCards(plan: Plan, ws: Workspace): CardNews {
  const t = topicFor(plan);
  const point = (eyebrow: string, title: string, body: string, screenshotId: string | null = null) =>
    ({ kind: "point" as const, eyebrow, title, body, screenshotId });
  return {
    slides: [
      { kind: "cover", eyebrow: plan.customerQuestion ? "자주 받는 질문" : plan.trendKeyword, title: plan.customerQuestion ?? t.cardProblem.title, body: "", screenshotId: null },
      point("이런 적 있나요", "기록이 사람마다 흩어집니다", t.cardProblem.body),
      point("해결 1", "어떤 전화든 자동으로 녹취", "휴대폰, 인터넷전화, PC폰 통화가 하나의 목록에 모입니다.", "shot_calls"),
      point("해결 2", "통화가 끝나면 AI 통화요약", "키워드, 요약, 대화 스크립트가 자동으로 남습니다.", "shot_summary"),
      point("해결 3", "직원별 통화 통계", "통화량, 응답률, 평균 통화시간을 한눈에 비교합니다.", "shot_stats"),
      point("한눈에 정리", "녹취 → 요약 → 리포트", t.coreMessage),
      { kind: "cta", eyebrow: ws.product.company, title: `${ws.product.name} 도입 상담`, body: `${CONTACT.phone} · ${CONTACT.homepage}`, screenshotId: null },
    ],
    caption: `${t.intro}\n\n티링크 ${ws.product.name}은 휴대폰·인터넷전화·PC폰 통화를 자동으로 녹취하고 STT 문자변환, AI 통화요약, 종합 리포트까지 한 번에 이어 줍니다.\n\n도입 상담 ${CONTACT.phone} · ${CONTACT.homepage}`,
    hashtags: GUIDE_TAGS.slice(0, 11),
  };
}

/** Same plan, four more formats: email, KakaoTalk banner, short-form video script, search ads. */
export function demoChannels(plan: Plan, ws: Workspace): Channels {
  const t = topicFor(plan);
  const name = ws.product.name;
  return {
    email: {
      // With a customer question, one of the A/B subjects asks it (shortened to fit the subject limit).
      subjects: plan.customerQuestion ? [t.email.subjects[0], t.voc.subject] : t.email.subjects,
      preheader: t.email.preheader,
      greeting: "{{이름}}님, 안녕하세요.",
      paragraphs: [
        ...t.email.story,
        `티링크 ${name}은 휴대폰·인터넷전화·PC폰 통화를 자동으로 녹취하고, 통화가 끝나면 STT 문자변환과 AI 통화요약을 남깁니다. ${t.coreMessage}`,
        `직원이 많지 않은 팀도 쓰던 전화 그대로 시작할 수 있는지, 우리 팀 통화 환경에 맞는 도입 방법을 담당자가 안내해 드립니다. 전화 상담은 ${CONTACT.phone}입니다.`,
      ],
      ctaLabel: "도입 상담 신청하기",
    },
    kakao: t.kakao,
    shorts: {
      title: t.shorts.title,
      scenes: [
        { seconds: 2, visual: "통화를 끊자마자 수첩을 찾는 직원의 1인칭 시점", narration: plan.customerQuestion ?? t.shorts.hookLine, overlay: t.shorts.hookOverlay },
        { seconds: 5, visual: "휴대폰, 사무실 전화기, 수첩, 보고서 창을 빠르게 교차", narration: "휴대폰으로 받고, 사무실 전화로 걸고, 기록은 다 따로따로.", overlay: "기록이 다 흩어져 있다면" },
        { seconds: 6, visual: "통화 녹음 목록 화면 녹화: 방금 끝난 통화가 목록에 올라옴", narration: `티링크 ${name}은 휴대폰이든 인터넷전화든 통화가 자동으로 녹취돼요.`, overlay: "어떤 전화든 자동 녹취" },
        { seconds: 6, visual: "통화 상세 화면 녹화: 키워드, AI 요약, 대화 스크립트가 표시됨", narration: "끝나면 키워드랑 AI 통화요약, 대화 내용까지 글로 남습니다.", overlay: "STT + AI 통화요약" },
        { seconds: 4, visual: "직원이 수첩을 덮고 다음 전화를 받는 모습", narration: t.shorts.result, overlay: t.shorts.result },
        { seconds: 2, visual: "첫 장면과 같은 구도로 전화벨이 다시 울림", narration: "그런데 다음 통화는요?", overlay: "다음 통화는?" },
      ],
      loop: "마지막 전화벨 장면이 첫 장면의 통화 종료 직후와 같은 구도로 이어져, 자연스럽게 처음부터 다시 보게 됩니다.",
      pinnedComment: `통화 기록과 보고에 쓰는 시간을 줄이고 싶다면 → 프로필 링크에서 티링크 ${name} 도입 상담을 신청하세요. (${CONTACT.phone})`,
    },
    searchAds: {
      keywords: ["콜센터 프로그램", "중소기업 콜센터 프로그램", "영업사원 통화관리", "휴대폰 통화녹음 프로그램", "인터넷전화 녹취", "통화요약 프로그램", t.adKeyword, ...(plan.customerQuestion ? t.voc.searches : [])],
      negativeKeywords: ["무료 다운로드", "개인용", "아이폰 통화녹음", "녹음기", "콜센터 채용"],
      ads: [
        { headline: `콜센터 프로그램 ${name}`, description: "휴대폰·인터넷전화 통화를 자동 녹취하고 AI가 통화요약까지. 도입 상담 신청." },
        { headline: t.adHeadline, description: "통화가 끝나면 STT와 AI 요약이 자동 기록됩니다. 보고 업무를 줄이세요." },
        { headline: "휴대폰·인터넷전화 통합녹취", description: "KT·SK·LG 모두 가능. 직원별 통화 통계와 종합 리포트까지 한 번에." },
      ],
      sitelinks: ["기능 소개", "AI 통화요약", "CRM 연동", "도입 상담"],
    },
  };
}

/** Term-based stand-in for the AI mission review; knows the missions of the company guideline. */
const MISSION_RULES: { match: RegExp; terms: string[]; scope: "all" | "title" | "titleAndIntro" | "closing"; fix: "first" | "last" }[] = [
  { match: /제목에 필수 키워드/, terms: [], scope: "title", fix: "first" },
  { match: /제목과 첫 문단/, terms: ["티링크 비즈레코딩", "영업사원 통화관리", "휴대폰 통화녹음", "인터넷전화 자동녹취"], scope: "titleAndIntro", fix: "first" },
  { match: /PC폰/, terms: ["휴대폰", "인터넷전화", "PC폰", "KT"], scope: "all", fix: "last" },
  { match: /STT 문자변환, AI 통화요약/, terms: ["STT 문자변환", "AI 통화요약", "키워드", "후속 조치"], scope: "all", fix: "last" },
  { match: /평균 통화시간/, terms: ["통화량", "평균 통화시간", "미결 상담"], scope: "all", fix: "last" },
  { match: /담당자가 변경/, terms: ["CRM", "담당자가 변경", "상담 이력"], scope: "all", fix: "last" },
  { match: /경영 대시보드/, terms: ["종합 리포트", "경영 대시보드", "고객 이탈 위험"], scope: "all", fix: "last" },
  { match: /일일 보고서/, terms: ["일일 보고서", "코칭"], scope: "all", fix: "last" },
  { match: /통화 한 건/, terms: ["통화 한 건", "AI 요약"], scope: "all", fix: "last" },
  { match: /결론에서 강조/, terms: ["기업용 영업관리 솔루션"], scope: "closing", fix: "last" },
  { match: /AES256/, terms: ["AES256", "SHA256", "접근권한"], scope: "all", fix: "last" },
  { match: /하단에/, terms: [CONTACT.homepage, CONTACT.phone, "blog.naver.com"], scope: "closing", fix: "last" },
];

export function demoReviewMissions(guideline: Guideline, blog: Blog): MissionCheck[] {
  const last = blog.sections.length - 1;
  const text = (i: number) => [blog.sections[i]?.heading ?? "", ...(blog.sections[i]?.paragraphs ?? [])].join(" ");
  const all = [blog.title, ...blog.sections.map((_, i) => text(i))].join(" ");
  const scopes = { all, title: blog.title, titleAndIntro: `${blog.title} ${text(0)}`, closing: text(last) };
  const shots = blog.sections.filter((s) => s.screenshotId && s.caption).length;

  return guideline.missions.map((mission) => {
    if (/이미지와 함께 순서대로/.test(mission)) {
      const pass = shots >= 5;
      return { mission, pass, note: `캡션이 달린 화면 캡처 ${shots}장을 글 흐름 순서대로 배치`, sectionIndexes: pass ? [] : [1] };
    }
    const rule = MISSION_RULES.find((r) => r.match.test(mission));
    if (!rule) return { mission, pass: true, note: "데모 모드에서는 이 항목의 AI 검수를 건너뜁니다", sectionIndexes: [] };
    const terms = rule.scope === "title" ? guideline.requiredKeywords.map((k) => k.keyword) : rule.terms;
    const missing = terms.filter((term) => !scopes[rule.scope].includes(term));
    const where = { all: "본문", title: "제목", titleAndIntro: "제목과 첫 문단", closing: "마지막 문단" }[rule.scope];
    return {
      mission,
      pass: missing.length === 0,
      note: missing.length ? `${where}에 빠진 내용: ${missing.join(", ")}` : `${where}에서 확인: ${terms.join(", ")}`,
      sectionIndexes: missing.length && rule.scope !== "title" ? [rule.fix === "first" ? 0 : last] : [],
      fixTitle: missing.some((term) => rule.scope.startsWith("title") && !blog.title.includes(term)),
    };
  });
}
