import { setup } from 'xstate';

// weddingList.machine — WeddingListPage flow (XS-11).
// 목록(getMyWeddings)을 다가오는/지난 결혼식으로 나눠 보여주는 단순 로딩 flow.
// 목록 데이터·분류(upcoming/past)는 React Query + 파생 계산이 SSOT — 머신은 로딩 표시 flow만.
// (STATE_MANAGEMENT.md: 단순 흐름도 머신으로 표현 — loading→loaded 단일 전이)

export type WeddingListEvent = { type: 'LOAD_DONE' };

export const weddingListMachine = setup({
  types: { events: {} as WeddingListEvent },
}).createMachine({
  id: 'weddingList',
  initial: 'loading',
  states: {
    loading: { on: { LOAD_DONE: 'loaded' } },
    loaded: {},
  },
});
