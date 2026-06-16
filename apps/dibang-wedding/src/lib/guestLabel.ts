/** side/slot 코드 → 한글 레이블 */
export const SIDE_LABEL: Record<string, string> = {
  groom: '신랑',
  bride: '신부',
  groom_father: '신랑 아버지',
  groom_mother: '신랑 어머니',
  bride_father: '신부 아버지',
  bride_mother: '신부 어머니',
};

/**
 * 한글 이름 가운데 마스킹.
 *  - 1글자: 그대로
 *  - 2글자: 첫 글자 + '*'   (김철 → 김*)
 *  - 3글자 이상: 첫·끝 글자만 남기고 가운데 전부 '*'  (홍길동 → 홍*동, 남궁민수 → 남**수)
 * 두 글자 성(남궁·제갈 등)도 성씨 사전 없이 안전하게 가운데만 가린다.
 */
export function maskName(name: string): string {
  const n = name.trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + '*';
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
}

/**
 * 라운지 표시용 이름 마스킹 — 호스트(신랑·신부·양가 혼주) 이름은 실명, 그 외 하객은 마스킹.
 * @param hostNames 실명 노출할 호스트 이름 집합
 */
export function maskGuestName(name: string, hostNames: Set<string>): string {
  return hostNames.has(name.trim()) ? name : maskName(name);
}

/**
 * 게스트의 역할 접두어를 한글로 조합
 *
 * 예시:
 *  - ("groom", "친구/지인", "고등학교동창") → "신랑의 친구/지인 고등학교동창"
 *  - ("groom_father", "가족/친척", "형")   → "신랑 아버지의 가족/친척 형"
 *  - ("bride", undefined, undefined)        → "신부"
 */
export function formatGuestPrefix(
  recipientSlot?: string,
  relationCategory?: string,
  relationDetail?: string,
): string {
  const slotLabel = recipientSlot ? (SIDE_LABEL[recipientSlot] ?? recipientSlot) : '';

  if (!slotLabel && !relationCategory) return '';

  let prefix: string;
  if (slotLabel && relationCategory) {
    prefix = `${slotLabel}의 ${relationCategory}`;
  } else if (slotLabel) {
    prefix = slotLabel;
  } else {
    prefix = relationCategory!;
  }

  if (relationDetail) {
    prefix += ` ${relationDetail}`;
  }

  return prefix;
}
