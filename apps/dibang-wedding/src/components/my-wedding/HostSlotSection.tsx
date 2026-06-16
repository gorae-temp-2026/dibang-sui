import type { WeddingSummary, HostInvite } from '@gorae/contracts';

/**
 * 호스트 슬롯 presentational — props/콜백만 받아 렌더링.
 * (UI/데이터 분리 2-H: mutation/query 호출은 HostSlotSectionContainer가 책임)
 * QA 2026-05-29: 초대 공유 별도 모달 제거 → pending 슬롯에 공유/복사/취소 버튼 직접 노출.
 */
const SLOT_LABELS: Record<string, string> = {
  groom: '신랑',
  bride: '신부',
  groom_father: '신랑 아버지',
  groom_mother: '신랑 어머니',
  bride_father: '신부 아버지',
  bride_mother: '신부 어머니',
};

const PARENT_SLOTS = ['groom_father', 'groom_mother', 'bride_father', 'bride_mother'] as const;

interface Props {
  wedding: WeddingSummary;
  myRole?: string;
  invites: HostInvite[];
  /** 실제 점유된 host 슬롯 집합(host_*_id 기준). 초대 기록이 아니라 실 점유로 '채워짐'을 판정한다. */
  occupiedSlots: ReadonlySet<string>;
  isCreating: boolean;
  onCreate: (slot: string) => void;
  onCancel: (inviteId: string) => void;
  /** 초대 링크 복사 — invite token으로 URL 조립은 컨테이너 책임 */
  onCopyInviteLink: (token: string) => void;
  /** 초대 링크 공유(카카오톡 등) — invite token으로 URL 조립은 컨테이너 책임 */
  onShareInvite: (token: string) => void;
}

export function HostSlotSection({
  wedding,
  myRole,
  invites,
  occupiedSlots,
  isCreating,
  onCreate,
  onCancel,
  onCopyInviteLink,
  onShareInvite,
}: Props) {
  // 배우자 초대: 신랑이면 신부를, 신부이면 신랑을 초대
  const spouseSlot = myRole === 'groom' ? 'bride' : myRole === 'bride' ? 'groom' : null;

  const getInviteForSlot = (slot: string) =>
    invites.find((inv) => inv.slot === slot && inv.status !== 'cancelled');

  const renderSlot = (slot: string, name?: string) => {
    const invite = getInviteForSlot(slot);

    // 점유 우선: 실제 host 슬롯이 차 있으면(생성자가 만들 때 직접 세팅한 경우 포함) '채워짐'.
    // 수락된 초대도 host_*_id를 세팅하므로 이 분기가 accepted를 흡수한다. accepted 조건을
    // 함께 둔 건 wedding 상세 refetch 지연 시에도 즉시 채워짐으로 보이게 하기 위함.
    if (occupiedSlots.has(slot) || invite?.status === 'accepted') {
      return (
        <div className="rounded-lg border border-green-200 bg-green-50/30 px-3 py-2 text-sm">
          <span className="text-gray-400">{SLOT_LABELS[slot]}</span>
          <p className="font-medium text-green-700 mt-0.5">{name || '수락됨'}</p>
        </div>
      );
    }

    if (invite?.status === 'pending') {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{SLOT_LABELS[slot]}</span>
            <span className="text-yellow-600 font-medium">대기중</span>
          </div>
          {/* 카카오톡 공유 · 링크 복사 · 취소 (별도 모달 없이 직접 노출) */}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onShareInvite(invite.token)}
              className="rounded-md bg-[#FEE500] px-2.5 py-1 text-xs font-semibold text-[#3C1E1E] transition hover:brightness-95"
            >
              카카오톡 공유
            </button>
            <button
              type="button"
              onClick={() => onCopyInviteLink(invite.token)}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              링크 복사
            </button>
            <button
              type="button"
              onClick={() => onCancel(invite.id)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 transition hover:text-red-500"
            >
              취소
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm">
        <span className="text-gray-400">{SLOT_LABELS[slot]}</span>
        <button
          type="button"
          onClick={() => onCreate(slot)}
          disabled={isCreating}
          className="block w-full mt-1 text-sm font-medium text-sky-500 hover:text-sky-700 transition-colors disabled:opacity-50"
        >
          {isCreating ? '...' : '초대하기'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-500">
        <p>· 배우자는 함께 모바일 청첩장을 편집할 수 있어요.</p>
        <p>· 혼주는 청첩장 편집은 못 하지만, 웨딩 리포트와 메모리북을 볼 수 있어요.</p>
      </div>

      {/* 배우자 초대 */}
      {spouseSlot && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">배우자</p>
          {renderSlot(spouseSlot, spouseSlot === 'groom' ? wedding.groom_name : wedding.bride_name)}
        </div>
      )}

      {/* 혼주 초대 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">혼주</p>
        <div className="grid grid-cols-2 gap-2">
          {PARENT_SLOTS.map((slot) => {
            const name =
              slot === 'groom_father'
                ? wedding.groom_father_name
                : slot === 'groom_mother'
                  ? wedding.groom_mother_name
                  : slot === 'bride_father'
                    ? wedding.bride_father_name
                    : wedding.bride_mother_name;
            return <div key={slot}>{renderSlot(slot, name)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
