import { setup, assign } from 'xstate';
import type { CashGift } from '../types/db-compat';

// ledger.machine — LedgerPage(장부) flow (XS-13).
// modal 상태머신(gift CRUD drawer/dialog) + activeTab/selectedGift/deleteTargetId context.
// 목록·요약·RSVP·메시지 데이터와 mutation(create/update/delete)은 React Query SSOT —
// 머신은 "어떤 탭인가 + 어떤 drawer/dialog가 열렸나(상세/편집/추가/삭제확인)" flow만 제어
// (STATE_MANAGEMENT.md §4). 탭 전환은 drawer 상태와 독립이라 전역 on으로 처리.

export type LedgerTab = 'ledger' | 'messages' | 'rsvp' | 'share-photos';

export interface LedgerContext {
  activeTab: LedgerTab;
  selectedGift: CashGift | null;
  deleteTargetId: string | null;
}

export type LedgerEvent =
  | { type: 'TAB_CHANGE'; tab: LedgerTab }
  | { type: 'OPEN_DETAIL'; gift: CashGift }
  | { type: 'OPEN_ADD' }
  | { type: 'EDIT' }
  | { type: 'SAVED'; gift: CashGift }
  | { type: 'DELETE' }
  | { type: 'CONFIRM_DELETE' }
  | { type: 'CANCEL_DELETE' }
  | { type: 'CLOSE' };

export const ledgerMachine = setup({
  types: { context: {} as LedgerContext, events: {} as LedgerEvent },
  actions: {
    setTab: assign({ activeTab: (_, p: { tab: LedgerTab }) => p.tab }),
    selectGift: assign({ selectedGift: (_, p: { gift: CashGift }) => p.gift }),
    clearSelected: assign({ selectedGift: null, deleteTargetId: null }),
    markDeleteTarget: assign({ deleteTargetId: ({ context }) => context.selectedGift?.id ?? null }),
  },
}).createMachine({
  id: 'ledger',
  context: { activeTab: 'ledger', selectedGift: null, deleteTargetId: null },
  // 탭 전환은 drawer/dialog 상태와 독립 — 어느 상태에서나 처리.
  on: {
    TAB_CHANGE: { actions: { type: 'setTab', params: ({ event }) => ({ tab: event.tab }) } },
  },
  initial: 'closed',
  states: {
    closed: {
      on: {
        OPEN_DETAIL: { target: 'detail', actions: { type: 'selectGift', params: ({ event }) => ({ gift: event.gift }) } },
        OPEN_ADD: 'adding',
      },
    },
    // 상세 drawer
    detail: {
      on: {
        EDIT: 'editing',
        DELETE: { target: 'confirmingDelete', actions: 'markDeleteTarget' },
        CLOSE: { target: 'closed', actions: 'clearSelected' },
      },
    },
    // 편집 drawer
    editing: {
      on: {
        SAVED: { target: 'detail', actions: { type: 'selectGift', params: ({ event }) => ({ gift: event.gift }) } },
        CLOSE: 'detail', // 편집 취소 → 상세로 복귀
      },
    },
    // 추가 drawer
    adding: {
      on: { CLOSE: 'closed' },
    },
    // 삭제 확인 dialog
    confirmingDelete: {
      on: {
        CANCEL_DELETE: 'detail', // 취소 → 상세 유지
        CONFIRM_DELETE: { target: 'closed', actions: 'clearSelected' },
      },
    },
  },
});
