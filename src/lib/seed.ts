import type { Differentiator, Guideline, Material, Workspace } from "./types";

/**
 * Sample workspace shown before any real material is uploaded.
 * Everything here is illustrative demo content, flagged with `demo: true`
 * in the UI — it is not taken from actual Tlink documents.
 */

export const DEMO_DOCS = {
  proposal: "비즈레코딩 제안서(샘플).pdf",
  manual: "비즈레코딩 사용자 매뉴얼(샘플).pdf",
};

export const seedGuideline: Guideline = {
  source: "기본 가이드라인(샘플)",
  requiredKeywords: [
    { keyword: "비즈레코딩", minCount: 3 },
    { keyword: "통화녹음", minCount: 2 },
    { keyword: "AI 리포트", minCount: 1 },
  ],
  missions: [
    "도입 문단에서 독자가 겪는 업무 문제 상황을 먼저 제시한다",
    "제품 화면 캡처를 2장 이상 사용하고 각 이미지에 캡션을 단다",
    "마지막 문단에 도입 문의로 이어지는 행동 유도 문구를 넣는다",
  ],
  structure: ["문제 제기", "트렌드 연결", "기능별 해결 방법", "정리와 문의 안내"],
  minChars: 650,
};

export const seedDifferentiators: Differentiator[] = [
  {
    id: "d_record",
    title: "업무 통화 자동 녹음·자동 정리",
    plain: "통화가 끝나면 녹음 파일이 고객별로 알아서 정리됩니다.",
    conventional: "직원이 개인 휴대폰 앱으로 녹음하고, 파일을 직접 찾아 공유합니다.",
    ours: "업무 통화가 자동으로 녹음되어 고객·담당자·날짜 기준으로 한곳에 쌓입니다.",
    evidence: [
      { doc: DEMO_DOCS.proposal, page: 5, quote: "업무 통화 자동 녹음 및 클라우드 보관" },
      { doc: DEMO_DOCS.manual, page: 12, quote: "통화 목록에서 고객명·기간으로 검색" },
    ],
  },
  {
    id: "d_crm",
    title: "통화 이력이 붙는 CRM",
    plain: "고객 카드를 열면 지난 통화와 메모가 한 화면에 보입니다.",
    conventional: "통화 후 엑셀이나 수첩에 상담 내용을 따로 옮겨 적습니다.",
    ours: "통화 기록이 고객 카드에 자동으로 연결되어 담당자가 바뀌어도 이력이 이어집니다.",
    evidence: [
      { doc: DEMO_DOCS.proposal, page: 8, quote: "고객 정보와 통화 이력 통합 관리(CRM)" },
      { doc: DEMO_DOCS.manual, page: 21, quote: "고객 상세 화면의 통화 타임라인" },
    ],
  },
  {
    id: "d_report",
    title: "AI가 써 주는 통화 리포트",
    plain: "녹음을 다시 듣지 않아도 AI가 핵심과 다음 할 일을 정리해 줍니다.",
    conventional: "관리자가 녹음을 하나씩 들으며 상담 품질과 진행 상황을 확인합니다.",
    ours: "AI가 통화 내용을 요약하고 주요 키워드와 후속 조치를 리포트로 만들어 줍니다.",
    evidence: [
      { doc: DEMO_DOCS.proposal, page: 11, quote: "AI 리포트: 통화 요약·키워드·후속 조치 제안" },
      { doc: DEMO_DOCS.manual, page: 30, quote: "AI 리포트 조회 및 내보내기" },
    ],
  },
];

const DEMO_SCREENS: { id: string; name: string; description: string; svg: string }[] = [
  { id: "demo_shot_calls", name: "통화 목록 화면(샘플).svg", description: "고객별로 정리된 통화 녹음 목록 화면", svg: screenSvg("list") },
  { id: "demo_shot_crm", name: "고객 카드 화면(샘플).svg", description: "고객 정보와 통화 타임라인이 함께 보이는 CRM 고객 카드 화면", svg: screenSvg("crm") },
  { id: "demo_shot_report", name: "AI 리포트 화면(샘플).svg", description: "통화 요약과 키워드, 후속 조치가 정리된 AI 리포트 화면", svg: screenSvg("report") },
];

/** Raw SVG of a sample screen; usable in the browser as well as on the server. */
export function demoScreenSvg(id: string): string | null {
  return DEMO_SCREENS.find((x) => x.id === id)?.svg ?? null;
}

export function demoAsset(id: string): { mime: string; data: string } | null {
  const svg = demoScreenSvg(id);
  return svg ? { mime: "image/svg+xml", data: Buffer.from(svg).toString("base64") } : null;
}

