import { useQuery } from '@tanstack/react-query';
import { getWeddingOptions, getInvitationOptions } from '@gorae/contracts/@tanstack/react-query.gen';

export function useLoadWedding(weddingId: string, targetInvitationId?: string | null) {
  const { data: wedding, isLoading: weddingLoading, isError: weddingError } = useQuery({
    ...getWeddingOptions({ path: { weddingId } }),
  });

  const matchedInvitation = targetInvitationId
    ? wedding?.invitations?.find((inv) => inv.id === targetInvitationId)
    : undefined;
  const targetInv = matchedInvitation ?? wedding?.invitations?.[0];
  const slug = targetInv?.slug ?? '';
  const invitationId = targetInv?.id ?? '';

  const { data: invitation, isLoading: invitationLoading, isError: invitationError } = useQuery({
    ...getInvitationOptions({ path: { slug } }),
    enabled: !!slug,
  });

  const isLoading = weddingLoading || (!!slug && invitationLoading);
  const isError = weddingError || invitationError;

  return { wedding, invitation, slug, invitationId, isLoading, isError };
}
