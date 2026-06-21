import { setup, assign } from "xstate";

// 피드 카드 모달(인스타 스토리 2D) flow — 흐름을 머신이 소유(XS-5).
// 위치(groupIndex=프로필, itemIndex=그 프로필의 글)와 함께, 탭/스와이프의
// 롤오버·바운드·마지막 끝 닫힘을 머신 guard/전이로 계산한다.
// 컴포넌트는 itemCounts(각 프로필 글 수)를 OPEN으로 주입하고
// NEXT_ITEM/PREV_ITEM/NEXT_PROFILE/PREV_PROFILE/CLOSE를 send + 렌더만 한다.
// (5초 자동전환 타이머는 컴포넌트 부수효과로 NEXT_ITEM을 send — STATE_MANAGEMENT 역할분담:
//  타이머 발사는 부수효과, '다음으로 갈지/닫을지' 결정은 머신.)
// OPEN은 어느 상태에서든 수용해 재시드(stale 위치 차단 — FCM-1 계승).

export interface StoryCarouselContext {
  groupIndex: number;
  itemIndex: number;
  /** 각 프로필(group)의 글 개수. 롤오버/바운드 계산용 흐름 메타(OPEN 시 주입). */
  itemCounts: number[];
}

export type StoryCarouselEvent =
  | { type: "OPEN"; groupIndex: number; itemCounts: number[] }
  | { type: "NEXT_ITEM" } // 탭 우 / 5초 자동
  | { type: "PREV_ITEM" } // 탭 좌
  | { type: "NEXT_PROFILE" } // 스와이프 ←
  | { type: "PREV_PROFILE" } // 스와이프 →
  | { type: "CLOSE" };

export const storyCarouselMachine = setup({
  types: {
    context: {} as StoryCarouselContext,
    events: {} as StoryCarouselEvent,
  },
  guards: {
    hasNextItem: ({ context: c }) => c.itemIndex < (c.itemCounts[c.groupIndex] ?? 0) - 1,
    hasNextGroup: ({ context: c }) => c.groupIndex < c.itemCounts.length - 1,
    hasPrevItem: ({ context: c }) => c.itemIndex > 0,
    hasPrevGroup: ({ context: c }) => c.groupIndex > 0,
  },
  actions: {
    open: assign((_, params: { groupIndex: number; itemCounts: number[] }) => ({
      groupIndex: params.groupIndex,
      itemIndex: 0,
      itemCounts: params.itemCounts,
    })),
    incItem: assign({ itemIndex: ({ context }) => context.itemIndex + 1 }),
    decItem: assign({ itemIndex: ({ context }) => context.itemIndex - 1 }),
    nextGroupFirst: assign({
      groupIndex: ({ context }) => context.groupIndex + 1,
      itemIndex: 0,
    }),
    prevGroupFirst: assign({
      groupIndex: ({ context }) => context.groupIndex - 1,
      itemIndex: 0,
    }),
    prevGroupLast: assign({
      groupIndex: ({ context }) => context.groupIndex - 1,
      itemIndex: ({ context }) => Math.max(0, (context.itemCounts[context.groupIndex - 1] ?? 1) - 1),
    }),
  },
}).createMachine({
  id: "storyCarousel",
  initial: "closed",
  context: { groupIndex: 0, itemIndex: 0, itemCounts: [] },

  on: {
    OPEN: {
      target: ".playing",
      actions: {
        type: "open",
        params: ({ event }) => ({ groupIndex: event.groupIndex, itemCounts: event.itemCounts }),
      },
    },
  },

  states: {
    closed: { description: "모달 닫힘" },

    playing: {
      description: "스토리 표시 중 — 머신이 롤오버/바운드/끝닫힘을 계산(컴포넌트는 send+렌더)",
      on: {
        // 탭 우 / 5초 자동: 다음 글 → 프로필 끝이면 다음 프로필 첫 글 → 마지막의 마지막이면 닫힘
        NEXT_ITEM: [
          { guard: "hasNextItem", actions: "incItem" },
          { guard: "hasNextGroup", actions: "nextGroupFirst" },
          { target: "closed" },
        ],
        // 탭 좌: 이전 글 → 첫 글이면 이전 프로필 마지막 글 → 맨 앞이면 멈춤(전이 없음)
        PREV_ITEM: [
          { guard: "hasPrevItem", actions: "decItem" },
          { guard: "hasPrevGroup", actions: "prevGroupLast" },
        ],
        // 스와이프: 프로필 이동(양끝 멈춤)
        NEXT_PROFILE: { guard: "hasNextGroup", actions: "nextGroupFirst" },
        PREV_PROFILE: { guard: "hasPrevGroup", actions: "prevGroupFirst" },
        CLOSE: { target: "closed" },
      },
    },
  },
});
