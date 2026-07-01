// W06 #4 분리:
// GuestFlowPage가 들고 있던 "머신 상태 진입 → mutation 자동 발사 + send 이벤트" 합성을
// 한 훅으로 모은다. page는 machine 상태 → 스텝 렌더에만 집중.
//
// - GBDUP-1 / DUP2-1: 머신 가드는 '중복 이벤트'만 막는다. effect는 머신 상태 진입을
//   트리거로 mutation을 '직접' 호출하므로, React StrictMode(dev)의 effect 2회 발사가
//   그대로 POST 2회로 새어나간다. firedRef 가드로 상태당 1회만 발사.
// - recipient 복귀(RESTART) 시 firedRef 초기화.
// - 각 POST 단계의 진입/에러복귀 상태로 돌아오면 가드 해제 → 정상 재시도 허용.

import { useCallback, useEffect, useRef } from 'react';
import type { StateFrom } from 'xstate';
import type { Wedding } from '@gorae/contracts';
import { guestFlowMachine, type GuestFlowEvent } from '../../machines/guestFlow.machine';
import { useCreateGuestbookEntryMutation } from '../../queries/guestFlow/useCreateGuestbookEntryMutation';
import { useCreateGuestbookMessageMutation } from '../../queries/guestFlow/useCreateGuestbookMessageMutation';
import { useCreateCashGiftMutation } from '../../queries/guestFlow/useCreateCashGiftMutation';
import { useZkLogin } from '../../providers/ZkLoginProvider';
import { buildParticipateTx, buildGiveTx, buildWriteTx, buildWriteMessageTx, walrusStoreString, walrusStorePIIString, ONCHAIN_BLOB_EPOCHS } from '@gorae/sui-sdk';
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainWedding, getOnchainParticipation } from '@gorae/contracts/sdk.gen';
import type { RecipientSlot } from '../../machines/guestFlow.machine';

type GuestFlowState = StateFrom<typeof guestFlowMachine>;
type Send = (event: GuestFlowEvent) => void;

/** 수신 슬롯 → u8 코드(§1-6, write_message·rsvp 공통). */
const SLOT_CODE: Record<RecipientSlot, number> = {
  groom: 0, bride: 1, groom_father: 2, groom_mother: 3, bride_father: 4, bride_mother: 5,
};
/** 하트 전송용 sentinel(본문 아님 — 온체인 본문 기록 대상에서 제외). */
const HEART_SENTINEL = '__HEART__';

