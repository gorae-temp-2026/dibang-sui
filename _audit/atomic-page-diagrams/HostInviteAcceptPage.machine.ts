// [Stately 관리용 스펙 모델 — 방향 A] HostInviteAcceptPage.md 다이어그램에서 도출.
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const hostInviteAcceptPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: 'ACCEPT' } | { type: 'LOGIN' } | { type: 'LATER' },
  },
  actors: {
    getInvite: fromPromise(async (): Promise<{ status: string } | null> => null),
    acceptInvite: fromPromise(async (): Promise<void> => {}),
  },
  guards: {
    noInvite: ({ event }) => !(event as { output?: unknown }).output, // isError ∨ invite 없음
    isAccepted: ({ event }) => (event as { output?: { status?: string } }).output?.status === 'accepted',
    isCancelled: ({ event }) => (event as { output?: { status?: string } }).output?.status === 'cancelled',
    hasSession: () => false,
  },
}).createMachine({
  id: 'hostInviteAcceptPage',
  context: {},
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'getInvite',
        onDone: [
          { guard: 'noInvite', target: 'notFound' },
          { guard: 'isAccepted', target: 'alreadyAccepted' },
          { guard: 'isCancelled', target: 'cancelled' },
          { target: 'pending' },
        ],
        onError: { target: 'notFound' },
      },
    },
    notFound: { type: 'final' },        // '초대를 찾을 수 없습니다' + 돌아가기 → /my-wedding
    alreadyAccepted: { type: 'final' }, // '이미 수락된 초대' → /my-wedding
    cancelled: { type: 'final' },       // '취소된 초대' → /my-wedding
    // pending: 초대 상세 표시
    pending: {
      on: {
        ACCEPT: [
          { guard: 'hasSession', target: 'accepting' },
          { target: 'toLogin' }, // (UI상 비로그인이면 '로그인하고 수락' 버튼 = LOGIN)
        ],
        LOGIN: { target: 'toLogin' },
        LATER: { target: 'left' },
      },
    },
    accepting: {
      invoke: {
        src: 'acceptInvite',
        onDone: { target: 'accepted' }, // navigate(/my-wedding)
        onError: { target: 'pending' }, // onError 콜백 없음 → 머무름
      },
    },
    accepted: { type: 'final' }, // navigate(/my-wedding)
    toLogin: { type: 'final' },  // navigate(/login?redirect=/invite/:token)
    left: { type: 'final' },     // 나중에 → /my-wedding
  },
});
