import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoungeCheckIn } from '@gorae/contracts/sdk.gen';
import type { CreateLoungeCheckInRequest, LoungeCheckIn } from '../../types/db-compat';

interface CreateLoungeCheckInVars {
  loungeId: string;
  body: CreateLoungeCheckInRequest;
}

export function useCreateLoungeCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loungeId, body }: CreateLoungeCheckInVars) => {
      const { data } = await createLoungeCheckIn({
        path: { loungeId },
        body,
        throwOnError: true,
      });
      return data as LoungeCheckIn;
    },
    onSuccess: (_data, { loungeId }) => {
      queryClient.invalidateQueries({ queryKey: ['lounge-check-in', 'me', loungeId] });
    },
  });
}
