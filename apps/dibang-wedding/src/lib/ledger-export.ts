import type { CashGift } from '@gorae/contracts';
import { PAY_METHOD_LABEL } from '../components/ledger/ledger-utils';
import { downloadCsv } from './csv-download';

/**
 * 축의금 장부를 CSV로 내려받는 헬퍼.
 * (UI/데이터 분리 3-I: page에 박혀 있던 데이터 변환·다운로드 로직 분리)
 *
 * CSV injection 방지: 첫 글자가 =, +, -, @, \t 이면 작은따옴표 prefix로 비활성화.
 */
function sanitize(v: string): string {
  return /[=+\-@\t]/.test(v.charAt(0)) ? `'${v}` : v;
}

/** CSV 파일 제목 메타 — 있으면 '{신랑}·{신부} 결혼식 {날짜} - {장부주인}의 장부' 형식으로 파일명 구성. */
export interface LedgerExportMeta {
  groomName?: string;
  brideName?: string;
  /** 결혼식 날짜(wedding.info.date) */
  date?: string;
  /** 장부 주인(현재 호스트) 이름 */
  ownerName?: string;
}

export function exportLedgerCsv(gifts: CashGift[], meta?: LedgerExportMeta): void {
  if (gifts.length === 0) return;
  const header = ['이름', '관계', '관계상세', '금액', '축의방식', '참석여부', '일시'];
  const dataRows = gifts.map((g) => [
    sanitize(g.guest_name),
    sanitize(g.relation_category),
    sanitize(g.relation_detail ?? ''),
    String(g.amount),
    sanitize(PAY_METHOD_LABEL[g.pay_method] ?? g.pay_method),
    g.attended ? '참석' : '불참',
    sanitize(new Date(g.created_at).toLocaleString('ko-KR')),
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileBase =
    meta?.groomName && meta?.brideName
      ? `${meta.groomName}·${meta.brideName} 결혼식 ${meta.date ?? dateStr}${
          meta.ownerName ? ` - ${meta.ownerName}의 장부` : ''
        }`
      : `축의금-장부-${dateStr}`;
  downloadCsv(`${fileBase}.csv`, [header, ...dataRows]);
}
