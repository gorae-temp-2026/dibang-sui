import type { AccountSlot } from '../../hooks/invitation-create/useInvitationForm';
import { AccountSlotRow } from './AccountSlotRow';

export function AccountEditor({ label, slots, side }: {
  label: string;
  slots: AccountSlot[];
  side: 'groom' | 'bride';
}) {
  return (
    <div className="space-y-3">
      <span className="text-base font-medium text-gray-700">{label}</span>
      {slots.map((slot, i) => (
        <AccountSlotRow key={slot.role} slot={slot} side={side} index={i} />
      ))}
    </div>
  );
}
