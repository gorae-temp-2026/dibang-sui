import type { CashGift } from '../../types/db-compat';
import { useT } from '../../lib/i18n';
import { GiftRow } from './GiftRow';
import { PAY_METHOD_LABEL, formatAmount } from './ledger-utils';

export function GiftDetail({
  gift,
  onEdit,
  onDelete,
}: {
  gift: CashGift;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">{gift.guest_name}</h3>
      <div className="text-2xl font-bold font-serif text-gray-900">{formatAmount(gift.amount)}</div>
      <div className="space-y-2 text-sm">
        <GiftRow label={t('ledger.gift.relation')} value={gift.relation_category + (gift.relation_detail ? ` / ${gift.relation_detail}` : '')} />
        <GiftRow label={t('ledger.gift.payMethod')} value={PAY_METHOD_LABEL[gift.pay_method] ?? gift.pay_method} />
        <GiftRow label={t('ledger.gift.attendance')} value={gift.attended ? t('ledger.gift.attended') : t('ledger.gift.absent')} />
        <GiftRow label={t('ledger.gift.dateTime')} value={new Date(gift.created_at).toLocaleString()} />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onEdit} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">
          {t('ledger.edit')}
        </button>
        <button onClick={onDelete} className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50">
          {t('ledger.delete')}
        </button>
      </div>
    </div>
  );
}
