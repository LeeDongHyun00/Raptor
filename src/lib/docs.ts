import * as XLSX from "xlsx";
import type { Guideline } from "./types";

export { extractPptxText } from "./pptx";

const splitList = (s: string) => s.split(/[,\n;·]/).map((x) => x.trim()).filter(Boolean);

/** "1. foo\n\n2. bar" -> ["foo", "bar"], keeping multi-line items together. */
const numbered = (s: string) =>
  s.split(/(?:^|\n)\s*\d+\.\s+/).map((x) => x.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);

/**
 * Reads a guideline sheet. Two layouts are understood:
 * - the company sheet: rows labelled 필수 / 강조내용 / 추천 본문 구성 with numbered text in the next cell
 * - a simple "구분 | 내용 | (횟수)" table with 키워드 / 미션 / 구성 / 글자수 labels
 */
export function parseGuidelineXlsx(buf: Buffer, source: string): Guideline {
  const wb = XLSX.read(buf, { type: "buffer" });
  const g: Guideline = { source, requiredKeywords: [], missions: [], structure: [], minChars: 0 };
  let titleRule = false;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, blankrows: false });
    let label = "";
    for (const row of rows) {
      const cells = row.map((c) => (c == null ? "" : String(c).trim())).filter(Boolean);
      if (cells.length === 0) continue;
      if (cells.some((c) => /필수\s*키워드.*제목/.test(c))) titleRule = true;
      const [head, ...rest] = cells;

      // Company layout
      if (head === "필수" && rest.length) {
        for (const kw of splitList(rest.join(","))) g.requiredKeywords.push({ keyword: kw, minCount: 1 });
        continue;
      }
      if (head === "강조내용" && rest.length) {
        const text = rest.join("\n");
        // A trailing unnumbered paragraph (e.g. "리뷰 하단에는 ...") is its own mission.
        const [list, ...tail] = text.split(/\n\s*\n(?=[^\d\s])/);
        g.missions.push(...numbered(list), ...tail.map((t) => t.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean));
        continue;
      }
      if (/추천\s*본문\s*구성/.test(head) && rest.length) {
        g.structure.push(...[...rest.join("\n").matchAll(/(?:^|\n)\s*\d+\.\s*([^\n]+)/g)].map((m) => m[1].trim()));
        continue;
      }

      // Simple table layout; merged label cells leave the first column empty on following rows.
      const raw = row.map((c) => (c == null ? "" : String(c).trim()));
      if (raw[0]) label = raw[0];
      const vals = raw.slice(1).filter(Boolean);
      if (vals.length === 0) continue;
      if (/^키워드/.test(label)) {
        const count = Number(vals.find((c) => /^\d+$/.test(c))) || 1;
        for (const kw of splitList(vals.filter((c) => !/^\d+$/.test(c)).join(","))) {
          if (!/^(내용|키워드)$/.test(kw)) g.requiredKeywords.push({ keyword: kw, minCount: count });
        }
      } else if (/^미션/.test(label)) {
        if (vals[0] !== "내용") g.missions.push(vals[0]);
      } else if (/^(구성|순서|목차)/.test(label)) {
        g.structure.push(...splitList(vals.join(",").replace(/→|->|>/g, ",")));
      } else if (/^(글자|분량)/.test(label)) {
        const n = Number(vals.join(" ").replace(/,/g, "").match(/\d+/)?.[0]);
        if (n) g.minChars = n;
      }
    }
  }
  if (titleRule && g.requiredKeywords.length) {
    g.missions.unshift(`제목에 필수 키워드(${g.requiredKeywords.map((k) => k.keyword).join(", ")})를 포함한다`);
  }
  if (g.requiredKeywords.length === 0 && g.missions.length === 0) {
    throw new Error("가이드라인을 읽지 못했습니다. ‘필수’(키워드)와 ‘강조내용’(미션) 행이 있는 가이드라인 시트이거나, 첫 열에 ‘키워드’, ‘미션’, ‘구성’, ‘글자수’ 구분을 적은 표여야 합니다.");
  }
  return g;
}
