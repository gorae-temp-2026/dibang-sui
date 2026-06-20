// [Stately 관리용 스펙 모델 — 방향 A] QrPage.md 다이어그램에서 도출.
// 스텁: 카메라 QR 스캐너 구현 예정. 정적 화면, 분기·상태 없음. XState v5.
import { setup } from 'xstate';

export const qrPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: never },
  },
}).createMachine({
  id: 'qrPage',
  context: {},
  initial: 'screen',
  states: {
    // QR 스캔 화면 — 카메라 스캐너 (구현 예정·정적·분기 없음)
    screen: {},
  },
});
