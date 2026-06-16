import { setup, assign } from "xstate";

// 피드 카드 모달(인스타 스토리식 2D) flow.
// 위치 = (groupIndex=프로필, itemIndex=그 프로필의 글). 롤오버/스와이프바운드/
// 5초 자동전환 분기는 컴포넌트가 데이터(groups·item수)로 계산해 SET_POS/CLOSE를
// 보낸다. 머신은 위치 + open/closed flow만 담당(단순 유지).
// OPEN은 어느 상태에서든 수용해 재시드(stale 위치 차단 — FCM-1 계승).

export interface StoryCarouselContext {
  groupIndex: number;
  itemIndex: number;
}

export type StoryCarouselEvent =
  | { type: "OPEN"; groupIndex: number; itemIndex: number }
  | { type: "SET_POS"; groupIndex: number; itemIndex: number }
  | { type: "CLOSE" };

export const storyCarouselMachine = setup({
  types: {
    context: {} as StoryCarouselContext,
    events: {} as StoryCarouselEvent,
  },
  actions: {
    setPos: assign((_, params: { groupIndex: number; itemIndex: number }) => ({
      groupIndex: params.groupIndex,
      itemIndex: params.itemIndex,
    })),
  },
}).createMachine({
  id: "storyCarousel",
  initial: "closed",
  context: { groupIndex: 0, itemIndex: 0 },

  on: {
    OPEN: {
      target: ".playing",
      actions: {
        type: "setPos",
        params: ({ event }) => ({ groupIndex: event.groupIndex, itemIndex: event.itemIndex }),
      },
    },
  },

  states: {
    closed: { description: "모달 닫힘" },

    playing: {
      description: "스토리 표시 중 (컴포넌트가 5초 타이머·탭·스와이프로 SET_POS/CLOSE)",
      on: {
        SET_POS: {
          actions: {
            type: "setPos",
            params: ({ event }) => ({ groupIndex: event.groupIndex, itemIndex: event.itemIndex }),
          },
        },
        CLOSE: { target: "closed" },
      },
    },
  },
});
