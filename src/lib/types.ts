export type MaterialKind = "doc" | "screenshot" | "guideline";

export interface Material {
  id: string;
  kind: MaterialKind;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
  /** Text extracted at upload time (PPTX slides, XLSX rows). PDFs go to Claude as-is. */
  text?: string;
  /** What the screenshot shows; filled by vision analysis (or seeded in demo). */
  description?: string;
  demo?: boolean;
}

export interface Guideline {
  source: string;
  requiredKeywords: { keyword: string; minCount: number }[];
  missions: string[];
  structure: string[];
  minChars: number;
}

export interface Evidence {
  doc: string;
  page: number;
  quote: string;
}

export interface Differentiator {
  id: string;
  title: string;
  /** Customer-friendly one-liner. */
  plain: string;
  conventional: string;
  ours: string;
  evidence: Evidence[];
}

export interface Workspace {
  product: { name: string; company: string; summary: string };
  materials: Material[];
  guideline: Guideline;
  differentiators: Differentiator[];
  analyzedAt?: string;
  analysisMode?: "live" | "demo";
}

export interface TrendItem {
  keyword: string;
  /** Recent 2 weeks vs. the 2 weeks before, in percent. */
  change: number;
  series: number[];
}

export interface NewsItem {
  keyword: string;
  title: string;
  link: string;
  pubDate: string;
}

export interface Plan {
  topic: string;
  trendKeyword: string;
  angle: string;
  reason: string;
  differentiatorIds: string[];
  /** The one message every channel repeats in its own format. */
  coreMessage?: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  screenshotId: string | null;
  caption: string | null;
}

export interface Blog {
  title: string;
  sections: BlogSection[];
  tags: string[];
}

export interface CardSlide {
  kind: "cover" | "point" | "cta";
  eyebrow: string;
  title: string;
  body: string;
  screenshotId: string | null;
}

export interface CardNews {
  slides: CardSlide[];
  caption: string;
  hashtags: string[];
}

export interface EmailContent {
  /** A/B subject candidates, without the legal "(광고)" prefix (added by code). */
  subjects: string[];
  preheader: string;
  greeting: string;
  paragraphs: string[];
  /** Exactly one call to action per mail. */
  ctaLabel: string;
}

export interface KakaoBanner {
  copy: string;
  sub: string;
  cta: string;
  hook: "숫자" | "손실 회피" | "질문";
  target: string;
}

export interface ShortsScript {
  title: string;
  scenes: { seconds: number; visual: string; narration: string; overlay: string }[];
  loop: string;
  pinnedComment: string;
}

export interface SearchAds {
  keywords: string[];
  negativeKeywords: string[];
  ads: { headline: string; description: string }[];
  sitelinks: string[];
}

export interface Channels {
  email: EmailContent;
  kakao: KakaoBanner[];
  shorts: ShortsScript;
  searchAds: SearchAds;
}

export type ChannelId = keyof Channels;

export interface ChannelCheck {
  channel: ChannelId;
  label: string;
  pass: boolean;
  detail: string;
}

export interface KeywordCheck {
  keyword: string;
  minCount: number;
  count: number;
  pass: boolean;
}

export interface MissionCheck {
  mission: string;
  pass: boolean;
  note: string;
  /** Blog section indexes that need rewriting when the mission fails. */
  sectionIndexes: number[];
}

export interface Review {
  keywordChecks: KeywordCheck[];
  missionChecks: MissionCheck[];
  charCount: number;
  minChars: number;
  adDisclosure: boolean;
  cardCountOk: boolean;
  /** Format rules of the extra channels (lengths, legal marks); absent on runs made before they existed. */
  channelChecks?: ChannelCheck[];
  passed: number;
  total: number;
}

export type RunStatus = "running" | "pending" | "approved" | "rejected" | "failed";

export interface RunLog {
  at: string;
  step: string;
  message: string;
}

export interface Run {
  id: string;
  createdAt: string;
  trigger: "manual" | "cron";
  status: RunStatus;
  step: string;
  logs: RunLog[];
  aiMode: "live" | "demo";
  trendMode: "live" | "sample";
  trends: TrendItem[];
  news: NewsItem[];
  plan?: Plan;
  blog?: Blog;
  cards?: CardNews;
  channels?: Channels;
  review?: Review;
  /** Review result of the first draft, kept to show what the auto-fix changed. */
  firstReview?: Review;
  revisions: { round: number; sectionIndexes: number[]; reasons: string[]; channels?: ChannelId[] }[];
  decidedAt?: string;
  error?: string;
}

/* ---------- Promo studio (one-shot: document + photos -> promo content) ---------- */

export interface PromoInput {
  name: string;
  company: string;
  summary: string;
  /** Who the promo should speak to, e.g. "중소기업 영업팀장". Optional. */
  audience: string;
}

export interface PromoDifferentiator {
  title: string;
  plain: string;
  conventional: string;
  ours: string;
  evidence: { doc: string; page: number | null; quote: string }[];
}

export interface PromoHighlight {
  title: string;
  body: string;
  /** Index into PromoResult.differentiators. */
  differentiatorIndex: number;
  /** Index into the uploaded photos, or null when no photo fits. */
  photoIndex: number | null;
  photoAlt: string | null;
}

export interface PromoResult {
  mode: "live" | "demo";
  model: string;
  differentiators: PromoDifferentiator[];
  photos: { index: number; description: string }[];
  promo: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    hook: string;
    heroPhotoIndex: number | null;
    highlights: PromoHighlight[];
    ctaLabel: string;
    ctaNote: string;
  };
  sns: { caption: string; hashtags: string[] };
}