export function useGuestFlowSubmitter(
  state: GuestFlowState,
  send: Send,
  wedding: Wedding | undefined,
) {
  const createEntryMutation = useCreateGuestbookEntryMutation();
  const createMessageMutation = useCreateGuestbookMessageMutation();
  const cashGiftMutation = useCreateCashGiftMutation();
  const zk = useZkLogin();

  // StrictMode 가드: 상태당 1회만 발사.
  const firedRef = useRef<Set<string>>(new Set());
  // 단일 participate 보장: give 경로(transferring)와 done 경로가 동시에 호출해도 participate는 1회만.
  // event::participate는 온체인 멱등성이 없어(중복 시 Participation SBT·CS 신호 이중 계상) 클라이언트가 보장한다.
  const participateRef = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    if (state.matches('recipient')) { firedRef.current.clear(); participateRef.current = null; }
    if (state.matches('name')) firedRef.current.delete('creating');
    if (state.matches('transfer')) firedRef.current.delete('transferring');
    if (state.matches('message')) firedRef.current.delete('sendingMessage');
  }, [state]);

  // 참가 보장 — 기존 Participation이 있으면 그 ID, 없으면 1회만 participate 후 ID. 동시 호출은 같은 promise 공유.
  const ensureParticipation = useCallback(
    (eventId: string, address: string): Promise<string | null> => {
      if (!participateRef.current) {
        const p = (async () => {
          let pid = (await getOnchainParticipation({ path: { address }, query: { eventId }, throwOnError: true })).data?.id ?? null;
          if (!pid) {
            await zk.executeOnchain(buildParticipateTx({ eventId, roleId: 1 }));
            pid = (await getOnchainParticipation({ path: { address }, query: { eventId }, throwOnError: true })).data?.id ?? null;
          }
          return pid;
        })();
        // 실패 시 거부된 promise를 캐싱하지 않도록 ref를 비워 재시도를 허용.
        p.catch(() => { if (participateRef.current === p) participateRef.current = null; });
        participateRef.current = p;
      }
      return participateRef.current;
    },
    [zk],
  );

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
        onSuccess: (data) => {
          send({ type: 'TRANSFER_SUCCESS', cashGiftId: data.id });
          // 온체인 부조(give) — zkLogin 인증 시 participate → give fire-and-forget.
          // ⚠️ 온체인 호출엔 DB UUID(wedding.id)가 아니라 온체인 Wedding 객체 ID(sui_wedding_id)를
          //    써야 한다. 과거 wedding.id를 넘겨 getWedding(객체조회)이 조용히 실패 → give 무동작이던 버그 정정.
          const suiWeddingId = wedding?.sui_wedding_id ?? null;
          const address = zk.address;
          if (zk.isAuthenticated && address && suiWeddingId) {
            getOnchainWedding({ path: { weddingId: suiWeddingId }, throwOnError: true })
              .then(async (res) => {
                const w = res.data;
                if (!w?.eventId || !w?.vaultId) return;
                // 1) participate(단일 보장 — done 경로와 공유)
                const partId = await ensureParticipation(w.eventId, address);
                if (!partId) return;
                // 2) give(SUI 전송)
                const amount = BigInt(c.amount) * 1_000_000n; // 원 → MIST(데모 환산)
                await zk.executeOnchain(buildGiveTx({ vaultId: w.vaultId, weddingId: suiWeddingId, participationId: partId, amount }));
              })
              .catch((e) => {
                console.error('[give] onchain failed:', e);
                send({ type: 'TRANSFER_ERROR', error: `온체인 전송 실패: ${(e as Error).message?.slice(0, 80) ?? '알 수 없는 오류'}` });
              });
          }
        },
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

  // done 진입 → 온체인 participate(+ 방명록 write) 1회. zkLogin 인증 시에만.
  const isDone = state.matches('done');
  useEffect(() => {
    // 온체인 호출엔 sui_wedding_id(온체인 객체 ID)를 쓴다(DB UUID 아님).
    const suiWeddingId = wedding?.sui_wedding_id ?? null;
    const address = zk.address;
    if (!isDone || !zk.isAuthenticated || !suiWeddingId || !address) return;
    if (firedRef.current.has('participate')) return;
    firedRef.current.add('participate');
    // 방명록을 남겼는지(creating 단계에서 GuestbookEntry 생성됨) → 온체인 write 대상 여부.
    const wroteGuestbook = !!state.context.guestbookEntryId;
    // 실제 축하 본문(하트 sentinel·빈 값 제외) → write_message로 본문을 Walrus blobId로 남길 대상.
    const pending = state.context.pendingMessage;
    const hasBody = !!pending && pending !== HEART_SENTINEL;
    const slotCode = SLOT_CODE[state.context.recipientSlot ?? 'groom'] ?? 0;
    (async () => {
      const w = (await getOnchainWedding({ path: { weddingId: suiWeddingId }, throwOnError: true })).data;
      if (!w?.eventId) return;
      // 1) participate(단일 보장 — give 경로와 공유, 이중 발행 방지)
      const partId = await ensureParticipation(w.eventId, address);
      if (!partId) return;
      // 2) 방명록 작성 → 온체인 기록. 본문·이름 모두 Walrus blobId 참조만 온체인에 싣는다(평문 금지, VISION §7).
      if (hasBody) {
        // 본문·이름 → Walrus → write_message(message=blobId, guest_name=nameBlobId).
        // 온체인엔 본문·이름 평문 없이 Walrus 참조만 남는다(이름 → Walrus → Sui 연결).
        // blobId가 온체인에 남으므로 내구 epoch로 저장(짧으면 GC 후 온체인 참조 dangling).
        const messageBlobId = await walrusStoreString(pending, { epochs: ONCHAIN_BLOB_EPOCHS });
        const name = state.context.guestName;
        const nameBlobId = name?.trim() ? await walrusStorePIIString(name, { epochs: ONCHAIN_BLOB_EPOCHS }) : '';
        await zk.executeOnchain(buildWriteMessageTx({ weddingId: suiWeddingId, participationId: partId, messageBlobId, recipientSlot: slotCode, guestName: nameBlobId }));
      } else if (wroteGuestbook) {
        await zk.executeOnchain(buildWriteTx({ weddingId: suiWeddingId, participationId: partId }));
      }
    })().catch((e) => {
      console.error('[participate/write] failed:', e);
      send({ type: 'MESSAGE_ERROR', error: `온체인 기록 실패: ${(e as Error).message?.slice(0, 80) ?? '알 수 없는 오류'}` });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);
}
