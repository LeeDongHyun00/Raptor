import { NextResponse } from "next/server";
import { aiMode, extractVoc, withViewerKey } from "@/lib/ai";
import { sampleVoc } from "@/lib/demo";
import { extractSummariesXlsx } from "@/lib/docs";
import { getWorkspace, saveWorkspace } from "@/lib/store";
import { maskPII, splitSummaries } from "@/lib/voc";

export const maxDuration = 300;

const MAX_BYTES = 4 * 1024 * 1024;
// Keeps one analysis request to a size the model reads comfortably.
const MAX_CALLS = 300;

/**
 * Call summaries -> customer question board. The raw text is masked first and never
 * stored: only the analysis result (question types, counts, short anonymized quotes) is saved.
 */
export function POST(req: Request) {
  return withViewerKey(req)(() => handle(req));
}

async function handle(req: Request) {
  try {
    let summaries: string[] = [];
    let label = "";
    let sample = false;

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "파일을 확인해 주세요." }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "파일은 4MB 이하만 올릴 수 있습니다." }, { status: 413 });
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const buf = Buffer.from(await file.arrayBuffer());
      if (ext === "xlsx" || ext === "xls") summaries = extractSummariesXlsx(buf);
      else if (ext === "txt" || ext === "csv") summaries = ext === "csv" ? buf.toString("utf8").split(/\r?\n/).filter((l) => l.trim().length >= 5) : splitSummaries(buf.toString("utf8"));
      else return NextResponse.json({ error: "TXT, CSV, XLSX 파일만 올릴 수 있습니다. PDF는 번호를 미리 가릴 수 없어 받지 않습니다." }, { status: 400 });
      label = "파일 업로드";
    } else {
      const body = (await req.json()) as { text?: string; sample?: boolean };
      sample = !!body.sample;
      summaries = splitSummaries(body.text ?? "");
      label = "통화 요약 붙여넣기";
    }

    const ws = await getWorkspace();
    if (sample || aiMode() === "demo") {
      // No API key: store the fictional sample analysis, clearly labelled as such.
      ws.voc = sampleVoc;
    } else {
      if (summaries.length === 0) return NextResponse.json({ error: "분석할 통화 요약이 없습니다. 통화마다 빈 줄로 구분해 붙여 넣어 주세요." }, { status: 400 });
      const masked = summaries.slice(0, MAX_CALLS).map(maskPII);
      ws.voc = await extractVoc(ws, masked, `${label} · ${masked.length}건`);
    }
    const fresh = await getWorkspace();
    fresh.voc = ws.voc;
    await saveWorkspace(fresh);
    return NextResponse.json({ voc: fresh.voc });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "분석에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE() {
  const ws = await getWorkspace();
  delete ws.voc;
  await saveWorkspace(ws);
  return NextResponse.json({ ok: true });
}
