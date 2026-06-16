// mecdisplay 워크스트림 데이터 라이브피드 훅(SCENARIOS §3 S-01·S-04).
//
// DisplayPage가 가지고 있던 (a) supabase Realtime 채널 두 개 구독 + 재시도
// (b) 시드 fetch(entries + messages) (c) catch-up fetch (d) envelope/sticker
// dispatch 책임을 한 훅으로 묶는다. page는 UI state(visible, notice, sticker 큐)
// 와 렌더링만 담당.
//
// 외부에서 envelope 큐 액션(addLiveEnvelope/seedHistory)과 sticker 액션(addSticker)
// 그리고 machine send(채널 상태 전이)를 주입받는다. 훅 내부에서는 supabase client만
// lazy로 가져와 캡슐화한다(C2 해소).
//
// __HEART__ sentinel 분기 의미 보존: 시드에서는 제외, Realtime/catch-up live 이벤트에서는
// sticker 발사. envelope 카드에는 '__HEART__' 글자가 떠오르지 않는다.
//
// 의존 모듈:
//   - lib/supabase.getSupabaseClient (lazy)
//   - lib/displayQueries (fetchRecent* / fetchSince* / envelopeFromXxxPayload)
//   - components/display/constants.RECONNECT_DELAY_MS
//   - components/display/infoMessages.DEFAULT_SEED_MESSAGES

import { useEffect, useRef } from 'react'

import { RECONNECT_DELAY_MS } from '../../components/display/constants'
import { DEFAULT_SEED_MESSAGES } from '../../components/display/infoMessages'
import type { EnvelopeBase } from '../../components/display/types'
import { getSupabaseClient } from '../../lib/supabase'
import {
  envelopeFromEntryPayload,
  envelopeFromMessagePayload,
  fetchEntriesSince,
  fetchMessagesSince,
  fetchRecentEntries,
  fetchRecentMessages,
} from '../../lib/displayQueries'

// DisplayPage(이전)에서 정의되어 있던 sentinel을 훅 안으로 옮겨 책임을 묶는다.
const HEART_SENTINEL = '__HEART__'

export interface DisplayLiveFeedDeps {
  /** wedding 로드 후 결정되는 라운지 식별자. 없으면 훅은 idle. */
  loungeId: string | null
  /** live(또는 catch-up) envelope 한 건을 카드 큐에 푸시. useEnvelopeQueue 반환값. */
  addLiveEnvelope: (item: EnvelopeBase) => void
  /** 시드된 히스토리를 큐 historyRef에 적재(replay 시드). useEnvelopeQueue 반환값. */
  seedHistory: (items: EnvelopeBase[]) => void
  /** __HEART__ sentinel 수신 시 SVG 하트 sticker를 한 건 발사. */
  addSticker: () => void
  /** displayMachine send. 구독 상태(SUBSCRIBE_OK/ERROR/TIMEOUT, RETRY) 전이용. */
  send: (event:
    | { type: 'SUBSCRIBE_OK' }
    | { type: 'SUBSCRIBE_ERROR' }
    | { type: 'SUBSCRIBE_TIMEOUT' }
    | { type: 'RETRY' }
  ) => void
}

/**
 * loungeId가 주어지면 시드 fetch + Realtime 두 채널(entries/messages) 구독을
 * 시작하고, 채널 SUBSCRIBED 시점에 catch-up을 한 번 돌린다. CHANNEL_ERROR/TIMED_OUT
 * 시 RECONNECT_DELAY_MS 후 재구독을 시도한다. cleanup에서 채널을 unsubscribe.
 *
 * side-effect only 훅. 반환값 없음.
 */
