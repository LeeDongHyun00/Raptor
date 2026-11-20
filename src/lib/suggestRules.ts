export interface EditSuggestion {
  /** What to change and why, in one sentence. */
  direction: string;
  /** The selected passage rewritten that way; absent when only advice is available. */
  rewrite?: string;
}

/**
 * Advice without a model, for the keyless demo: generic directions picked from simple
 * properties of the selection. Only "shorter" can offer an actual rewrite.
 */
export function heuristicSuggestions(selection: string): EditSuggestion[] {
  const text = selection.trim();
  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
  const out: EditSuggestion[] = [];
  if (sentences.length > 1) out.push({ direction: "핵심 한 문장만 남겨 더 짧게 줄입니다. 모바일에서는 짧은 문단이 끝까지 읽힙니다.", rewrite: sentences[0] });
  else if (text.length > 60) out.push({ direction: "문장이 깁니다. 두 문장으로 나누고 앞 문장에 결론을 두면 읽기 쉬워집니다." });
  if (!/[?？]/.test(text)) out.push({ direction: "독자가 실제로 할 법한 질문으로 시작하면 스크롤을 멈추게 하고 검색 의도에도 맞습니다." });
  if (!/\d/.test(text)) out.push({ direction: "자료에서 확인되는 구체적인 숫자나 화면 이름을 넣으면 신뢰가 올라갑니다. 근거 없는 수치는 넣지 마세요." });
  out.push({ direction: "기능 설명 대신 독자가 얻는 변화(줄어드는 일, 남는 시간)를 문장 앞에 두세요." });
  return out.slice(0, 3);
}
