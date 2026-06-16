import { useState } from 'react';
import type { CashGift, UpdateCashGiftRequest } from '@gorae/contracts';
import { PAY_METHOD_LABEL, PAY_METHOD_OPTIONS, RELATION_OPTIONS } from './ledger-utils';

export function GiftForm({
  title,
  initial,
  onSubmit,
  submitLabel,
  isLoading,
}: {
  title: string;
  initial?: CashGift;
  onSubmit: (values: UpdateCashGiftRequest) => void;
  submitLabel: string;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.guest_name ?? '');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [category, setCategory] = useState(initial?.relation_category ?? '');
  const [detail, setDetail] = useState(initial?.relation_detail ?? '');
  const [payMethod, setPayMethod] = useState(initial?.pay_method ?? '');

  // 관계·축의 방식도 필수(QA 2026-05-29). 미선택 시 제출 불가.
  const isValid =
    name.trim().length > 0 && Number(amount) > 0 && category !== '' && payMethod !== '';

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      guest_name: name.trim(),
      amount: Number(amount),
      relation_category: category || undefined,
      relation_detail: detail || undefined,
      pay_method: payMethod || undefined,
    } as UpdateCashGiftRequest);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>

      <label className="block">
        <span className="text-sm text-gray-600">이름 *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-gray-500"
          placeholder="이름"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">금액 *</span>
        <div className="relative mt-1">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base pr-10 focus:outline-none focus:border-gray-500"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
        </div>
        {amount && (
          <p className="mt-1 text-sm text-gray-500">{Number(amount).toLocaleString('ko-KR')}원</p>
        )}
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">관계 *</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-gray-500 bg-white"
        >
          <option value="" disabled>관계를 선택해 주세요</option>
          {RELATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">관계 상세</span>
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={40}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-gray-500"
          placeholder="예: 고등학교 동창"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">축의 방식 *</span>
        <select
          value={payMethod}
          onChange={(e) => setPayMethod(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-gray-500 bg-white"
        >
          <option value="" disabled>축의 방식을 선택해 주세요</option>
          {PAY_METHOD_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{PAY_METHOD_LABEL[opt]}</option>
          ))}
        </select>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full py-3 rounded-xl bg-[#6A9AB8] text-white text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5A8AA8]"
      >
        {isLoading ? '처리 중...' : submitLabel}
      </button>
    </div>
  );
}