export function useDisplayLiveFeed({
  loungeId,
  addLiveEnvelope,
  seedHistory,
  addSticker,
  send,
}: DisplayLiveFeedDeps): void {
  // ─── 시드 히스토리(entries + messages) ────────────────────────────
  // __HEART__ sentinel은 카드 큐에 안 넣음(envelope 텍스트에 '__HEART__' 글자가 그대로
  // 떠오르는 것을 방지). 시드 단계에서는 sticker 트리거도 하지 않는다(레거시 V2와
  // 동일하게 Realtime 라이브 이벤트에서만 sticker 발사).
  useEffect(() => {
    if (!loungeId) return
    const supabase = getSupabaseClient()
    let cancelled = false
    ;(async () => {
      const [entries, messages] = await Promise.all([
        fetchRecentEntries(supabase, loungeId),
        fetchRecentMessages(supabase, loungeId),
      ])
      if (cancelled) return
      const merged = [...entries, ...messages]
        .filter((m) => m.message !== HEART_SENTINEL)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const seedBase: EnvelopeBase[] = merged.map((m) => ({
        guestName: m.guestName,
        guestAffiliation: m.guestAffiliation,
        message: m.message,
        side: m.side,
      }))
      seedHistory([...DEFAULT_SEED_MESSAGES, ...seedBase])
    })()
    return () => { cancelled = true }
  }, [loungeId, seedHistory])

  // ─── Realtime 구독 두 트리거(entries, messages) + catch-up ────────
  // 출처가 entry/message 둘이어도 화면 카드는 단일 포맷(SCENARIOS §0 카드 모델).
  const lastEntryAtRef = useRef<string | null>(null)
  const lastMessageAtRef = useRef<string | null>(null)

  useEffect(() => {
    if (!loungeId) return
    const supabase = getSupabaseClient()

    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let entriesChannel: ReturnType<typeof supabase.channel> | null = null
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null
    let destroyed = false

    async function catchUp() {
      if (!loungeId) return
      if (lastEntryAtRef.current) {
        const missed = await fetchEntriesSince(supabase, loungeId, lastEntryAtRef.current)
        for (const m of missed) {
          if (m.message === HEART_SENTINEL) { addSticker(); lastEntryAtRef.current = m.createdAt; continue }
          addLiveEnvelope({ guestName: m.guestName, guestAffiliation: m.guestAffiliation, message: m.message, side: m.side })
          lastEntryAtRef.current = m.createdAt
        }
      }
      if (lastMessageAtRef.current) {
        const missed = await fetchMessagesSince(supabase, loungeId, lastMessageAtRef.current)
        for (const m of missed) {
          if (m.message === HEART_SENTINEL) { addSticker(); lastMessageAtRef.current = m.createdAt; continue }
          addLiveEnvelope({ guestName: m.guestName, guestAffiliation: m.guestAffiliation, message: m.message, side: m.side })
          lastMessageAtRef.current = m.createdAt
        }
      }
    }

    function subscribeEntries() {
      const ch = supabase
        .channel(`display:entries:${loungeId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'v3_guestbook_entries', filter: `lounge_id=eq.${loungeId}` },
          (payload) => {
            const env = envelopeFromEntryPayload(payload.new as Parameters<typeof envelopeFromEntryPayload>[0])
            if (!env) return
            lastEntryAtRef.current = env.createdAt
            if (env.message === HEART_SENTINEL) { addSticker(); return }
            addLiveEnvelope({ guestName: env.guestName, guestAffiliation: env.guestAffiliation, message: env.message, side: env.side })
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') { send({ type: 'SUBSCRIBE_OK' }); catchUp() }
          if (status === 'CHANNEL_ERROR') {
            send({ type: 'SUBSCRIBE_ERROR' })
            supabase.removeChannel(ch)
            if (retryTimer) clearTimeout(retryTimer)
            retryTimer = setTimeout(() => { if (!destroyed) { send({ type: 'RETRY' }); subscribeEntries() } }, RECONNECT_DELAY_MS)
          }
          if (status === 'TIMED_OUT') {
            send({ type: 'SUBSCRIBE_TIMEOUT' })
            supabase.removeChannel(ch)
            send({ type: 'RETRY' })
            subscribeEntries()
          }
        })
      entriesChannel = ch
    }

    function subscribeMessages() {
      const ch = supabase
        .channel(`display:messages:${loungeId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'v3_guestbook_messages', filter: `lounge_id=eq.${loungeId}` },
          async (payload) => {
            const row = payload.new as { id: string; message: string; created_at: string; guestbook_entry_id: string }
            if (row.message === HEART_SENTINEL) {
              lastMessageAtRef.current = row.created_at
              addSticker()
              return
            }
            const env = await envelopeFromMessagePayload(supabase, row)
            if (!env) return
            lastMessageAtRef.current = env.createdAt
            addLiveEnvelope({ guestName: env.guestName, guestAffiliation: env.guestAffiliation, message: env.message, side: env.side })
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            supabase.removeChannel(ch)
            if (retryTimer) clearTimeout(retryTimer)
            retryTimer = setTimeout(() => { if (!destroyed) subscribeMessages() }, RECONNECT_DELAY_MS)
          }
          if (status === 'TIMED_OUT') {
            supabase.removeChannel(ch)
            subscribeMessages()
          }
        })
      messagesChannel = ch
    }

    subscribeEntries()
    subscribeMessages()

    return () => {
      destroyed = true
      if (retryTimer) clearTimeout(retryTimer)
      if (entriesChannel) supabase.removeChannel(entriesChannel)
      if (messagesChannel) supabase.removeChannel(messagesChannel)
    }
    // addLiveEnvelope/addSticker/send는 호출처에서 stable. loungeId만이 진짜 deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loungeId])
}
