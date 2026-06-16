export const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-300";
export const inputErrorClass = "w-full rounded-lg border border-red-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-300";
export const sectionTitleClass = "text-lg font-bold text-gray-900";
export const requiredMark = " *";
export const errorMessage = "필수 항목입니다";

export const BANK_LIST = [
  '카카오뱅크', '토스뱅크', '국민은행', '신한은행', '하나은행', '우리은행',
  '농협은행', 'SC제일은행', '기업은행', '대구은행', '부산은행', '경남은행',
  '광주은행', '전북은행', '제주은행', '수협은행', '한국시티은행', '산업은행',
  '새마을금고', '신협', '우체국', '케이뱅크',
];

export const slugStatusConfig = {
  idle: { text: '', color: '' },
  checking: { text: '확인 중...', color: 'text-gray-400' },
  available: { text: '사용 가능', color: 'text-green-500' },
  taken: { text: '이미 사용 중', color: 'text-red-500' },
  error: { text: '확인 실패', color: 'text-gray-400' },
} as const;
