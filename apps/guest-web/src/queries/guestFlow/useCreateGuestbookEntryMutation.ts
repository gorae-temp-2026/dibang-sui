// GBDUP-1 / W06 #3·#4 분리:
// guestFlow `creating` 진입 시 발사하는 GuestbookEntry 생성 mutation.
// 페이지(GuestFlowPage)에서 SDK 직호출을 떼어내 queries 레이어로 이동.

import { useMutation } from '@tanstack/react-query';
import { createGuestbookEntry } from '@gorae/contracts/sdk.gen';
import type { RecipientSlot, RelationCategory } from '../../machines/guestFlow.machine';

export interface CreateGuestbookEntryParams {
  loungeId: string;
  body: {
    guest_name: string;
    recipient_slot: RecipientSlot;
    relation_category: RelationCategory;
    relation_detail?: string;
  };
}

export function useCreateGuestbookEntryMutation() {
  return useMutation({
    mutationFn: async (params: CreateGuestbookEntryParams) => {
      const { data } = await createGuestbookEntry({
        path: { loungeId: params.loungeId },
        body: params.body,
        throwOnError: true,
      });
      return data;
    },
  });
}
