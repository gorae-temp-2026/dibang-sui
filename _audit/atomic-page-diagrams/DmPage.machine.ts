// [Stately 관리용 스펙 모델 — 방향 A] DmPage.md 다이어그램에서 도출.
// 스텁: 다이렉트 메시지 구현 예정. 정적 화면, 분기·상태 없음. XState v5.
import { setup } from 'xstate';

export const dmPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: never },
  },
}).createMachine({
  id: 'dmPage',
  context: {},
  initial: 'screen',
  states: {
    // DM 화면 — 다이렉트 메시지 (구현 예정·정적·분기 없음)
    screen: {},
  },
});
