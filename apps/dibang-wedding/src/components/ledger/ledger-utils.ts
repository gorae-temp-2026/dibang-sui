// QA 2026-05-29: 표시 라벨을 '현금 / 계좌이체 / 간편송금 / 기타' 4가지로.
// pay_method 저장값(cash/transfer/kakaopay/toss)은 백엔드 enum 그대로 유지(라벨만 변경).
export const PAY_METHOD_LABEL: Record<string, string> = {
  cash: '현금',
  transfer: '계좌이체',
  kakaopay: '간편송금',
  toss: '기타',
};

export const RELATION_OPTIONS = [
  '가족/친척',
  '친구/지인',
  '동문/동창',
  '직장동료',
  '스승/제자',
  '기타모임',
] as const;

export const PAY_METHOD_OPTIONS = ['cash', 'transfer', 'kakaopay', 'toss'] as const;

export function formatAmount(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}
