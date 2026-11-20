import type { RunStatus } from "@/lib/types";

export const fmtDate = (iso: string | Date, withTime = false) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(typeof iso === "string" ? new Date(iso) : iso);

/** Page opener in the guide's three-part pattern: English label, headline, one short subhead. */
export function PageHeader({ eyebrow, title, sub, action }: {
  eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-snug tracking-tight text-balance sm:text-3xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, eyebrow, action, children, className = "" }: {
  title?: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            {eyebrow && <p className="eyebrow mb-1 text-mute">{eyebrow}</p>}
            {title && <h2 className="text-base font-bold">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  neutral: "bg-canvas text-mute border-line",
  good: "bg-ok-soft text-ok border-ok/20",
  warn: "bg-accent-soft text-warn border-accent/40",
  bad: "bg-bad-soft text-bad border-bad/20",
  solid: "bg-ink text-surface border-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
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
  primary: "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-surface transition-colors hover:bg-ink",
  accent: "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-accent-strong",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand",
  text: "text-sm font-semibold text-mute underline-offset-4 hover:text-ink hover:underline",
};

export function Loading({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
  ) : (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-40 animate-pulse rounded-xl bg-brand-soft" />
      <div className="h-24 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
