import { useQuery } from '@tanstack/react-query';
import { getHostInvite } from '@gorae/contracts/sdk.gen';

export function useGetHostInvite(token: string | undefined) {
  return useQuery({
    queryKey: ['hostInvite', token],
    queryFn: async () => {
      const { data } = await getHostInvite({
        path: { token: token! },
        throwOnError: true,
      });
      return data;
    },
    enabled: !!token,
  });
}
