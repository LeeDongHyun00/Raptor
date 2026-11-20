import type { Differentiator, Guideline, Material, Workspace } from "./types";

/**
 * Starting workspace, prepared from the four company documents (CRM manual,
 * mobile admin manual, PC phone manual, November 2026 guideline). The documents
 * themselves are not in the repository: only the analysis written from them and
 * a few screenshots taken from the manuals, with personal fields blurred.
 * Items flagged `demo: true` are these preloaded entries (not user uploads).
 */

// The uploaded files lost their Korean file names, so these are named after each document's own title.
export const DOCS = {
  crm: "TlinkNote 클라우드 CRM 사용자 매뉴얼.pdf",
  admin: "티링크모바일 관리자 매뉴얼.pptx",
  pc: "TlinkPhone(PC폰) 사용자 매뉴얼.pdf",
  guide: "2026년 11월 티링크 가이드라인.xlsx",
};

export const CONTACT = {
  homepage: "www.tlinkcrm.com",
  blog: "https://blog.naver.com/mobilecrm",
  phone: "1877-3836",
  inquiry: "https://www.tlinkcrm.com/center.php",
};

export const GUIDE_TAGS = [
  "티링크", "콜센터", "고객상담", "콜센터프로그램", "고객관리프로그램", "CRM프로그램", "녹음", "녹취", "인터넷전화", "CRM",
  "영업사원통화관리", "고객관리", "업무자동화", "STT", "문자변환", "음성요약", "회의록작성", "휴대폰녹음", "종합리포트",
];

export const seedGuideline: Guideline = {
  source: DOCS.guide,
  requiredKeywords: [
    { keyword: "통화요약", minCount: 1 },
    { keyword: "콜센터 프로그램", minCount: 1 },
    { keyword: "업무자동화", minCount: 1 },
  ],
  missions: [
    "제목에 필수 키워드(통화요약, 콜센터 프로그램, 업무자동화)를 포함한다",
    "제목과 첫 문단에 ‘티링크 비즈레코딩’, ‘영업사원 통화관리’, ‘휴대폰 통화녹음’, ‘인터넷전화 자동녹취’ 키워드를 자연스럽게 포함한다",
    "외근 중 휴대폰, 사무실 인터넷전화, 집에서는 PC폰 통화를 동시에 자동 녹음·녹취하고 하나의 관리 화면에서 확인할 수 있다는 점을 강조한다. 통신사는 KT, SK, LG 모두 사용 가능하다",
    "통화가 끝나면 STT 문자변환, AI 통화요약, 핵심 키워드, 고객 요청사항과 후속 조치 내용이 자동으로 기록된다는 점을 소개한다",
    "영업사원별 통화량, 평균 통화시간, 고객 상담 이력, 미결 상담과 후속 연락 여부를 관리할 수 있다는 점을 설명한다",
    "고객별 통화기록과 상담 내용을 CRM에 연결해 담당자가 변경되어도 이전 상담 이력을 빠르게 확인할 수 있다는 점을 강조한다",
    "관리자와 경영진이 조직별·직원별 영업 활동, 상담 현황, 미결 업무, 고객 이탈 위험 등을 종합 리포트와 경영 대시보드에서 한눈에 확인할 수 있다는 점을 소개한다",
    "영업사원이 통화 메모나 일일 보고서를 작성하는 시간을 줄이고, 관리자는 객관적인 통화 데이터를 바탕으로 영업 코칭과 성과관리를 할 수 있다는 점을 강조한다",
    "통화 한 건을 직접 녹음하고 녹취 결과와 AI 요약이 생성되는 과정을 실제 사용 흐름대로 보여 준다",
    "휴대폰 통화 화면, 인터넷전화 녹취 목록, AI 통화요약, 직원별 통계, 종합 리포트 화면을 이미지와 함께 순서대로 소개한다",
    "단순한 통화녹음 서비스가 아니라 ‘영업 활동을 자동으로 기록하고 경영에 필요한 정보로 정리해 주는 기업용 영업관리 솔루션’이라는 점을 결론에서 강조한다",
    "AES256·SHA256 암호화와 사용자별 접근권한 등 기업 통화정보를 안전하게 관리하는 보안 기능을 함께 소개한다",
    `글 하단에 홈페이지(${CONTACT.homepage}), 공식 블로그 링크, 상담 문의(${CONTACT.phone}) 정보를 넣는다`,
  ],
  structure: ["기존 영업관리의 문제", "휴대폰·인터넷전화 동시 녹음", "AI 자동 기록과 요약", "영업사원 관리", "경영진 종합 리포트"],
  // The guideline sheet sets no length requirement.
  minChars: 0,
};

const ev = (doc: string, page: number, quote: string) => ({ doc, page, quote });

