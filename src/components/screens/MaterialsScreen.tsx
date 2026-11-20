"use client";

import { getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { MaterialsManager } from "../MaterialsManager";
import { Loading } from "../ui";

export function MaterialsScreen() {
  const { data, error, reload } = useLoad(getWorkspace);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">자료·가이드라인</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mute">
          여기에 넣어 둔 자료가 매 회차 콘텐츠의 재료가 됩니다. 문서는 차별점 분석에, 화면 캡처는 블로그 본문과 카드뉴스에, 고객 통화 요약은 주제 선정에, 가이드라인은 자동 검수에 쓰입니다.
        </p>
      </div>
      {data ? <MaterialsManager materials={data.ws.materials} guideline={data.ws.guideline} analysis={{ at: data.ws.analyzedAt, mode: data.ws.analysisMode }} voc={data.ws.voc} differentiators={data.ws.differentiators} aiMode={data.modes.ai} onChange={reload} /> : <Loading error={error} />}
    </div>
  );
}
