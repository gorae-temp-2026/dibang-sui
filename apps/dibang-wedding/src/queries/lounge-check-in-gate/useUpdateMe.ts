import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMe } from '@gorae/contracts/sdk.gen';
import { getMeQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import type { UpdateUserRequest, User } from '../../types/db-compat';

export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateUserRequest) => {
      const { data } = await updateMe({
        body,
        throwOnError: true,
      });
      return data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
    },
  });
}
