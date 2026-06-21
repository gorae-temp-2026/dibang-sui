// W06 #4 분리:
// GuestFlowPage가 들고 있던 "머신 상태 진입 → mutation 자동 발사 + send 이벤트" 합성을
// 한 훅으로 모은다. page는 machine 상태 → 스텝 렌더에만 집중.
//
// - GBDUP-1 / DUP2-1: 머신 가드는 '중복 이벤트'만 막는다. effect는 머신 상태 진입을
//   트리거로 mutation을 '직접' 호출하므로, React StrictMode(dev)의 effect 2회 발사가
//   그대로 POST 2회로 새어나간다. firedRef 가드로 상태당 1회만 발사.
// - recipient 복귀(RESTART) 시 firedRef 초기화.
// - 각 POST 단계의 진입/에러복귀 상태로 돌아오면 가드 해제 → 정상 재시도 허용.

import { useEffect, useRef } from 'react';
import type { StateFrom } from 'xstate';
import type { Wedding } from '@gorae/contracts';
import { guestFlowMachine, type GuestFlowEvent } from '../../machines/guestFlow.machine';
import { useCreateGuestbookEntryMutation } from '../../queries/guestFlow/useCreateGuestbookEntryMutation';
import { useCreateGuestbookMessageMutation } from '../../queries/guestFlow/useCreateGuestbookMessageMutation';
import { useCreateCashGiftMutation } from '../../queries/guestFlow/useCreateCashGiftMutation';

type GuestFlowState = StateFrom<typeof guestFlowMachine>;
type Send = (event: GuestFlowEvent) => void;

export function useGuestFlowSubmitter(
  state: GuestFlowState,
  send: Send,
  wedding: Wedding | undefined,
) {
  const createEntryMutation = useCreateGuestbookEntryMutation();
  const createMessageMutation = useCreateGuestbookMessageMutation();
  const cashGiftMutation = useCreateCashGiftMutation();

  // StrictMode 가드: 상태당 1회만 발사.
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (state.matches('recipient')) firedRef.current.clear();
    if (state.matches('name')) firedRef.current.delete('creating');
    if (state.matches('transfer')) firedRef.current.delete('transferring');
    if (state.matches('message')) firedRef.current.delete('sendingMessage');
  }, [state]);

  // creating 진입 → POST /guestbook 1회
  const isCreating = state.matches('creating');
  useEffect(() => {
    if (!isCreating || !wedding) return;
    if (firedRef.current.has('creating')) return;
    firedRef.current.add('creating');
    const c = state.context;
    createEntryMutation.mutate(
      {
        loungeId: wedding.lounge.id,
        body: {
          guest_name: c.guestName,
          recipient_slot: c.recipientSlot!,
          relation_category: c.relationCategory!,
          relation_detail: c.relationDetail || undefined,
        },
      },
      {
        onSuccess: (data) => send({ type: 'CREATE_SUCCESS', entryId: data.id }),
        onError: (error) => send({ type: 'CREATE_ERROR', error: (error as Error).message }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreating]);

  // transferring 진입 → POST /cash-gifts 1회
  const isTransferring = state.matches('transferring');
  useEffect(() => {
    if (!isTransferring) return;
    if (firedRef.current.has('transferring')) return;
    firedRef.current.add('transferring');
    const c = state.context;
    cashGiftMutation.mutate(
      {
        wedding_id: c.weddingId,
        guest_name: c.guestName,
        recipient_slot: c.recipientSlot!,
        relation_category: c.relationCategory!,
        relation_detail: c.relationDetail || undefined,
        amount: c.amount,
        pay_method: c.payMethod!,
        // 같은 게스트 플로우 세션의 GuestbookEntry(creating 단계에서 생성, transferring 선행)
        // 와 축의를 연결 → attended(참석) 도출 기준. null이면 생략(불참).
        guestbook_entry_id: c.guestbookEntryId ?? undefined,
      },
      {
        // cutover(2026-06-21): 온체인 부조(give)는 하객 Participation(온체인 신원, 참가-먼저)을 요구한다.
        // guest-web은 §2(비로그인 익명 퍼널)라 그 흐름이 없어 여기서 온체인 give를 하지 않는다 — Supabase 저장만(전환기).
        // 온체인 부조는 로그인 본체(dibang-wedding)에서 처리. (구 sendCashGift 제거.)
        onSuccess: (data) => send({ type: 'TRANSFER_SUCCESS', cashGiftId: data.id }),
        onError: (error) => send({ type: 'TRANSFER_ERROR', error: (error as Error).message }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransferring]);

  // sendingMessage 진입 → POST /guestbook/{id}/message 1회
  const isSendingMessage = state.matches('sendingMessage');
  useEffect(() => {
    if (!isSendingMessage) return;
    if (firedRef.current.has('sendingMessage')) return;
    firedRef.current.add('sendingMessage');
    const c = state.context;
    createMessageMutation.mutate(
      { entryId: c.guestbookEntryId!, message: c.pendingMessage },
      {
        // cutover: 온체인 방명록(write)도 Participation 요구 → guest-web 미수행(dibang에서 처리). Supabase 저장만.
        onSuccess: () => send({ type: 'MESSAGE_SUCCESS' }),
        onError: (error) => send({ type: 'MESSAGE_ERROR', error: (error as Error).message }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSendingMessage]);
}
