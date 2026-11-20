"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "대시보드" },
  { href: "/materials", label: "자료·가이드라인" },
  { href: "/insights", label: "차별점 분석" },
  { href: "/studio", label: "홍보 스튜디오" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 text-sm font-semibold">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" || path.startsWith("/run") : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${active ? "bg-forest text-cream" : "text-mute hover:bg-forest-soft hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
