/**
 * 은행 코드 매핑 및 변환 함수 (순수 함수).
 *
 * - `BANK_CODE_MAP`: 은행명(별칭 포함) → 표준 은행 코드(3자리)
 * - `TOSS_BANK_NAME_MAP`: 코드 → 토스 딥링크에 사용하는 정식 은행명
 *
 * UI 컴포넌트에서 분리(W06 #9, #10): 도메인 매핑은 lib에, 호출은 컴포넌트에.
 */

export const BANK_CODE_MAP: Record<string, string> = {
  '산업': '002', '산업은행': '002', 'KDB산업': '002', 'KDB산업은행': '002',
  '국민': '004', '국민은행': '004', 'KB국민': '004', 'KB국민은행': '004', 'KB': '004',
  '기업': '003', '기업은행': '003', 'IBK기업': '003', 'IBK기업은행': '003', 'IBK': '003',
  '농협': '011', '농협은행': '011', 'NH농협': '011', 'NH농협은행': '011', 'NH': '011',
  '우리': '020', '우리은행': '020',
  '신한': '088', '신한은행': '088',
  '하나': '081', '하나은행': '081',
  'SC제일': '023', 'SC제일은행': '023',
  '씨티': '027', '씨티은행': '027',
  '수협': '007', '수협은행': '007',
  '대구': '031', '대구은행': '031',
  '부산': '032', '부산은행': '032',
  '광주': '034', '광주은행': '034',
  '제주': '035', '제주은행': '035',
  '전북': '037', '전북은행': '037',
  '경남': '039', '경남은행': '039',
  '새마을': '045', '새마을금고': '045',
  '신협': '048',
  '우체국': '071',
  'K뱅크': '089', '케이뱅크': '089',
  '카카오': '090', '카카오뱅크': '090',
  '토스': '092', '토스뱅크': '092',
};

const TOSS_BANK_NAME_MAP: Record<string, string> = {
  '002': '산업은행', '003': '기업은행', '004': '국민은행', '007': '수협은행',
  '011': '농협은행', '020': '우리은행', '023': 'SC제일은행', '027': '씨티은행',
  '031': '대구은행', '032': '부산은행', '034': '광주은행', '035': '제주은행',
  '037': '전북은행', '039': '경남은행', '045': '새마을금고', '048': '신협',
  '071': '우체국', '081': '하나은행', '088': '신한은행', '089': '케이뱅크',
  '090': '카카오뱅크', '092': '토스뱅크',
};

/** 은행명을 표준 3자리 코드로 변환. 매칭 실패 시 null. */
export function getBankCode(bankName: string): string | null {
  const normalized = bankName.replace(/\s/g, '');
  if (BANK_CODE_MAP[normalized]) return BANK_CODE_MAP[normalized];
  const lower = normalized.toLowerCase();
  for (const [key, code] of Object.entries(BANK_CODE_MAP)) {
    if (key.toLowerCase() === lower) return code;
  }
  return null;
}

/** 은행명을 토스 딥링크용 정식 은행명으로 변환. 매칭 실패 시 입력 그대로. */
export function getTossBankName(bankName: string): string {
  const code = getBankCode(bankName);
  if (code && TOSS_BANK_NAME_MAP[code]) return TOSS_BANK_NAME_MAP[code];
  return bankName;
}
