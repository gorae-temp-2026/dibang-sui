import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm';
import type { AccountSlot } from '../../hooks/invitation-create/useInvitationForm';
import { inputClass, BANK_LIST } from './styles';

export function AccountSlotRow({ slot, side, index }: {
  slot: AccountSlot;
  side: 'groom' | 'bride';
  index: number;
}) {
  const update = useInvitationForm((s) => s.updateAccountSlot);

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 transition-colors ${slot.enabled ? 'border-sky-200 bg-sky-50/30' : 'border-gray-100 bg-gray-50'}`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={slot.enabled}
          onChange={(e) => update(side, index, 'enabled', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-300"
        />
        <span className="text-base font-medium text-gray-700">{slot.role}</span>
      </label>
      {slot.enabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="예금주"
              value={slot.name}
              onChange={(e) => update(side, index, 'name', e.target.value)}
              className={inputClass}
            />
            <select
              value={slot.bank}
              onChange={(e) => update(side, index, 'bank', e.target.value)}
              className={inputClass}
            >
              <option value="">은행 선택</option>
              {BANK_LIST.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="계좌번호"
            value={slot.number}
            onChange={(e) => update(side, index, 'number', e.target.value)}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
