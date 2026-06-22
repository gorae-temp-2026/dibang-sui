import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listHostInvites, createHostInvite, cancelHostInvite } from '@gorae/contracts/sdk.gen';
import type { HostInvite, CreateHostInviteRequest } from '../../types/db-compat';

export function useHostInviteList(weddingId: string) {
  return useQuery({
    queryKey: ['hostInvites', weddingId],
    queryFn: async () => {
      const { data } = await listHostInvites({
        path: { weddingId },
        throwOnError: true,
      });
      return data as HostInvite[];
    },
    enabled: !!weddingId,
  });
}

export function useCreateHostInvite(weddingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slot: CreateHostInviteRequest['slot']) => {
      const { data } = await createHostInvite({
        path: { weddingId },
        body: { slot },
        throwOnError: true,
      });
      return data as HostInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostInvites', weddingId] });
    },
  });
}

export function useCancelHostInvite(weddingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      await cancelHostInvite({
        path: { weddingId, inviteId },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostInvites', weddingId] });
    },
  });
}
