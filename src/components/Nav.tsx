"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Run } from "@/lib/types";
import { getRuns } from "@/lib/client/api";

const items = [
  { href: "/", label: "대시보드", icon: "M3 11.5 10 5l7 6.5V17h-4.5v-4h-5v4H3z" },
  { href: "/materials", label: "자료·가이드라인", icon: "M4 4h8l4 4v8a1 1 0 0 1-1 1H4zM12 4v4h4" },
  { href: "/insights", label: "차별점 분석", icon: "M4 16V9m4 7V4m4 12v-5m4 5V7" },
  { href: "/studio", label: "홍보 스튜디오", icon: "M4 15.5 12.5 7l2.5 2.5L6.5 18H4zM11 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="주 메뉴" className="-mx-1 flex gap-1 overflow-x-auto text-sm font-semibold lg:mx-0 lg:flex-col lg:overflow-visible">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" || path.startsWith("/run") : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 whitespace-nowrap border-b-2 px-2.5 py-3 transition-colors lg:rounded-lg lg:border-b-0 lg:px-3 lg:py-2.5 ${
              active ? "border-brand text-ink lg:bg-brand-soft lg:text-brand" : "border-transparent text-mute hover:text-ink lg:hover:bg-canvas"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hidden shrink-0 lg:block">
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

const DOT: Record<Run["status"], string> = { running: "bg-accent", pending: "bg-accent", approved: "bg-ok", rejected: "bg-line", failed: "bg-bad" };
const STATUS: Record<Run["status"], string> = { running: "생성 중", pending: "승인 대기", approved: "승인됨", rejected: "반려됨", failed: "실패" };

/** Latest runs in the side rail, like a conversation list; wide screens only. */
export function RecentRuns() {
  // useSearchParams needs a Suspense boundary for the page shell to prerender.
  return (
    <Suspense fallback={null}>
      <RecentRunsList />
    </Suspense>
  );
}

function RecentRunsList() {
  const path = usePathname();
  const current = useSearchParams().get("id");
  const [runs, setRuns] = useState<Run[]>([]);
  // Refreshed on navigation, which is when a new run appears or changes state.
  useEffect(() => {
    let alive = true;
    getRuns().then((r) => { if (alive) setRuns(r.slice(0, 6)); }).catch(() => undefined);
    return () => { alive = false; };
  }, [path, current]);
  if (runs.length === 0) return null;
  return (
    <div className="mt-6 hidden min-h-0 flex-1 flex-col lg:flex">
      <p className="eyebrow px-3 text-mute">최근 회차</p>
      <ul className="mt-2 space-y-0.5 overflow-y-auto">
        {runs.map((r) => (
          <li key={r.id}>
            <Link href={`/run?id=${r.id}`} aria-current={current === r.id ? "page" : undefined}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug transition-colors ${current === r.id ? "bg-canvas text-ink" : "text-mute hover:bg-canvas hover:text-ink"}`}>
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[r.status]}`} aria-hidden="true" />
              <span className="line-clamp-2 min-w-0">
                <span className="sr-only">{STATUS[r.status]}: </span>
                {r.plan?.customerQuestion ?? r.plan?.topic ?? (r.status === "failed" ? "생성 실패" : "생성 중…")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
