/**
 * 쪽지(DM) hook — Walrus 저장 + Sui NoteSent 이벤트로 비동기 쪽지.
 * Seal 암호화는 후속(현재 평문으로 Walrus 저장 → NoteSent 이벤트).
 */
import { useCallback, useEffect, useState } from 'react'
import {
  createJsonRpcClient,
  walrusStore,
  walrusFetch,
  buildCreateNoteBoxTx,
  buildSendNoteTx,
  getNoteSentEvents,
  type SuiNetwork,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'

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
  const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'

  const fetchNotes = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const client = createJsonRpcClient(network)
      const events = await getNoteSentEvents(client, address)
      const decoded = await Promise.all(
        events.map(async (e) => {
          try {
            const blob = await walrusFetch(e.blobId)
            return { from: e.from, to: e.to, text: new TextDecoder().decode(blob), ts: e.ts, noteBoxId: e.noteBoxId }
          } catch {
            return { from: e.from, to: e.to, text: '(읽을 수 없음)', ts: e.ts, noteBoxId: e.noteBoxId }
          }
        }),
      )
      setNotes(decoded.sort((a, b) => a.ts - b.ts))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [address, network])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const sendNote = useCallback(
    async (to: string, text: string, noteBoxId?: string) => {
      if (!address) throw new Error('로그인 필요')
      let boxId = noteBoxId
      if (!boxId) {
        const digest = await executeOnchain(buildCreateNoteBoxTx({ other: to }))
        // NoteBoxCreated 이벤트에서 ID 추출 — 간단히 digest 사용(실제로는 objectChanges에서 추출)
        boxId = digest
      }
      const blob = new TextEncoder().encode(text)
      const blobId = await walrusStore(blob)
      const blobIdBytes = new TextEncoder().encode(blobId)
      await executeOnchain(buildSendNoteTx({ noteBoxId: boxId, to, blobId: blobIdBytes }))
      await fetchNotes()
    },
    [address, executeOnchain, fetchNotes],
  )

  return { notes, loading, sendNote, refetch: fetchNotes }
}
