import type { WeddingSummary, CreateHostInviteRequest, HostInvite } from '../../types/db-compat';
import { useCopyToClipboard } from '@gorae/web-utils';
import { useHostInviteList, useCreateHostInvite, useCancelHostInvite } from '../../queries/host-invite/useHostInvites';
import { useGetWedding } from '../../queries/lounge-feed/useGetWedding';
import { HostSlotSection } from './HostSlotSection';

/**
 * 호스트 슬롯 컨테이너 — 3종 mutation/query 흡수 + 핸들러 생성.
 * (UI/데이터 분리 2-H: presentational HostSlotSection에 props로 흘려보냄)
 *
 * QA 2026-05-29: 초대 공유 별도 모달 제거 → invite token 기반으로 pending 슬롯에서
 * 직접 카카오톡 공유 / 링크 복사. 외부 API(navigator.share·clipboard)는 page 위임 유지.
 */
export function HostSlotSectionContainer({
  weddingId,
  wedding,
  myRole,
  onCopyLink,
  inviteOrigin,
  onShareInvite,
}: {
  weddingId: string;
  wedding: WeddingSummary;
  myRole?: string;
  onCopyLink: () => void;
  /** invite token URL 조립용 origin. page가 window.location.origin 캡처해 주입. */
  inviteOrigin: string;
  /** invite share 트리거. page가 navigator.share + fallback copy 책임. */
  onShareInvite: (url: string) => Promise<void> | void;
}) {
  const { data: invites } = useHostInviteList(weddingId);
  const { mutate: create, isPending: isCreating } = useCreateHostInvite(weddingId);
  const { mutate: cancel } = useCancelHostInvite(weddingId);
  const { copy } = useCopyToClipboard();

  // 슬롯 점유는 초대 기록이 아니라 실제 host_*_id로 판정한다(생성자가 직접 채운 슬롯 포함).
  // 이 컨테이너는 '배우자·혼주 초대' 팝오버 안에서만 마운트되므로 상세 조회는 모달 열릴 때만 일어난다.
  const { data: weddingDetail } = useGetWedding(weddingId);
  const hosts = weddingDetail?.hosts;
  const occupiedSlots = new Set<string>(
    (
      [
        ['groom', hosts?.host_groom_id],
        ['bride', hosts?.host_bride_id],
        ['groom_father', hosts?.host_groom_father_id],
        ['groom_mother', hosts?.host_groom_mother_id],
        ['bride_father', hosts?.host_bride_father_id],
        ['bride_mother', hosts?.host_bride_mother_id],
      ] as const
    )
      .filter(([, id]) => Boolean(id))
      .map(([slot]) => slot),
  );

  const inviteUrl = (token: string) => `${inviteOrigin}/invite/${token}`;

  const handleCreate = (slot: string) => {
    create(slot as CreateHostInviteRequest['slot']);
  };

  const handleCancel = (inviteId: string) => {
    cancel(inviteId);
  };

  const handleCopyInviteLink = async (token: string) => {
    const ok = await copy(inviteUrl(token));
    if (ok) onCopyLink();
  };

  const handleShareInvite = (token: string) => {
    void onShareInvite(inviteUrl(token));
  };

  return (
    <HostSlotSection
      wedding={wedding}
      myRole={myRole}
      invites={(invites ?? []) as HostInvite[]}
      occupiedSlots={occupiedSlots}
      isCreating={isCreating}
      onCreate={handleCreate}
      onCancel={handleCancel}
      onCopyInviteLink={handleCopyInviteLink}
      onShareInvite={handleShareInvite}
    />
  );
}
