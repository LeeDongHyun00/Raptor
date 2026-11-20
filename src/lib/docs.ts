import JSZip from "jszip";
import * as XLSX from "xlsx";
import type { Guideline } from "./types";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Pulls slide text out of a PPTX, keeping slide numbers so evidence can cite pages. */
export async function extractPptxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .map((name) => ({ name, n: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(name)?.[1]) }))
    .filter((s) => !Number.isNaN(s.n))
    .sort((a, b) => a.n - b.n);
  const out: string[] = [];
  for (const s of slides) {
    const xml = await zip.file(s.name)!.async("string");
    // Paragraph boundaries become line breaks; runs within a paragraph are joined.
    const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).join("")).filter((t) => t.trim());
    out.push(`[페이지 ${s.n}]\n${paras.join("\n")}`);
  }
  return out.join("\n\n");
}

const splitList = (s: string) => s.split(/[,\n;·]/).map((x) => x.trim()).filter(Boolean);

/**
 * Reads a guideline sheet laid out as "구분 | 내용 | (횟수)" rows.
 * Rows are classified by the label in the first column: 키워드 / 미션 / 구성 / 글자수.
 */
export function parseGuidelineXlsx(buf: Buffer, source: string): Guideline {
  const wb = XLSX.read(buf, { type: "buffer" });
  const g: Guideline = { source, requiredKeywords: [], missions: [], structure: [], minChars: 0 };
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, blankrows: false });
    let label = "";
    for (const row of rows) {
      const cells = row.map((c) => (c == null ? "" : String(c).trim()));
      // Merged label cells leave the first column empty on following rows.
      if (cells[0]) label = cells[0];
      const rest = cells.slice(1).filter(Boolean);
      if (rest.length === 0) continue;
      if (/키워드/.test(label)) {
        const count = Number(rest.find((c) => /^\d+$/.test(c))) || 1;
        for (const kw of splitList(rest.filter((c) => !/^\d+$/.test(c)).join(","))) {
          if (!/^(내용|키워드)$/.test(kw)) g.requiredKeywords.push({ keyword: kw, minCount: count });
        }
      } else if (/미션/.test(label)) {
        if (rest[0] !== "내용") g.missions.push(rest[0]);
      } else if (/구성|순서|목차/.test(label)) {
        g.structure.push(...splitList(rest.join(",").replace(/→|->|>/g, ",")));
      } else if (/글자|분량/.test(label)) {
        const n = Number(rest.join(" ").replace(/,/g, "").match(/\d+/)?.[0]);
        if (n) g.minChars = n;
      }
    }
  }
  if (g.requiredKeywords.length === 0 && g.missions.length === 0) {
    throw new Error("가이드라인을 읽지 못했습니다. 첫 열에 ‘키워드’, ‘미션’, ‘구성’, ‘글자수’ 구분을 적고 둘째 열에 내용을 적어 주세요.");
  }
  return g;
}
