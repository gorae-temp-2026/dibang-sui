/**
 * 송금 앱 딥링크 URL 생성 (순수 함수).
 *
 * UI 컴포넌트에서 분리(W06 #8): 딥링크 문자열 생성은 lib에서,
 * 실제 `window.location.href` 할당은 컴포넌트 핸들러에서 수행.
 */

import { getBankCode, getTossBankName } from './bankCodes';

/**
 * 토스(슈퍼토스) 송금 딥링크.
 *
 * @returns 항상 문자열 (은행명 매칭 실패 시 원본 bankName 사용)
 */
export function buildTossLink(params: {
  bankName: string;
  accountNumber: string;
  amount: number;
}): string {
  const cleanAccountNo = params.accountNumber.replace(/[-\s]/g, '');
  const tossBankName = getTossBankName(params.bankName);
  return `supertoss://send?bank=${encodeURIComponent(tossBankName)}&accountNo=${encodeURIComponent(cleanAccountNo)}&amount=${params.amount}`;
}

/**
 * 카카오페이 송금 딥링크.
 *
 * @returns 매칭되는 은행 코드가 없으면 null (호출자가 no-op 처리)
 */
export function buildKakaoLink(params: {
  bankName: string;
  accountNumber: string;
  amount: number;
}): string | null {
  const code = getBankCode(params.bankName);
  if (!code) return null;
  const cleanAccountNo = params.accountNumber.replace(/[-\s]/g, '');
  return `kakaotalk://kakaopay/money/to/bank?bank_code=${code}&bank_account_number=${encodeURIComponent(cleanAccountNo)}&amount=${params.amount}`;
}
