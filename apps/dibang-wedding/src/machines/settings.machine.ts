import { setup, assign } from 'xstate';

// settings.machine — SettingsPage flow (XS-17).
// parallel 2축: save(마케팅 동의 저장 idle/saving) + toast(저장 알림 자동닫힘 2초).
// 사용자/동의값(me, userOverride)은 React Query/useState가 SSOT —
// 머신은 저장 진행 + 토스트 표시 flow만 제어(STATE_MANAGEMENT §4).

export interface SettingsContext {
  toastMsg: string;
}

export type SettingsEvent =
  | { type: 'SAVE' }
  | { type: 'SAVE_DONE' }
  | { type: 'SAVE_ERROR' }
  | { type: 'SHOW_TOAST'; msg: string };

export const settingsMachine = setup({
  types: { context: {} as SettingsContext, events: {} as SettingsEvent },
  actions: {
    setToast: assign({ toastMsg: (_, p: { msg: string }) => p.msg }),
  },
}).createMachine({
  id: 'settings',
  type: 'parallel',
  context: { toastMsg: '' },
  states: {
    save: {
      initial: 'idle',
      states: {
        idle: { on: { SAVE: 'saving' } },
        saving: { on: { SAVE_DONE: 'idle', SAVE_ERROR: 'idle' } },
      },
    },
    toast: {
      initial: 'hidden',
      states: {
        hidden: {
          on: {
            SHOW_TOAST: { target: 'visible', actions: { type: 'setToast', params: ({ event }) => ({ msg: event.type === 'SHOW_TOAST' ? event.msg : '' }) } },
          },
        },
        visible: {
          after: { 2000: 'hidden' },
          on: {
            SHOW_TOAST: { target: 'visible', reenter: true, actions: { type: 'setToast', params: ({ event }) => ({ msg: event.type === 'SHOW_TOAST' ? event.msg : '' }) } },
          },
        },
      },
    },
  },
});
