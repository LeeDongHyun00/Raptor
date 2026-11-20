import type { NewsItem, TrendItem } from "./types";
import { sampleNews, sampleTrends } from "./demo";

const ID = process.env.NAVER_CLIENT_ID;
const SECRET = process.env.NAVER_CLIENT_SECRET;

export const trendMode: "live" | "sample" = ID && SECRET ? "live" : "sample";

/** Candidate topics watched every cycle; each is a DataLab keyword group. */
export const TREND_KEYWORDS: { groupName: string; keywords: string[] }[] = [
  { groupName: "업무자동화", keywords: ["업무자동화", "업무 자동화", "AI 업무자동화"] },
  { groupName: "AI 통화요약", keywords: ["통화요약", "통화 요약", "음성요약"] },
  { groupName: "콜센터 프로그램", keywords: ["콜센터 프로그램", "콜센터 솔루션", "AICC"] },
  { groupName: "고객관리 프로그램", keywords: ["고객관리 프로그램", "CRM 프로그램", "고객관리"] },
  { groupName: "휴대폰 통화녹음", keywords: ["휴대폰 통화녹음", "휴대폰 녹음", "업무용 통화녹음"] },
  { groupName: "인터넷전화 녹취", keywords: ["인터넷전화 녹취", "인터넷전화", "통화 녹취"] },
  { groupName: "STT 문자변환", keywords: ["STT", "음성 문자변환", "음성인식"] },
  { groupName: "회의록 작성", keywords: ["회의록작성", "회의록 AI", "회의록 자동"] },
  { groupName: "영업사원 관리", keywords: ["영업사원 통화관리", "영업 관리", "영업사원 관리"] },
  { groupName: "경영 대시보드", keywords: ["경영대시보드", "경영 대시보드", "영업 리포트"] },
];

const headers = () => ({
  "X-Naver-Client-Id": ID!,
  "X-Naver-Client-Secret": SECRET!,
  "Content-Type": "application/json",
});

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function fetchDatalab(groups: typeof TREND_KEYWORDS): Promise<TrendItem[]> {
  const end = new Date(Date.now() - 86400000);
  const start = new Date(end.getTime() - 27 * 86400000);
  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), timeUnit: "date", keywordGroups: groups }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`네이버 데이터랩 API 오류 (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { results: { title: string; data: { period: string; ratio: number }[] }[] };
  return json.results.map((r) => {
    const ratios = r.data.map((d) => d.ratio);
    // DataLab ratios are normalized per request, so only compare a keyword with itself:
    // recent 14 days against the 14 days before.
    const recent = avg(ratios.slice(-14));
    const prev = avg(ratios.slice(0, Math.max(ratios.length - 14, 0)));
    const change = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0;
    const series: number[] = [];
    const step = Math.max(Math.floor(ratios.length / 8), 1);
    for (let i = 0; i < ratios.length; i += step) series.push(Math.round(avg(ratios.slice(i, i + step))));
    return { keyword: r.title, change, series };
  });
}

async function fetchNews(keyword: string): Promise<NewsItem[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=4&sort=sim`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`네이버 뉴스 검색 API 오류 (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { items: { title: string; originallink: string; link: string; pubDate: string }[] };
  const clean = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;|&#39;/g, "'");
  return json.items.map((i) => ({ keyword, title: clean(i.title), link: i.originallink || i.link, pubDate: i.pubDate }));
}

export async function collectTrends(): Promise<{ trends: TrendItem[]; news: NewsItem[]; mode: "live" | "sample" }> {
  if (trendMode === "sample") return { trends: sampleTrends, news: sampleNews, mode: "sample" };
  const batches: (typeof TREND_KEYWORDS)[] = [];
  // DataLab accepts at most 5 keyword groups per request.
  for (let i = 0; i < TREND_KEYWORDS.length; i += 5) batches.push(TREND_KEYWORDS.slice(i, i + 5));
  const trends = (await Promise.all(batches.map(fetchDatalab))).flat().sort((a, b) => b.change - a.change);
  const news = (await Promise.all(trends.slice(0, 4).map((t) => fetchNews(t.keyword)))).flat();
  return { trends, news, mode: "live" };
}
