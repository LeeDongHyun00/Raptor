"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearRuns, startRun } from "@/lib/client/api";
import { btn } from "./ui";

/**
 * Run controls: the main button generates with whatever AI is available, and the demo
 * button under it always uses the prepared copy, so the flow can be tried without an API key.
 */
export function RunNowButton({ label = "지금 실행", withDemo = false }: { label?: string; withDemo?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"run" | "demo" | null>(null);
  const [error, setError] = useState("");

  async function start(demo: boolean) {
    setBusy(demo ? "demo" : "run");
    setError("");
    try {
      router.push(`/run?id=${await startRun(demo)}`);
    } catch {
      setError("실행을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button className={btn.accent} disabled={!!busy} onClick={() => start(false)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor" /></svg>
        {busy === "run" ? "시작하는 중…" : label}
      </button>
      {withDemo && (
        <button className={btn.ghost} disabled={!!busy} onClick={() => start(true)}>
          {busy === "demo" ? "시작하는 중…" : "API 키 없이 데모 시작"}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}

export function ResetHistoryButton({ onDone }: { onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <button className={btn.text} onClick={() => setConfirming(true)}>이력 초기화</button>;
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-mute">생성 이력과 다룬 주제를 모두 지울까요?</span>
      <button
        className="font-bold text-bad hover:underline"
        onClick={async () => {
          await clearRuns().catch(() => undefined);
          setConfirming(false);
          onDone();
        }}
      >
        지우기
      </button>
      <button className={btn.text} onClick={() => setConfirming(false)}>취소</button>
    </span>
  );
}
