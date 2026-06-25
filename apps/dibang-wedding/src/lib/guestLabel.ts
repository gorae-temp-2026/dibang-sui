// side/slot·관계 코드 → 표시 레이블. 비-React 유틸이라 useT 대신 translate(현재 lang)로 로케일 인식.
import { translate, useLangStore } from './i18n';

const lang = () => useLangStore.getState().lang;

const KNOWN_SLOTS = new Set([
  'groom', 'bride', 'groom_father', 'groom_mother', 'bride_father', 'bride_mother',
]);

/** side/slot 코드 → 레이블(현재 언어). 미지의 slot은 원값 그대로(기존 `SIDE_LABEL[x] ?? x` 의미 보존). */
export function sideLabel(slot?: string): string {
  if (!slot) return '';
  return KNOWN_SLOTS.has(slot) ? translate(lang(), `loungeCheckIn.recipient.${slot}`) : slot;
}

// relation_category 값(백엔드 한국어 enum) → i18n 키. LoungeCheckIn과 공유.
const RELATION_LABEL_KEY: Record<string, string> = {
  '가족/친척': 'loungeCheckIn.relation.family',
  '친구/지인': 'loungeCheckIn.relation.friend',
  '동문/동창': 'loungeCheckIn.relation.alumni',
  '직장동료': 'loungeCheckIn.relation.coworker',
  '스승/제자': 'loungeCheckIn.relation.mentor',
  '기타모임': 'loungeCheckIn.relation.other',
};
export function relationLabel(category?: string): string {
  if (!category) return '';
  return RELATION_LABEL_KEY[category] ? translate(lang(), RELATION_LABEL_KEY[category]) : category;
}

/**
 * 이름 가운데 마스킹(언어 무관 — 글자 단위).
 *  - 1글자: 그대로 / 2글자: 첫 글자 + '*' / 3글자 이상: 첫·끝만 남기고 가운데 '*'
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
 * 게스트의 역할 접두어를 현재 언어로 조합.
 *
 * 예시(en):
 *  - ("groom", "친구/지인", "high-school")  → "Groom's Friends high-school"
 *  - ("bride", undefined, undefined)        → "Bride"
 */
export function formatGuestPrefix(
  recipientSlot?: string,
  relationCategory?: string,
  relationDetail?: string,
): string {
  const slot = sideLabel(recipientSlot);
  const relation = relationLabel(relationCategory);

  if (!slot && !relation) return '';

  let prefix: string;
  if (slot && relation) {
    prefix = translate(lang(), 'guest.prefixOf', { side: slot, relation });
  } else {
    prefix = slot || relation;
  }

  if (relationDetail) {
    prefix += ` ${relationDetail}`;
  }

  return prefix;
}
