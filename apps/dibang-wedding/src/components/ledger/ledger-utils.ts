import { translate, useLangStore } from '../../lib/i18n';

const lang = () => useLangStore.getState().lang;

// QA 2026-05-29: 표시 라벨을 '현금 / 계좌이체 / 간편송금 / 기타' 4가지로.
// pay_method 저장값(cash/transfer/kakaopay/toss)은 백엔드 enum 그대로 유지(라벨만 변경).
// 표시 라벨은 i18n으로 — 객체 색인(PAY_METHOD_LABEL[key])을 유지하기 위해 getter로 노출(언어 변경 시 재평가).
export const PAY_METHOD_LABEL: Record<string, string> = {
  get cash() { return translate(lang(), 'ledger.payMethod.cash'); },
  get transfer() { return translate(lang(), 'ledger.payMethod.transfer'); },
  get kakaopay() { return translate(lang(), 'ledger.payMethod.kakaopay'); },
  get toss() { return translate(lang(), 'ledger.payMethod.toss'); },
};

// 주의: RELATION_OPTIONS 값은 표시 라벨이자 저장 데이터(relation_category)다 — 번역하면 저장값이 바뀌므로 그대로 둔다.
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
  return n.toLocaleString() + translate(lang(), 'ledger.form.currencyUnit');
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}
