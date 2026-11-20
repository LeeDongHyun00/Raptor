import type { RunStatus } from "@/lib/types";

export const fmtDate = (iso: string | Date, withTime = false) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(typeof iso === "string" ? new Date(iso) : iso);

export function Panel({ title, action, children, className = "" }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-paper p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  neutral: "bg-cream text-mute border-line",
  good: "bg-forest-soft text-forest border-forest/20",
  warn: "bg-horn-soft text-[#8a5a0b] border-horn/40",
  bad: "bg-bad-soft text-bad border-bad/20",
  solid: "bg-forest text-cream border-forest",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

const statusMap: Record<RunStatus, { label: string; tone: keyof typeof tones }> = {
  running: { label: "생성 중", tone: "warn" },
  pending: { label: "승인 대기", tone: "warn" },
  approved: { label: "승인됨", tone: "good" },
  rejected: { label: "반려됨", tone: "neutral" },
  failed: { label: "실패", tone: "bad" },
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const s = statusMap[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-ink",
  accent: "inline-flex items-center justify-center gap-2 rounded-full bg-horn px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-[#d8922b]",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-forest",
  text: "text-sm font-semibold text-mute underline-offset-4 hover:text-ink hover:underline",
};

export function Loading({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
  ) : (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-40 animate-pulse rounded-3xl bg-forest-soft" />
      <div className="h-24 animate-pulse rounded-2xl bg-paper" />
    </div>
  );
}
