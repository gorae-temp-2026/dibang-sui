import { setup, assign } from 'xstate';

// ---------- Types ----------

export type RecipientSlot =
  | 'groom'
  | 'bride'
  | 'groom_father'
  | 'groom_mother'
  | 'bride_father'
  | 'bride_mother';

export type RelationCategory =
  | '가족/친척'
  | '친구/지인'
  | '동문/동창'
  | '직장동료'
  | '스승/제자'
  | '기타모임';

export type PayMethod = 'transfer' | 'kakaopay' | 'toss';

export interface GuestFlowContext {
  weddingId: string;
  recipientSlot: RecipientSlot | null;
  hostLabel: string;
  guestName: string;
  relationCategory: RelationCategory | null;
  relationDetail: string;
  amount: number;
  payMethod: PayMethod | null;
  cashGiftId: string | null;
  guestbookEntryId: string | null;
  /** sendingMessage 진입 시 발사할 메시지(SEND_MESSAGE 본문 / SEND_HEART='__HEART__') */
  pendingMessage: string;
  error: string | null;
}

export type GuestFlowEvent =
  | { type: 'SELECT_RECIPIENT'; slot: RecipientSlot; label: string }
  | { type: 'SUBMIT_NAME'; name: string; category: RelationCategory; detail: string }
  | { type: 'CREATE_SUCCESS'; entryId: string }
  | { type: 'CREATE_ERROR'; error: string }
  | { type: 'SELECT_AMOUNT'; amount: number }
  | { type: 'SKIP_AMOUNT' }
  | { type: 'ALREADY_PAID' }
  | { type: 'CONFIRM_TRANSFER'; payMethod: PayMethod }
  | { type: 'TRANSFER_SUCCESS'; cashGiftId: string }
  | { type: 'TRANSFER_ERROR'; error: string }
  | { type: 'SEND_MESSAGE'; message: string }
  | { type: 'SEND_HEART' }
  | { type: 'MESSAGE_SUCCESS' }
  | { type: 'MESSAGE_ERROR'; error: string }
  | { type: 'BACK' }
  | { type: 'RESTART' };

export interface GuestFlowInput {
  weddingId: string;
}

// ---------- Machine ----------

export const guestFlowMachine = setup({
  types: {
    context: {} as GuestFlowContext,
    events: {} as GuestFlowEvent,
    input: {} as GuestFlowInput,
  },
  actions: {
    setRecipient: assign(
      (_, params: { slot: RecipientSlot; label: string }) => ({
        recipientSlot: params.slot,
        hostLabel: params.label,
      }),
    ),
    setNameRelation: assign(
      (_, params: { name: string; category: RelationCategory; detail: string }) => ({
        guestName: params.name,
        relationCategory: params.category,
        relationDetail: params.detail,
      }),
    ),
    setAmount: assign(
      (_, params: { amount: number }) => ({
        amount: params.amount,
      }),
    ),
    setPayMethod: assign(
      (_, params: { payMethod: PayMethod }) => ({
        payMethod: params.payMethod,
      }),
    ),
    setCashGiftId: assign(
      (_, params: { id: string }) => ({
        cashGiftId: params.id,
      }),
    ),
    setEntryId: assign(
      (_, params: { id: string }) => ({
        guestbookEntryId: params.id,
      }),
    ),
    setError: assign(
      (_, params: { error: string }) => ({
        error: params.error,
      }),
    ),
    setPendingMessage: assign(
      (_, params: { message: string }) => ({
        pendingMessage: params.message,
      }),
    ),
    clearError: assign({ error: null }),
    resetContext: assign({
      recipientSlot: null,
      hostLabel: '',
      guestName: '',
      relationCategory: null,
      relationDetail: '',
      amount: 0,
      payMethod: null,
      cashGiftId: null,
      guestbookEntryId: null,
      pendingMessage: '',
      error: null,
    }),
  },
}).createMachine({
  id: 'guestFlow',
  initial: 'recipient',

  context: ({ input }) => ({
    weddingId: input.weddingId,
    recipientSlot: null,
    hostLabel: '',
    guestName: '',
    relationCategory: null,
    relationDetail: '',
    amount: 0,
    payMethod: null,
    cashGiftId: null,
    guestbookEntryId: null,
    pendingMessage: '',
    error: null,
  }),

  states: {
    recipient: {
      description: '누구측 6슬롯 선택',
      on: {
        SELECT_RECIPIENT: {
          target: 'name',
          actions: {
            type: 'setRecipient',
            params: ({ event }) => ({ slot: event.slot, label: event.label }),
          },
        },
      },
    },

    name: {
      description: '관계/이름 입력',
      on: {
        BACK: { target: 'recipient' },
        SUBMIT_NAME: {
          target: 'creating',
          actions: {
            type: 'setNameRelation',
            params: ({ event }) => ({
              name: event.name,
              category: event.category,
              detail: event.detail,
            }),
          },
        },
      },
    },

    creating: {
      description: 'POST /guestbook 호출 중 (참석 기록 생성)',
      on: {
        CREATE_SUCCESS: {
          target: 'amount',
          actions: [
            'clearError',
            {
              type: 'setEntryId',
              params: ({ event }) => ({ id: event.entryId }),
            },
          ],
        },
        CREATE_ERROR: {
          target: 'name',
          actions: {
            type: 'setError',
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    amount: {
      description: '금액 선택',
      on: {
        BACK: { target: 'name' },
        SELECT_AMOUNT: {
          target: 'transfer',
          actions: {
            type: 'setAmount',
            params: ({ event }) => ({ amount: event.amount }),
          },
        },
        SKIP_AMOUNT: { target: 'message' },
        ALREADY_PAID: { target: 'message' },
      },
    },

    transfer: {
      description: '축의 전달 (계좌 복사 / 딥링크)',
      on: {
        BACK: { target: 'amount' },
        CONFIRM_TRANSFER: {
          target: 'transferring',
          actions: {
            type: 'setPayMethod',
            params: ({ event }) => ({ payMethod: event.payMethod }),
          },
        },
      },
    },

    transferring: {
      description: 'POST /cash-gifts 호출 중',
      on: {
        TRANSFER_SUCCESS: {
          target: 'message',
          actions: [
            'clearError',
            {
              type: 'setCashGiftId',
              params: ({ event }) => ({ id: event.cashGiftId }),
            },
          ],
        },
        TRANSFER_ERROR: {
          target: 'transfer',
          actions: {
            type: 'setError',
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    message: {
      description: '메세지 작성 또는 하트 전송',
      on: {
        BACK: { target: 'amount' },
        SEND_MESSAGE: {
          target: 'sendingMessage',
          actions: {
            type: 'setPendingMessage',
            params: ({ event }) => ({ message: event.message }),
          },
        },
        SEND_HEART: {
          target: 'sendingMessage',
          actions: {
            type: 'setPendingMessage',
            params: () => ({ message: '__HEART__' }),
          },
        },
      },
    },

    sendingMessage: {
      description: 'POST /guestbook/{entryId}/message 호출 중',
      on: {
        MESSAGE_SUCCESS: {
          target: 'done',
          actions: 'clearError',
        },
        MESSAGE_ERROR: {
          target: 'message',
          actions: {
            type: 'setError',
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    done: {
      description: '전송 완료',
      on: {
        RESTART: {
          target: 'recipient',
          actions: 'resetContext',
        },
      },
    },
  },
});
