import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { Nav, RecentRuns } from "@/components/Nav";
import { ApiKeyControl } from "@/components/ApiKeyControl";

const pretendard = localFont({
  src: "../assets/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raptor",
  description: "제품 자료와 화면 캡처만 넣어 두면 차별점 분석, 트렌드 연결, 6개 광고 채널 소재 제작까지 격주로 자동 진행합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full font-sans lg:flex">
        {/* Navigation sits in a left rail on wide screens and collapses to a top bar on small ones. */}
        <aside className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 border-b border-line bg-surface px-4 lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-4">
          <Link href="/" className="flex items-center gap-2.5 py-3 lg:px-2 lg:pb-5 lg:pt-1" aria-label="Raptor 대시보드">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">Raptor</span>
          </Link>
          <div className="order-2 ml-auto lg:order-3 lg:ml-0 lg:border-t lg:border-line lg:pt-3">
            <ApiKeyControl />
          </div>
          <div className="order-3 w-full min-w-0 lg:order-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <Nav />
            <RecentRuns />
          </div>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
          <footer className="bg-night text-canvas/70">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
              <span className="flex items-center gap-2 font-bold text-canvas">
                <Logo inverted />
                Raptor
              </span>
              <span>생성된 콘텐츠는 담당자 승인 후 직접 업로드합니다</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

/** Three marks for the three jobs: analyze, connect to trends, produce. */
function Logo({ inverted = false }: { inverted?: boolean }) {
  const base = inverted ? "#ffffff" : "#1648a8";
  const mark = inverted ? "#0c1626" : "#ffffff";
  return (
    <svg width={inverted ? 22 : 28} height={inverted ? 22 : 28} viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="7" fill={base} />
      <path d="M6 23 L9 9 L12.5 23 Z" fill={mark} />
      <path d="M12 23 L15 5 L18 23 Z" fill="#ffb320" />
      <path d="M17.5 23 L21 9 L24 23 Z" fill={mark} />
    </svg>
  );
}
