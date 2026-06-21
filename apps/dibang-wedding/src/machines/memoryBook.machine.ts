import { setup } from 'xstate';

// memoryBook.machine — WeddingMemoryBookPage flow (XS-14).
// 메모리북 조회 로딩 flow: loading→loaded/error. status(ready/ready_uncurated) 분기와
// curate redirect는 데이터 파생이라 컴포넌트가 처리(머신은 로딩 표시 flow만, STATE_MANAGEMENT §4).

export type MemoryBookEvent =
  | { type: 'LOAD_SUCCESS' }
  | { type: 'LOAD_ERROR' }
  | { type: 'RETRY' };

export const memoryBookMachine = setup({
  types: { events: {} as MemoryBookEvent },
}).createMachine({
  id: 'memoryBook',
  initial: 'loading',
  states: {
    loading: { on: { LOAD_SUCCESS: 'loaded', LOAD_ERROR: 'error' } },
    loaded: {},
    error: { on: { RETRY: 'loading' } },
  },
});
