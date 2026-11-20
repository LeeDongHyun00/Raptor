"use client";

import { useState } from "react";
import { analyze } from "@/lib/client/api";
import { btn } from "./ui";

export function AnalyzeButton({ canAnalyze, onDone }: { canAnalyze: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        className={btn.primary}
        disabled={busy || !canAnalyze}
        title={canAnalyze ? undefined : "실제 문서와 API 키가 있어야 분석할 수 있습니다"}
        onClick={async () => {
          setBusy(true);
          setError("");
          await analyze().catch((e) => setError(e instanceof Error ? e.message : "분석에 실패했습니다."));
          setBusy(false);
          onDone();
        }}
      >
        {busy ? "문서를 읽는 중… (1~2분)" : "다시 분석"}
      </button>
      {error && <p role="alert" className="max-w-xs text-right text-xs text-bad">{error}</p>}
    </div>
  );
}
