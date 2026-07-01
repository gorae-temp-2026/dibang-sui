/**
 * 쪽지(DM) hook — Walrus 저장 + Sui NoteSent 이벤트로 비동기 쪽지.
 * 온체인 읽기는 Go API 프록시(/onchain/*), TX·Walrus는 SDK 유지.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  walrusStore,
  walrusFetch,
  buildCreateNoteBoxTx,
  buildSendNoteTx,
} from '@gorae/sui-sdk'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시.
import { getOnchainNotesSent, getOnchainAnyParticipation, getOnchainNoteBoxes } from '@gorae/contracts/sdk.gen'
import type { OnchainNoteBoxCreated } from '@gorae/contracts'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { translate, useLangStore } from '../lib/i18n'

const lang = () => useLangStore.getState().lang

export interface Note {
  from: string
  to: string
  text: string
  ts: number
  noteBoxId: string
}

export function useNotes() {
  const { address, executeOnchain } = useZkLogin()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotes = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const events = (await getOnchainNotesSent({ query: { address }, throwOnError: true })).data ?? []
      const decoded = await Promise.all(
        events.map(async (e) => {
          try {
            const blob = await walrusFetch(e.blobId)
            return { from: e.from, to: e.to, text: new TextDecoder().decode(blob), ts: e.ts, noteBoxId: e.noteBoxId }
          } catch {
            return { from: e.from, to: e.to, text: translate(lang(), 'note.unreadable'), ts: e.ts, noteBoxId: e.noteBoxId }
          }
        }),
      )
      setNotes(decoded.sort((a, b) => a.ts - b.ts))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  useEffect(() => {
    const handler = () => setTimeout(fetchNotes, 2000)
    window.addEventListener('sui:tx-success', handler)
    return () => window.removeEventListener('sui:tx-success', handler)
  }, [fetchNotes])

  const noteBoxCache = useRef<Record<string, string>>({})

  const matchBox = useCallback(
    (boxes: OnchainNoteBoxCreated[], to: string): string | null => {
      const found = boxes.find(
        (b) => (b.participantA === address && b.participantB === to) || (b.participantA === to && b.participantB === address),
      )
      return found ? found.noteBoxId : null
    },
    [address],
  )

  const findOrCreateNoteBox = useCallback(
    async (to: string): Promise<string> => {
      if (noteBoxCache.current[to]) return noteBoxCache.current[to]
      // 서버가 participant_a/b==address 로 필터한 NoteBoxCreated 목록.
      const boxes = (await getOnchainNoteBoxes({ query: { address: address ?? '' }, throwOnError: true })).data ?? []
      const existing = matchBox(boxes, to)
      if (existing) {
        noteBoxCache.current[to] = existing
        return existing
      }
      await executeOnchain(buildCreateNoteBoxTx({ other: to }))
      // read-after-write: 생성 직후 인덱서 지연 + 캐시 → 재조회 재시도(PLAN-V 지적).
      // (P1-11의 tx-success 무효화가 서버 캐시를 비우지만 인덱서 반영 윈도가 있어 폴링.)
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 800))
        const retry = (await getOnchainNoteBoxes({ query: { address: address ?? '' }, throwOnError: true })).data ?? []
        const boxId = matchBox(retry, to)
        if (boxId) {
          noteBoxCache.current[to] = boxId
          return boxId
        }
      }
      throw new Error(translate(lang(), 'note.noteBoxIdMissing'))
    },
    [address, executeOnchain, matchBox],
  )

  const sendNote = useCallback(
    async (to: string, text: string) => {
      if (!address) throw new Error(translate(lang(), 'common.errNeedLogin'))
      const part = (await getOnchainAnyParticipation({ path: { address }, throwOnError: true })).data
      if (!part?.id) throw new Error('참가 정보 없음')
      const boxId = await findOrCreateNoteBox(to)
      const blob = new TextEncoder().encode(text)
      const blobId = await walrusStore(blob)
      const blobIdBytes = new TextEncoder().encode(blobId)
      await executeOnchain(buildSendNoteTx({ noteBoxId: boxId, participationId: part.id, to, blobId: blobIdBytes }))
      await fetchNotes()
    },
    [address, executeOnchain, fetchNotes, findOrCreateNoteBox],
  )

  return { notes, loading, sendNote, refetch: fetchNotes }
}
