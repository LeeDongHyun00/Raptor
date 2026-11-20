"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRun, getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { adDisclosure, AD_HASHTAG, emailFooter } from "@/lib/review";
import { RunView } from "../RunView";
import { Loading, btn } from "../ui";

export function RunScreen() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error } = useLoad(async () => {
    const [run, { ws }] = await Promise.all([getRun(id), getWorkspace()]);
    return { run, ws };
  });
  if (error) return <Loading error={error} />;
  if (!data) return <Loading />;
  if (!data.run) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold">이 회차를 찾을 수 없습니다</p>
        <p className="mt-2 text-sm text-mute">이력이 초기화되었거나 주소가 잘못되었습니다.</p>
        <Link href="/" className={`${btn.primary} mt-6`}>대시보드로</Link>
      </div>
    );
  }
  return (
    <RunView
      initial={data.run}
      disclosure={adDisclosure(data.ws)}
      adHashtag={AD_HASHTAG}
      emailFooter={emailFooter(data.ws)}
      differentiators={data.ws.differentiators.map((d) => ({ id: d.id, title: d.title }))}
    />
  );
}