export function seedWorkspace(): Workspace {
  const at = "2026-11-02T00:00:00.000Z";
  const docs: Material[] = Object.entries(DEMO_DOCS).map(([k, name]) => ({
    id: `demo_doc_${k}`, kind: "doc", name, mime: "application/pdf", size: 0, uploadedAt: at, demo: true,
  }));
  const shots: Material[] = DEMO_SCREENS.map((s) => ({
    id: s.id, kind: "screenshot", name: s.name, mime: "image/svg+xml", size: s.svg.length,
    uploadedAt: at, description: s.description, demo: true,
  }));
  return {
    product: {
      name: "비즈레코딩",
      company: "티링크",
      summary: "통화녹음·CRM·AI 리포트를 하나로 묶은 B2B 업무 통화 솔루션",
    },
    materials: [...docs, ...shots],
    guideline: seedGuideline,
    differentiators: seedDifferentiators,
    analyzedAt: at,
    analysisMode: "demo",
  };
}

/**
 * Wireframe-style placeholder screens. Deliberately text-free: the card renderer
 * rasterizes embedded SVGs without access to fonts, so glyphs would vanish.
 */
function screenSvg(kind: "list" | "crm" | "report"): string {
  const ink = "#1F4D3A", line = "#D9D2C3", soft = "#EFE9DC", amber = "#E8A33D";
  const bar = (x: number, y: number, w: number, h = 14, fill = line, r = 7) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
  let body = "";
  if (kind === "list") {
    for (let i = 0; i < 6; i++) {
      const y = 150 + i * 78;
      body += `<rect x="250" y="${y}" width="900" height="62" rx="12" fill="#fff" stroke="${line}"/>`
        + `<circle cx="290" cy="${y + 31}" r="16" fill="${i % 3 === 0 ? amber : soft}"/>`
        + bar(325, y + 16, 150 + (i % 3) * 30, 12, ink) + bar(325, y + 36, 240, 10)
        + bar(700, y + 25, 180, 12, soft) + `<rect x="1040" y="${y + 17}" width="84" height="28" rx="14" fill="${ink}"/>`;
    }
  } else if (kind === "crm") {
    body += `<rect x="250" y="150" width="330" height="460" rx="16" fill="#fff" stroke="${line}"/>`
      + `<circle cx="415" cy="235" r="48" fill="${soft}"/>` + bar(340, 305, 150, 16, ink) + bar(310, 335, 210, 10)
      + bar(280, 400, 270, 10) + bar(280, 425, 230, 10) + bar(280, 450, 250, 10)
      + `<rect x="280" y="530" width="270" height="44" rx="22" fill="${amber}"/>`
      + `<rect x="610" y="150" width="540" height="460" rx="16" fill="#fff" stroke="${line}"/>`
      + `<line x1="655" y1="200" x2="655" y2="570" stroke="${line}" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) {
      const y = 200 + i * 98;
      body += `<circle cx="655" cy="${y + 12}" r="10" fill="${i === 0 ? amber : ink}"/>`
        + bar(690, y, 180, 14, ink) + bar(690, y + 26, 400, 10) + bar(690, y + 46, 320, 10);
    }
  } else {
    body += `<rect x="250" y="150" width="900" height="150" rx="16" fill="#fff" stroke="${line}"/>`
      + bar(280, 180, 200, 16, ink) + bar(280, 215, 820, 10) + bar(280, 238, 760, 10) + bar(280, 261, 600, 10)
      + `<rect x="250" y="320" width="440" height="290" rx="16" fill="#fff" stroke="${line}"/>` + bar(280, 348, 140, 14, ink);
    [120, 190, 90, 160, 210, 130].forEach((h, i) => {
      body += `<rect x="${290 + i * 62}" y="${580 - h}" width="38" height="${h}" rx="8" fill="${i === 4 ? amber : ink}"/>`;
    });
    body += `<rect x="710" y="320" width="440" height="290" rx="16" fill="#fff" stroke="${line}"/>` + bar(740, 348, 140, 14, ink);
    for (let i = 0; i < 4; i++) {
      body += `<rect x="740" y="${392 + i * 50}" width="22" height="22" rx="6" fill="${i < 2 ? ink : soft}"/>` + bar(778, 398 + i * 50, 300 - i * 30, 10);
    }
  }
  let nav = "";
  for (let i = 0; i < 6; i++) nav += bar(40, 150 + i * 48, 130, 12, i === (kind === "list" ? 0 : kind === "crm" ? 1 : 2) ? amber : "#3E6B58");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="660" viewBox="0 0 1200 660">`
    + `<rect width="1200" height="660" fill="#F6F1E7"/><rect width="210" height="660" fill="${ink}"/>`
    + `<rect x="40" y="48" width="36" height="36" rx="10" fill="${amber}"/>` + bar(88, 58, 82, 14, "#F6F1E7") + nav
    + `<rect x="210" width="990" height="100" fill="#fff"/>` + bar(250, 42, 220, 18, ink) + `<rect x="900" y="32" width="250" height="38" rx="19" fill="${soft}"/>`
    + body + `</svg>`;
}
