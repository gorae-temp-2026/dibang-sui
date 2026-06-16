import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWeddingMutation, getMyWeddingsQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';

export function useCreateWedding() {
  const queryClient = useQueryClient();

  return useMutation({
    ...createWeddingMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMyWeddingsQueryKey() });
    },
  });
}
