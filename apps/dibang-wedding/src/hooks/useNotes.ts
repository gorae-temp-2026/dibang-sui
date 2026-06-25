/**
 * 쪽지(DM) hook — Walrus 저장 + Sui NoteSent 이벤트로 비동기 쪽지.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createJsonRpcClient,
  walrusStore,
  walrusFetch,
  buildCreateNoteBoxTx,
  buildSendNoteTx,
  getNoteSentEvents,
  type SuiNetwork,
  moveTarget,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { env } from '../env'
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
  }, [address, network])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  useEffect(() => {
    const handler = () => setTimeout(fetchNotes, 2000)
    window.addEventListener('sui:tx-success', handler)
    return () => window.removeEventListener('sui:tx-success', handler)
  }, [fetchNotes])

  const noteBoxCache = useRef<Record<string, string>>({})

  const findOrCreateNoteBox = useCallback(
    async (to: string): Promise<string> => {
      if (noteBoxCache.current[to]) return noteBoxCache.current[to]
      const client = createJsonRpcClient(network)
      const events = await client.queryEvents({
        query: { MoveEventType: moveTarget('note', 'NoteBoxCreated') },
        limit: 50,
      })
      for (const e of events.data) {
        const p = e.parsedJson as Record<string, unknown>
        const a = String(p.participant_a ?? '')
        const b = String(p.participant_b ?? '')
        if ((a === address && b === to) || (a === to && b === address)) {
          const boxId = String(p.note_box_id ?? '')
          noteBoxCache.current[to] = boxId
          return boxId
        }
      }
      await executeOnchain(buildCreateNoteBoxTx({ other: to }))
      const events2 = await client.queryEvents({
        query: { MoveEventType: moveTarget('note', 'NoteBoxCreated') },
        limit: 50,
        order: 'descending',
      })
      for (const e of events2.data) {
        const p = e.parsedJson as Record<string, unknown>
        const a = String(p.participant_a ?? '')
        const b = String(p.participant_b ?? '')
        if ((a === address && b === to) || (a === to && b === address)) {
          const boxId = String(p.note_box_id ?? '')
          noteBoxCache.current[to] = boxId
          return boxId
        }
      }
      throw new Error(translate(lang(), 'note.noteBoxIdMissing'))
    },
    [address, network, executeOnchain],
  )

  const sendNote = useCallback(
    async (to: string, text: string) => {
      if (!address) throw new Error(translate(lang(), 'common.errNeedLogin'))
      const boxId = await findOrCreateNoteBox(to)
      const blob = new TextEncoder().encode(text)
      const blobId = await walrusStore(blob)
      const blobIdBytes = new TextEncoder().encode(blobId)
      await executeOnchain(buildSendNoteTx({ noteBoxId: boxId, to, blobId: blobIdBytes }))
      await fetchNotes()
    },
    [address, executeOnchain, fetchNotes, findOrCreateNoteBox],
  )

  return { notes, loading, sendNote, refetch: fetchNotes }
}