export const seedDifferentiators: Differentiator[] = [
  {
    id: "d_unified",
    title: "휴대폰·인터넷전화·PC폰 통합 녹취",
    plain: "어떤 전화로 통화하든 녹음이 한 화면에 모입니다.",
    conventional: "휴대폰은 개인 녹음 앱, 사무실 전화는 별도 녹취 장비를 써서 통화 기록이 직원과 기기마다 흩어집니다.",
    ours: "휴대폰 앱이 녹음을 자동 전송하고 인터넷전화·PC폰 녹음도 서버로 올라가, 하나의 통화 녹음 목록에서 검색하고 재생합니다.",
    evidence: [
      ev(DOCS.admin, 24, "녹음·문자 자동전송을 ON으로 설정하면 자동으로 서버에 전송됩니다."),
      ev(DOCS.admin, 6, "통화일·ID·CID·in/out·상태로 통화 녹음 목록을 검색하고, [상세보기]로 통화 내용을 확인합니다."),
      ev(DOCS.pc, 16, "녹음파일 전송을 체크하면 녹음 파일이 서버로 전송됩니다."),
    ],
  },
  {
    id: "d_summary",
    title: "통화가 끝나면 STT·AI 요약 자동 기록",
    plain: "녹음을 다시 듣지 않아도 무슨 통화였는지 글로 남습니다.",
    conventional: "통화가 끝나면 직원이 내용을 기억해 메모하고, 확인하려면 녹음을 처음부터 다시 들어야 합니다.",
    ours: "통화마다 키워드, AI 요약, 화자별 대화 스크립트가 자동으로 만들어지고 목록에는 한 줄 요약이 표시됩니다.",
    evidence: [
      ev(DOCS.admin, 7, "녹음 파일 재생, 추출된 키워드, AI 요약 내용과 화자별 대화 스크립트를 확인할 수 있습니다."),
      ev(DOCS.crm, 15, "한줄요약: AI가 분석한 통화 내용 요약"),
      ev(DOCS.pc, 12, "통화 중 음성을 실시간으로 텍스트로 변환하여 표시합니다."),
    ],
  },
  {
    id: "d_crm",
    title: "통화기록이 고객 이력으로 이어지는 CRM",
    plain: "고객 한 명을 열면 상담·통화·문자·주문 이력이 한 화면에 있습니다.",
    conventional: "통화 내용을 엑셀이나 수첩에 따로 옮겨 적고, 담당자가 바뀌면 이전 대화를 다시 물어봐야 합니다.",
    ours: "고객 상세 화면의 이력 탭에서 통화를 눌러 녹취 재생과 STT 확인까지 하고, 통화에서 바로 상담을 등록합니다.",
    evidence: [
      ev(DOCS.crm, 29, "통화: 해당 고객의 통화 이력. 클릭 시 녹취 재생/STT 확인 가능."),
      ev(DOCS.crm, 27, "전화 수신 시 자동으로 열리거나, 고객 목록에서 클릭하여 접근합니다."),
      ev(DOCS.crm, 26, "담당자 변경: 선택한 고객의 담당자를 일괄 변경합니다."),
    ],
  },
  {
    id: "d_stats",
    title: "직원별 통화 통계와 미결 상담 관리",
    plain: "누가 얼마나 통화했고 어떤 상담이 남았는지 숫자로 봅니다.",
    conventional: "직원이 쓴 일일 보고에 의존해 통화량과 상담 진행 상황을 파악합니다.",
    ours: "담당자별 통화량·응답률·평균 통화시간을 비교하고, 상담을 대기·진행중·완료 상태로 나눠 미결 건을 관리합니다.",
    evidence: [
      ev(DOCS.crm, 33, "담당자별 통계: 담당자별 통화량, 응답률 비교"),
      ev(DOCS.crm, 34, "상태별 비율: 대기/진행중/완료 비율 차트"),
      ev(DOCS.admin, 14, "시간대별 통화 현황 그래프와 상담원별 통계표를 제공하며, PDF/엑셀로 다운로드할 수 있습니다."),
    ],
  },
  {
    id: "d_report",
    title: "AI 종합 리포트와 현황 대시보드",
    plain: "보고서를 따로 만들지 않아도 AI가 현황과 개선점을 정리합니다.",
    conventional: "관리자가 통화 기록과 실적을 직접 취합해 보고서를 만듭니다.",
    ours: "AI가 통화·상담·매출 현황과 담당자별 실적을 요약하고 이슈와 개선 포인트를 분석하며, 기간별 종합 리포트를 PDF로 내려받습니다.",
    evidence: [
      ev(DOCS.crm, 35, "AI 기반 업무 분석 리포트를 제공합니다. 일일 리포트와 종합 리포트를 확인할 수 있습니다."),
      ev(DOCS.crm, 36, "주요 이슈 및 트렌드 분석 · 개선 포인트 제안 · 전일/전주 대비 변화 분석"),
      ev(DOCS.admin, 4, "당일 Call 현황(전체/성공/실패), 수신·발신 응답률, 시간대별 통화 현황과 콜타임 현황을 한눈에 확인하는 대시보드입니다."),
    ],
  },
  {
    id: "d_security",
    title: "녹취 열람 사유와 사용 이력까지 남는 보안",
    plain: "누가 언제 어떤 녹취를 들었는지 기록이 남습니다.",
    conventional: "녹음 파일이 개인 휴대폰이나 공유 폴더에 있어 누가 열어 봤는지 알 수 없습니다.",
    ours: "녹취를 재생·다운로드하려면 사유를 입력해야 하고, 로그인과 녹취 재생 이력이 로그로 남으며 사용자별 권한을 관리합니다.",
    evidence: [
      ev(DOCS.admin, 8, "녹취 파일을 재생·다운로드하려면 최소 5자 이상의 사유를 입력해야 확인이 가능합니다. (보안 절차)"),
      ev(DOCS.admin, 20, "로그인/로그아웃, 녹취 재생 등 시스템 사용 이력을 날짜별로 조회합니다."),
      ev(DOCS.guide, 1, "AES256·SHA256 암호화와 사용자별 접근권한 등 기업 통화정보를 안전하게 관리할 수 있는 보안 기능"),
    ],
  },
];

