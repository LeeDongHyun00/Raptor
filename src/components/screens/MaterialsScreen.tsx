"use client";

import { getWorkspace } from "@/lib/client/api";
import { useLoad } from "@/lib/client/useLoad";
import { MaterialsManager } from "../MaterialsManager";
import { Loading, PageHeader } from "../ui";

export function MaterialsScreen() {
  const { data, error, reload } = useLoad(getWorkspace);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materials"
        title="넣어 둔 자료가, 매 회차 콘텐츠가 됩니다"
        sub="문서는 차별점 분석에, 화면 캡처는 블로그와 카드뉴스에, 고객 통화 요약은 주제 선정에, 가이드라인은 자동 검수에 쓰입니다."
      />
      {data ? <MaterialsManager materials={data.ws.materials} guideline={data.ws.guideline} analysis={{ at: data.ws.analyzedAt, mode: data.ws.analysisMode }} voc={data.ws.voc} differentiators={data.ws.differentiators} aiMode={data.modes.ai} onChange={reload} /> : <Loading error={error} />}
    </div>
  );
}
