import type { Blog, BlogSection, CardNews, ChannelId, Channels, Guideline, VocItem, Material, MissionCheck, NewsItem, Plan, Run, TrendItem, Workspace } from "./types";
import { CHANNEL_LABEL, buildReview, channelProblems, collectProblems } from "./review";
import { OUTPUTS, resolveSettings } from "./settings";

/**
 * Environment-independent pipeline: the server wires it to Claude, Naver and the
 * store; the static GitHub Pages demo wires it to sample responses and localStorage.
 */

export const STEPS = ["트렌드·고객 질문 수집", "주제 선정", "콘텐츠 생성", "자동 검수", "보완", "승인 대기"] as const;
export const INTERVAL_DAYS = 14;
const MAX_FIX_ROUNDS = 2;

export interface PipelineDeps {
  getWorkspace(): Promise<Workspace>;
  saveWorkspace(ws: Workspace): Promise<void>;
  getRuns(): Promise<Run[]>;
  updateRun(id: string, mutate: (run: Run) => void): Promise<Run>;
  collectTrends(): Promise<{ trends: TrendItem[]; news: NewsItem[]; mode: "live" | "sample" }>;
  describeScreenshots(ws: Workspace, shots: Material[]): Promise<Record<string, string>>;
  planTopic(args: {
    ws: Workspace; trends: TrendItem[]; news: NewsItem[]; usedTopics: string[];
    /** Customer questions still open for planning, and the ids earlier runs already answered. */
    voc: VocItem[]; usedVocIds: string[];
  }): Promise<Plan>;
  writeBlog(ws: Workspace, plan: Plan, shots: Material[]): Promise<Blog>;
  writeCards(ws: Workspace, plan: Plan, shots: Material[]): Promise<CardNews>;
  /** Writes the given channels (all four when `only` is omitted); `notes` carry review failures to fix. */
  writeChannels(args: {
    ws: Workspace; plan: Plan; only?: ChannelId[]; notes?: Partial<Record<ChannelId, string[]>>;
  }): Promise<Partial<Channels>>;
  reviewMissions(guideline: Guideline, blog: Blog): Promise<MissionCheck[]>;
  reviseBlog(args: {
    ws: Workspace; plan: Plan; blog: Blog; shots: Material[]; reasons: string[]; sectionIndexes: number[];
    /** Set when a failed rule concerns the title, which section rewrites cannot reach. */
    fixTitle?: boolean;
  }): Promise<{ title?: string; sections: { index: number; section: BlogSection }[] }>;
  /** Pause after each step; lets the instant sample pipeline show its progress. */
  stepDelayMs?: number;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newRun(trigger: Run["trigger"], aiMode: Run["aiMode"], trendMode: Run["trendMode"]): Run {
  return {
    id: newId("run"),
    createdAt: new Date().toISOString(),
    trigger,
    status: "running",
    step: STEPS[0],
    logs: [],
    aiMode,
    trendMode,
    trends: [],
    news: [],
    revisions: [],
  };
}

/** Runs the whole biweekly cycle for one run and leaves it in the approval queue. */
export async function runPipeline(runId: string, deps: PipelineDeps): Promise<void> {
  const log = async (step: string, message: string, patch?: (r: Run) => void) => {
    if (deps.stepDelayMs) await new Promise((r) => setTimeout(r, deps.stepDelayMs));
    await deps.updateRun(runId, (r) => {
      r.step = step;
      r.logs.push({ at: new Date().toISOString(), step, message });
      patch?.(r);
    });
  };

  try {
    const ws = await deps.getWorkspace();
    if (ws.differentiators.length === 0) throw new Error("차별점 분석 결과가 없습니다. 먼저 자료를 올리고 차별점을 분석해 주세요.");

    // 1. Trends
    const { trends, news, mode } = await deps.collectTrends();
    const voc = ws.voc?.items ?? [];
    const trendNote = mode === "live"
      ? `네이버 데이터랩에서 키워드 ${trends.length}개, 뉴스 ${news.length}건`
      : `샘플 트렌드 ${trends.length}개`;
    await log(STEPS[0], voc.length
      ? `${trendNote}와 고객 질문 ${voc.length}개를 불러왔습니다${mode === "live" ? "" : "(네이버 API 키 미설정)"}.`
      : mode === "live" ? `${trendNote}을 모았습니다.` : `${trendNote}를 불러왔습니다(네이버 API 키 미설정).`,
      (r) => { r.trends = trends; r.news = news; r.trendMode = mode; });

    // 2. Topic — never repeat a topic or a customer question that already went through the queue.
    const earlier = (await deps.getRuns()).filter((r) => r.id !== runId && r.plan && r.status !== "failed");
    const usedTopics = earlier.map((r) => r.plan!.topic);
    const usedVocIds = earlier.map((r) => r.plan!.vocId).filter((id): id is string => !!id);
    const plan = await deps.planTopic({ ws, trends, news, usedTopics, voc, usedVocIds });
    const vocItem = voc.find((v) => v.id === plan.vocId);
    await log(STEPS[1], vocItem
      ? `고객 질문 ‘${vocItem.question}’과 ‘${plan.trendKeyword}’ 트렌드를 연결해 주제를 정했습니다: ${plan.topic}`
      : `‘${plan.trendKeyword}’ 트렌드와 연결해 주제를 정했습니다: ${plan.topic}`,
      (r) => { r.plan = plan; r.vocItem = vocItem; r.vocMode = vocItem ? ws.voc?.mode : undefined; });
    // Internal quotes behind the plan must never surface in public copy.
    const quotes = vocItem?.quotes ?? [];

    // 3. One plan -> every selected channel together
    let shots = ws.materials.filter((m) => m.kind === "screenshot");
    const described = await deps.describeScreenshots(ws, shots);
    if (Object.keys(described).length) {
      shots = shots.map((s) => (described[s.id] ? { ...s, description: described[s.id] } : s));
      // Cache the vision result so later runs do not re-analyze the same images.
      const fresh = await deps.getWorkspace();
      fresh.materials = fresh.materials.map((m) => (described[m.id] ? { ...m, description: described[m.id] } : m));
      await deps.saveWorkspace(fresh);
    }
    // Only the outputs switched on in the production settings are made and reviewed.
    const settings = resolveSettings(ws.settings);
    const on = settings.outputs;
    const channelIds = (["email", "kakao", "shorts", "searchAds"] as const).filter((id) => on[id]);
    const [draft, cards, firstChannels] = await Promise.all([
      on.blog ? deps.writeBlog(ws, plan, shots) : undefined,
      on.instagram ? deps.writeCards(ws, plan, shots) : undefined,
      channelIds.length ? deps.writeChannels({ ws, plan, only: [...channelIds] }) : ({} as Partial<Channels>),
    ]);
    let blog = draft;
    // Writers may return more than was asked for (the prepared demo copy does); keep the chosen ones.
    let channels: Partial<Channels> = Object.fromEntries(channelIds.filter((id) => firstChannels[id]).map((id) => [id, firstChannels[id]]));
    const made = OUTPUTS.filter((o) => on[o.id]).map((o) => o.label);
    await log(STEPS[2], `하나의 기획으로 ${made.length}개 채널 소재를 만들었습니다: ${made.join(", ")}.`, (r) => {
      r.blog = blog; r.cards = cards; r.channels = channels; r.settings = settings;
    });

    // 4. Review: keywords in code, missions by AI
    const missionsOf = async (b: Blog | undefined) => (b ? deps.reviewMissions(ws.guideline, b) : []);
    let review = buildReview(ws.guideline, blog, cards, await missionsOf(blog), channels, quotes);
    const firstReview = review;
    await log(STEPS[3], `가이드라인 ${review.total}개 항목 중 ${review.passed}개를 충족했습니다.`, (r) => { r.review = review; r.firstReview = firstReview; });

    // 5. Fix only what failed — first the channels that broke a format rule, then blog sections
    const notes = channelProblems(review);
    const failedChannels = Object.keys(notes) as ChannelId[];
    if (failedChannels.length) {
      const redo = await deps.writeChannels({ ws, plan, only: failedChannels, notes });
      channels = { ...channels, ...Object.fromEntries(failedChannels.filter((id) => redo[id]).map((id) => [id, redo[id]])) };
      const missions = review.missionChecks;
      review = buildReview(ws.guideline, blog, cards, missions, channels, quotes);
      await log(STEPS[4], `형식 규칙을 지키지 못한 ${failedChannels.map((c) => CHANNEL_LABEL[c]).join(", ")}만 다시 만들었습니다. 재검수 결과 ${review.passed}/${review.total}.`, (r) => {
        r.channels = channels; r.review = review;
        r.revisions.push({ round: 0, sectionIndexes: [], reasons: Object.values(notes).flat(), channels: failedChannels });
      });
    }
    for (let round = 1; blog && round <= MAX_FIX_ROUNDS && review.passed < review.total; round++) {
      const current: Blog = blog;
      const { reasons, sectionIndexes, fixTitle } = collectProblems(review, current);
      if (sectionIndexes.length === 0 && !fixTitle) break;
      const fix = await deps.reviseBlog({ ws, plan, blog: current, shots, reasons, sectionIndexes, fixTitle });
      if (fix.sections.length === 0 && !fix.title) break;
      const sections = [...current.sections];
      for (const f of fix.sections) sections[f.index] = f.section;
      const next: Blog = { ...current, title: fix.title ?? current.title, sections };
      blog = next;
      review = buildReview(ws.guideline, next, cards, await missionsOf(next), channels, quotes);
      const applied = fix.sections.map((f) => f.index);
      const what = [fix.title ? "제목" : "", applied.length ? `섹션 ${applied.map((i) => i + 1).join(", ")}번` : ""].filter(Boolean).join("과 ");
      await log(STEPS[4], `미충족 ${reasons.length}건을 해결하도록 ${what}만 다시 썼습니다. 재검수 결과 ${review.passed}/${review.total}.`, (r) => {
        r.blog = next; r.review = review; r.revisions.push({ round, sectionIndexes: applied, reasons, title: !!fix.title });
      });
    }

    await log(STEPS[5], review.passed === review.total
      ? "모든 항목을 충족했습니다. 담당자 승인을 기다립니다."
      : `${review.total - review.passed}개 항목이 남아 있습니다. 담당자 확인이 필요합니다.`, (r) => { r.status = "pending"; });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await deps.updateRun(runId, (r) => { r.status = "failed"; r.error = message; });
  }
}

/** Next scheduled run: 14 days after the most recent non-failed run. */
export function nextRunAt(runs: Run[]): Date | null {
  const last = runs.find((r) => r.status !== "failed");
  return last ? new Date(new Date(last.createdAt).getTime() + INTERVAL_DAYS * 86400000) : null;
}
