import { useMutation } from '@tanstack/react-query';
import { updateInvitationMutation } from '@gorae/contracts/@tanstack/react-query.gen';

export function useUpdateInvitation() {
  return useMutation({
    ...updateInvitationMutation(),
  });
}
