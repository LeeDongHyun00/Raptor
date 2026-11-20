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

/** Filters chosen before a run: what to make, in which tone and look, for whom. */
export interface ProductionSettings {
  outputs: Record<"blog" | "instagram" | "shorts" | "kakao" | "searchAds" | "email", boolean>;
  concept: "info" | "empathy" | "compare";
  design: "forest" | "navy" | "warm";
  /** Target reader, e.g. small businesses and small sales teams. */
  audience: string;
  /** Facts the operator adds by hand because the documents do not state them. */
  productNotes: string;
}

export type VocCategory = "도입 문의" | "기능 질문" | "도입 우려" | "불만·장애";

export interface VocItem {
  id: string;
  /** Customer question rewritten in general terms: no names, numbers or company names. The only form allowed in public copy. */
  question: string;
  category: VocCategory;
  /** Calls in the analyzed period that raised this question. Internal screens only. */
  count: number;
  /** Up to two anonymized quotes for internal checking. Never used in public copy. */
  quotes: string[];
  /** Differentiators that can answer the question; empty when the documents cannot answer it. */
  differentiatorIds: string[];
  /** One-line angle for content answering this question. */
  angle: string;
}

export interface VocBoard {
  source: string;
  period?: string;
  analyzedAt: string;
  mode: "live" | "sample";
  items: VocItem[];
}

export interface Workspace {
  product: { name: string; company: string; summary: string };
  materials: Material[];
  guideline: Guideline;
  differentiators: Differentiator[];
  analyzedAt?: string;
  analysisMode?: "live" | "demo";
  /** Customer questions mined from call summaries; without it planning uses trends only. */
  voc?: VocBoard;
  settings?: ProductionSettings;
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
  /** The customer question this content answers, when planning started from VOC. */
  vocId?: string;
  customerQuestion?: string;
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
  /** The failure sits in the title, which section rewrites cannot reach. */
  fixTitle?: boolean;
}

export interface PrivacyCheck {
  pass: boolean;
  detail: string;
  /** Where the problem sits, so only those parts are regenerated. */
  blogSections: number[];
  channels: ChannelId[];
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
  /** No personal data or internal call quotes in any channel; absent on runs made before the check existed. */
  privacy?: PrivacyCheck;
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
  /** Snapshot of the customer question at run time, so re-analyzing VOC later does not rewrite history. */
  vocItem?: VocItem;
  vocMode?: "live" | "sample";
  blog?: Blog;
  cards?: CardNews;
  channels?: Partial<Channels>;
  /** Settings in force when the run started; later changes must not restyle old results. */
  settings?: ProductionSettings;
  /** Set when a person edited the copy after generation. */
  editedAt?: string;
  review?: Review;
  /** Review result of the first draft, kept to show what the auto-fix changed. */
  firstReview?: Review;
  revisions: { round: number; sectionIndexes: number[]; reasons: string[]; channels?: ChannelId[]; title?: boolean }[];
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
