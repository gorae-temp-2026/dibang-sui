import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptHostInvite } from '@gorae/contracts/sdk.gen';
import { getMyWeddingsOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useAcceptHostInvite(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await acceptHostInvite({
        path: { token: token! },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostInvite', token] });
      // D5 버그: 수락 직후 '/my-wedding' 진입 시 새로 참여한 웨딩·역할이 반영되도록
      // 나의 결혼식 목록 캐시를 무효화한다(이전엔 hostInvite 단건만 무효화 → 목록 stale).
      queryClient.invalidateQueries({ queryKey: getMyWeddingsOptions().queryKey });
    },
  });
}
