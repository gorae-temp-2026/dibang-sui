// DUP2-1 / W06 #3·#4 분리:
// guestFlow `transferring` 진입 시 발사하는 CashGift 생성 mutation.
// 페이지(GuestFlowPage)에서 SDK 직호출을 떼어내 queries 레이어로 이동.

import { useMutation } from '@tanstack/react-query';
import { createCashGift } from '@gorae/contracts/sdk.gen';
import type { PayMethod, RecipientSlot, RelationCategory } from '../../machines/guestFlow.machine';

export interface CreateCashGiftParams {
  wedding_id: string;
  guest_name: string;
  recipient_slot: RecipientSlot;
  relation_category: RelationCategory;
  relation_detail?: string;
  amount: number;
  pay_method: PayMethod;
  guestbook_entry_id?: string;
}

export function useCreateCashGiftMutation() {
  return useMutation({
    mutationFn: async (body: CreateCashGiftParams) => {
      const { data } = await createCashGift({
        body: {
          wedding_id: body.wedding_id,
          guest_name: body.guest_name,
          recipient_slot: body.recipient_slot,
          relation_category: body.relation_category,
          relation_detail: body.relation_detail,
          amount: body.amount,
          pay_method: body.pay_method,
          guestbook_entry_id: body.guestbook_entry_id,
        },
        throwOnError: true,
      });
      return data;
    },
  });
}
