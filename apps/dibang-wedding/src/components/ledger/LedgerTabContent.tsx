import type { CashGift } from '../../types/db-compat';
import { formatAmount, formatDate } from './ledger-utils';

export function LedgerTabContent({
  gifts,
  isGiftsLoading,
  isFetchingNextPage,
  lastCardRef,
  onGiftClick,
  onExport,
  onAdd,
  note,
}: {
  gifts: CashGift[];
  isGiftsLoading: boolean;
  isFetchingNextPage: boolean;
  lastCardRef: (node: HTMLDivElement | null) => void;
  onGiftClick: (gift: CashGift) => void;
  onExport: () => void;
  onAdd: () => void;
  note?: string;
}) {
  return (
    <>
      {/* Actions row — 설명(좌) + 버튼(우)을 한 줄에서 양쪽 정렬 (#48, #49) */}
      <div className="flex items-center justify-between gap-2">
        {note ? <p className="text-sm text-gray-400">{note}</p> : <span />}
        <div className="flex gap-2">
          <button
            onClick={onExport}
            disabled={gifts.length === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            다운로드
          </button>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#6A9AB8] text-white hover:bg-[#5A8AA8]"
          >
            + 내역 추가
          </button>
        </div>
      </div>

      {/* Gift List */}
      {isGiftsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          아직 도착한 축의가 없어요
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map((gift, idx) => (
            <div
              key={gift.id}
              ref={idx === gifts.length - 1 ? lastCardRef : undefined}
              onClick={() => onGiftClick(gift)}
              className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{gift.guest_name}</span>
                  <span className="text-sm text-gray-400">{gift.relation_category}</span>
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full ${gift.attended ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {gift.attended ? '참석' : '불참'}
                </span>
              </div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-lg font-bold font-serif text-gray-900">{formatAmount(gift.amount)}</span>
                <span className="text-sm text-gray-400">{formatDate(gift.created_at)}</span>
              </div>
            </div>
          ))}
          {isFetchingNextPage && (
            <div className="text-center py-4 text-sm text-gray-400">불러오는 중...</div>
          )}
        </div>
      )}
    </>
  );
}
