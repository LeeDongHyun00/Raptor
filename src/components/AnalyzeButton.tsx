"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "./ui";

export function AnalyzeButton({ canAnalyze }: { canAnalyze: boolean }) {
  const router = useRouter();
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
          const res = await fetch("/api/analyze", { method: "POST" });
          if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "분석에 실패했습니다.");
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? "문서를 읽는 중… (1~2분)" : "다시 분석"}
      </button>
      {error && <p role="alert" className="max-w-xs text-right text-xs text-bad">{error}</p>}
    </div>
  );
}
