"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "./ui";

export function RunNowButton({ label = "지금 실행" }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        className={btn.accent}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/runs", { method: "POST" });
            if (!res.ok) throw new Error();
            const { id } = await res.json();
            router.push(`/runs/${id}`);
          } catch {
            setError("실행을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
            setBusy(false);
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor" /></svg>
        {busy ? "시작하는 중…" : label}
      </button>
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}

export function ResetHistoryButton() {
  const router = useRouter();
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
          await fetch("/api/runs", { method: "DELETE" });
          setConfirming(false);
          router.refresh();
        }}
      >
        지우기
      </button>
      <button className={btn.text} onClick={() => setConfirming(false)}>취소</button>
    </span>
  );
}
