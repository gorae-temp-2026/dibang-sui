import { setup } from 'xstate';

// myWedding.machine — MyWeddingPage flow (XS-10).
// parallel 2축: data(목록 로딩 표시) + toast(복사 알림 자동닫힘).
// 목록 데이터 자체는 React Query(getMyWeddings)가 SSOT — 머신은 로딩 표시 flow와
// 복사 토스트(2초 자동닫힘) 흐름만 제어(STATE_MANAGEMENT.md §4).

export type MyWeddingEvent =
  | { type: 'LOAD_DONE' }
  | { type: 'COPY_DONE' };

export const myWeddingMachine = setup({
  types: {
    events: {} as MyWeddingEvent,
  },
}).createMachine({
  id: 'myWedding',
  type: 'parallel',
  states: {
    /** 목록 로딩 표시 (React Query isLoading 반영) */
    data: {
      initial: 'loading',
      states: {
        loading: { on: { LOAD_DONE: 'loaded' } },
        loaded: {},
      },
    },
    /** 복사 알림 토스트 — COPY_DONE으로 표시, 2초 후 자동닫힘(after). 재복사 시 타이머 리셋. */
    toast: {
      initial: 'hidden',
      states: {
        hidden: { on: { COPY_DONE: 'visible' } },
        visible: {
          after: { 2000: 'hidden' },
          // 재복사 시 external self transition으로 재진입 → after(2000) 타이머 리셋.
          on: { COPY_DONE: { target: 'visible', reenter: true } },
        },
      },
    },
  },
});
