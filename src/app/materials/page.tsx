import { getWorkspace } from "@/lib/store";
import { MaterialsManager } from "@/components/MaterialsManager";

export const dynamic = "force-dynamic";

export default async function Materials() {
  const ws = await getWorkspace();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">자료·가이드라인</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mute">
          여기에 넣어 둔 자료가 매 회차 콘텐츠의 재료가 됩니다. 문서는 차별점 분석에, 화면 캡처는 블로그 본문과 카드뉴스에, 가이드라인은 자동 검수에 쓰입니다.
        </p>
      </div>
      <MaterialsManager materials={ws.materials} guideline={ws.guideline} />
    </div>
  );
}
