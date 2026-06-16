// TODO: 성/이름을 DB·API 레벨에서 분리하면 이 유틸 삭제 가능
// 한국 이름에서 성(姓)을 떼어 이름만 남기는 유틸.
// 청첩장 "...의 아들 OOO" 표기에서 자녀 이름을 성 없이 보여주기 위함(QA 2026-05-29).

// 두 글자 복성(複姓) 목록. 한 글자만 떼면 복성이 잘리므로 우선 매칭한다.
// 통계청 등록 복성 기준 주요 성씨.
const COMPOUND_SURNAMES = [
  '남궁', '황보', '제갈', '사공', '선우', '서문', '독고', '동방',
  '망절', '어금', '장곡', '소봉', '강전',
] as const;

/**
 * 이름에서 성을 제거해 이름만 반환한다.
 *  - 복성(두 글자)으로 시작하면 두 글자 제거: "남궁민수" → "민수"
 *  - 그 외에는 한 글자(성) 제거: "김신랑" → "신랑"
 *  - 한 글자 이름은 그대로 둔다.
 */
export function stripSurname(fullName: string): string {
  const n = (fullName ?? '').trim();
  if (n.length <= 2) return n;
  for (const s of COMPOUND_SURNAMES) {
    if (n.startsWith(s) && n.length > s.length) return n.slice(s.length);
  }
  return n.slice(1);
}