/** Screenshots taken from the manuals; files live in public/product-shots. */
export const SEED_SHOTS: { id: string; file: string; name: string; description: string }[] = [
  { id: "shot_app", file: "app-settings.jpg", name: "모바일 앱 설정 화면 (관리자 매뉴얼 p.24)", description: "휴대폰 앱 설정 화면. 녹음 자동전송과 문자 자동전송이 켜져 있다" },
  { id: "shot_calls", file: "call-list.jpg", name: "통화 녹음 목록 (관리자 매뉴얼 p.6)", description: "통화일, 통화시간, 수신·발신, 기기 유형이 정리된 통화 녹음 목록 화면" },
  { id: "shot_summary", file: "call-summary.jpg", name: "통화 녹음 상세보기 (관리자 매뉴얼 p.7)", description: "통화 한 건의 키워드, AI 요약 내용, 화자별 대화 스크립트가 보이는 상세 화면" },
  { id: "shot_customer", file: "crm-customer.jpg", name: "CRM 고객 상세 (CRM 매뉴얼 p.28, 개인정보 가림)", description: "고객 정보와 상담·통화·문자·주문 이력 탭이 함께 보이는 CRM 고객 상세 화면" },
  { id: "shot_stats", file: "call-stats.jpg", name: "CRM 통화 통계 (CRM 매뉴얼 p.33)", description: "총 통화, 응답률, 통화 추이 그래프와 담당자별 통화 순위가 보이는 통계 화면" },
  { id: "shot_dashboard", file: "dashboard.jpg", name: "현황 대시보드 (관리자 매뉴얼 p.4)", description: "당일 통화 현황, 수신·발신 응답률, 시간대별 통화 현황 대시보드" },
  { id: "shot_keywords", file: "keyword-stats.jpg", name: "키워드 통계 (관리자 매뉴얼 p.17)", description: "통화 녹취에서 추출한 주요 키워드를 빈도별 트리맵으로 보여 주는 화면" },
  { id: "shot_pcstt", file: "pc-stt.jpg", name: "PC폰 실시간 STT (PC폰 매뉴얼 p.12)", description: "PC폰에서 통화 중 고객과 상담원 발화가 실시간으로 글자로 표시되는 화면" },
];

export const seedShotFile = (id: string): string | null => SEED_SHOTS.find((s) => s.id === id)?.file ?? null;

export function seedWorkspace(): Workspace {
  const at = "2026-11-20T00:00:00.000Z";
  const docs: Material[] = Object.entries(DOCS)
    .filter(([k]) => k !== "guide")
    .map(([k, name]) => ({
      id: `seed_doc_${k}`, kind: "doc", name, mime: name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 0, uploadedAt: at, demo: true,
    }));
  const shots: Material[] = SEED_SHOTS.map((s) => ({
    id: s.id, kind: "screenshot", name: s.name, mime: "image/jpeg", size: 0, uploadedAt: at, description: s.description, demo: true,
  }));
  return {
    product: {
      name: "비즈레코딩",
      company: "티링크",
      summary: "휴대폰·인터넷전화·PC폰 통화를 자동 녹취하고 STT, AI 통화요약, CRM, 종합 리포트로 영업 활동을 정리하는 기업용 영업관리 솔루션",
    },
    materials: [...docs, ...shots],
    guideline: seedGuideline,
    differentiators: seedDifferentiators,
    analyzedAt: at,
    analysisMode: "demo",
  };
}
