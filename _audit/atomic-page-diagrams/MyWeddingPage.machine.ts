// [Stately 관리용 스펙 모델 — 방향 A] MyWeddingPage.md 다이어그램에서 도출.
// guards/actions/actors는 이름 참조용 stub. XState v5.
// 주: list 상태의 copy/share/preview/invite는 화면 머무름(자기 액션)이며 navigator.share/copy 결과는 외부 leaf.
import { setup, fromPromise } from 'xstate';

export const myWeddingPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as
      | { type: 'CREATE' }
      | { type: 'COPY_LINK' }
      | { type: 'SHARE_INVITATION' }
      | { type: 'OPEN_PREVIEW' }
      | { type: 'SHARE_INVITE' },
  },
  actors: {
    getMyWeddings: fromPromise(async (): Promise<unknown[]> => []), // useQuery retry:false
  },
  actions: {
    copyToast: () => {},   // 링크 복사 → 2초 토스트
    share: () => {},       // navigator.share 있으면 share(취소 무시) / 없으면 copy→toast
    openPreview: () => {}, // window.open(guestWeb/slug, 새 탭)
    shareInvite: () => {}, // 호스트 초대 공유
  },
  guards: {
    isEmpty: ({ event }) => ((event as { output?: unknown[] }).output ?? []).length === 0,
  },
}).createMachine({
  id: 'myWeddingPage',
  context: {},
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'getMyWeddings',
        onDone: [
          { guard: 'isEmpty', target: 'empty' },
          { target: 'list' },
        ],
        onError: { target: 'empty' }, // retry:false, 데이터 없음 → AddCard
      },
    },
    // 빈 목록 → AddCard
    empty: {
      on: { CREATE: { target: 'navigatedCreate' } },
    },
    // WeddingCard 캐러셀
    list: {
      on: {
        COPY_LINK: { actions: 'copyToast' },
        SHARE_INVITATION: { actions: 'share' },
        OPEN_PREVIEW: { actions: 'openPreview' },
        SHARE_INVITE: { actions: 'shareInvite' },
      },
    },
    navigatedCreate: { type: 'final' }, // navigate(/invitation/create)
  },
});
