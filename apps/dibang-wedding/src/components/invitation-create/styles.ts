export const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-300";
export const inputErrorClass = "w-full rounded-lg border border-red-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-300";
export const sectionTitleClass = "text-lg font-bold text-gray-900";
export const requiredMark = " *";

// 은행명 = 한국 은행 고유명사라 번역하지 않고 그대로 둔다(enum 값과 동일 취급).
export const BANK_LIST = [
  '카카오뱅크', '토스뱅크', '국민은행', '신한은행', '하나은행', '우리은행',
  '농협은행', 'SC제일은행', '기업은행', '대구은행', '부산은행', '경남은행',
  '광주은행', '전북은행', '제주은행', '수협은행', '한국시티은행', '산업은행',
  '새마을금고', '신협', '우체국', '케이뱅크',
];

// 표시 문구는 i18n 키로 — 소비처(EditPanel/SlugModal)에서 t(textKey) 렌더. color는 그대로.
export const slugStatusConfig = {
  idle: { textKey: '', color: '' },
  checking: { textKey: 'invite.slug.checking', color: 'text-gray-400' },
  available: { textKey: 'invite.slug.available', color: 'text-green-500' },
  taken: { textKey: 'invite.slug.taken', color: 'text-red-500' },
  error: { textKey: 'invite.slug.error', color: 'text-gray-400' },
} as const;
