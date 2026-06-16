// DUP2-1 / W06 #3·#4 분리:
// guestFlow `sendingMessage` 진입 시 발사하는 GuestbookMessage 생성 mutation.
// 페이지(GuestFlowPage)에서 SDK 직호출을 떼어내 queries 레이어로 이동.

import { useMutation } from '@tanstack/react-query';
import { createGuestbookMessage } from '@gorae/contracts/sdk.gen';

export interface CreateGuestbookMessageParams {
  entryId: string;
  message: string;
}

export function useCreateGuestbookMessageMutation() {
  return useMutation({
    mutationFn: async (params: CreateGuestbookMessageParams) => {
      const { data } = await createGuestbookMessage({
        path: { entryId: params.entryId },
        body: { message: params.message },
        throwOnError: true,
      });
      return data;
    },
  });
}
