import type { CashGift } from '../types/db-compat';
import { PAY_METHOD_LABEL } from '../components/ledger/ledger-utils';
import { downloadCsv } from './csv-download';
import { translate, useLangStore } from './i18n';

const lang = () => useLangStore.getState().lang;

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
  const l = lang();
  const locale = l === 'ko' ? 'ko-KR' : 'en-US';
  const header = [
    translate(l, 'ledgerExport.colName'),
    translate(l, 'ledgerExport.colRelation'),
    translate(l, 'ledgerExport.colRelationDetail'),
    translate(l, 'ledgerExport.colAmount'),
    translate(l, 'ledgerExport.colPayMethod'),
    translate(l, 'ledgerExport.colAttendance'),
    translate(l, 'ledgerExport.colDateTime'),
  ];
  const dataRows = gifts.map((g) => [
    sanitize(g.guest_name),
    sanitize(g.relation_category),
    sanitize(g.relation_detail ?? ''),
    String(g.amount),
    sanitize(PAY_METHOD_LABEL[g.pay_method] ?? g.pay_method),
    g.attended ? translate(l, 'ledger.gift.attended') : translate(l, 'ledger.gift.absent'),
    sanitize(new Date(g.created_at).toLocaleString(locale)),
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileBase =
    meta?.groomName && meta?.brideName
      ? `${translate(l, 'ledgerExport.fileTitle', { groom: meta.groomName, bride: meta.brideName, date: meta.date ?? dateStr })}${
          meta.ownerName ? translate(l, 'ledgerExport.fileOwnerSuffix', { owner: meta.ownerName }) : ''
        }`
      : translate(l, 'ledgerExport.fileDefault', { date: dateStr });
  downloadCsv(`${fileBase}.csv`, [header, ...dataRows]);
}
