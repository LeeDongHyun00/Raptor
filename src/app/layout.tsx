import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";

const pretendard = localFont({
  src: "../assets/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "트라이혼 · 격주 콘텐츠 오토파일럿",
  description: "제품 자료와 화면 캡처만 넣어 두면 차별점 분석, 트렌드 연결, 블로그 글과 카드뉴스 제작까지 격주로 자동 진행합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-extrabold tracking-tight">트라이혼</span>
              <span className="hidden text-xs text-mute sm:inline">격주 콘텐츠 오토파일럿</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-mute sm:px-6">
          A-06 트리케라톱스 · 생성된 콘텐츠는 담당자 승인 후 직접 업로드합니다.
        </footer>
      </body>
    </html>
  );
}

/** Three horns: analyze, connect to trends, produce. */
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="#1f4d3a" />
      <path d="M6 23 L9 9 L12.5 23 Z" fill="#f6f1e7" />
      <path d="M12 23 L15 5 L18 23 Z" fill="#e8a33d" />
      <path d="M17.5 23 L21 9 L24 23 Z" fill="#f6f1e7" />
    </svg>
  );
}
