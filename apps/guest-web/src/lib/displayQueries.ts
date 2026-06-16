// mecdisplay 워크스트림(SCENARIOS §3 S-01·S-04 데이터 flow).
//
// 카드는 한 종류: entry(이름·관계) + 본문(message) = 1 카드.
// 시드 fetch:
//   - guestbook_entries: entry.message가 비어있지 않으면 카드 후보
//   - guestbook_messages: entry 정보 join + message 본문
// catch-up fetch: 위 둘에 created_at > lastReceivedAt 조건만 추가.
// photo_url은 SCENARIOS §1-3에 따라 무시(텍스트만 카드화).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EnvelopeBase } from '../components/display/types'

export type EnvelopeBaseWithTime = EnvelopeBase & { createdAt: string }

interface EntryRow {
  id: string
  guest_name: string
  recipient_slot: string
  relation_category: string | null
  relation_detail: string | null
  message: string | null
  created_at: string
}

interface MessageRow {
  id: string
  message: string
  created_at: string
  v3_guestbook_entries: {
    guest_name: string
    recipient_slot: string
    relation_category: string | null
    relation_detail: string | null
  } | null
}

// recipient_slot('groom'/'bride'/...) → side('groom'/'bride'/undefined) 매핑
function sideOf(slot: string | undefined): 'groom' | 'bride' | undefined {
  if (slot === 'groom' || slot === 'groom_father' || slot === 'groom_mother') return 'groom'
  if (slot === 'bride' || slot === 'bride_father' || slot === 'bride_mother') return 'bride'
  return undefined
}

function affiliationOf(category: string | null, detail: string | null): string {
  if (detail) return detail
  return category ?? ''
}

function entryToEnvelope(row: EntryRow): EnvelopeBaseWithTime | null {
  if (!row.message || row.message.trim() === '') return null
  return {
    guestName: row.guest_name,
    guestAffiliation: affiliationOf(row.relation_category, row.relation_detail),
    message: row.message,
    side: sideOf(row.recipient_slot),
    createdAt: row.created_at,
  }
}

function messageToEnvelope(row: MessageRow): EnvelopeBaseWithTime | null {
  if (!row.message || row.message.trim() === '') return null
  const e = row.v3_guestbook_entries
  return {
    guestName: e?.guest_name ?? '',
    guestAffiliation: e ? affiliationOf(e.relation_category, e.relation_detail) : '',
    message: row.message,
    side: sideOf(e?.recipient_slot),
    createdAt: row.created_at,
  }
}

export async function fetchRecentEntries(
  supabase: SupabaseClient,
  loungeId: string,
  limit = 50,
): Promise<EnvelopeBaseWithTime[]> {
  const { data, error } = await supabase
    .from('v3_guestbook_entries')
    .select('id, guest_name, recipient_slot, relation_category, relation_detail, message, created_at')
    .eq('lounge_id', loungeId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn('[displayQueries.fetchRecentEntries]', error.message)
    return []
  }

  return (data ?? []).map((r) => entryToEnvelope(r as EntryRow)).filter((e): e is EnvelopeBaseWithTime => e !== null)
}

export async function fetchRecentMessages(
  supabase: SupabaseClient,
  loungeId: string,
  limit = 50,
): Promise<EnvelopeBaseWithTime[]> {
  const { data, error } = await supabase
    .from('v3_guestbook_messages')
    .select('id, message, created_at, v3_guestbook_entries!inner(guest_name, recipient_slot, relation_category, relation_detail)')
    .eq('lounge_id', loungeId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn('[displayQueries.fetchRecentMessages]', error.message)
    return []
  }

  return (data ?? []).map((r) => messageToEnvelope(r as unknown as MessageRow)).filter((e): e is EnvelopeBaseWithTime => e !== null)
}

export async function fetchEntriesSince(
  supabase: SupabaseClient,
  loungeId: string,
  since: string,
): Promise<EnvelopeBaseWithTime[]> {
  const { data, error } = await supabase
    .from('v3_guestbook_entries')
    .select('id, guest_name, recipient_slot, relation_category, relation_detail, message, created_at')
    .eq('lounge_id', loungeId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[displayQueries.fetchEntriesSince]', error.message)
    return []
  }

  return (data ?? []).map((r) => entryToEnvelope(r as EntryRow)).filter((e): e is EnvelopeBaseWithTime => e !== null)
}

export async function fetchMessagesSince(
  supabase: SupabaseClient,
  loungeId: string,
  since: string,
): Promise<EnvelopeBaseWithTime[]> {
  const { data, error } = await supabase
    .from('v3_guestbook_messages')
    .select('id, message, created_at, v3_guestbook_entries!inner(guest_name, recipient_slot, relation_category, relation_detail)')
    .eq('lounge_id', loungeId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[displayQueries.fetchMessagesSince]', error.message)
    return []
  }

  return (data ?? []).map((r) => messageToEnvelope(r as unknown as MessageRow)).filter((e): e is EnvelopeBaseWithTime => e !== null)
}

// Realtime payload(postgres_changes) → EnvelopeBase 정규화.
// guestbook_entries INSERT payload는 본문/identity 모두 같은 row.
export function envelopeFromEntryPayload(row: EntryRow): EnvelopeBaseWithTime | null {
  return entryToEnvelope(row)
}

// guestbook_messages INSERT payload는 entry join이 없음 — 호출부에서 별도 fetch 후 매핑.
export async function envelopeFromMessagePayload(
  supabase: SupabaseClient,
  payload: { id: string; message: string; created_at: string; guestbook_entry_id: string },
): Promise<EnvelopeBaseWithTime | null> {
  if (!payload.message || payload.message.trim() === '') return null

  const { data, error } = await supabase
    .from('v3_guestbook_entries')
    .select('guest_name, recipient_slot, relation_category, relation_detail')
    .eq('id', payload.guestbook_entry_id)
    .maybeSingle()

  if (error || !data) {
    console.warn('[displayQueries.envelopeFromMessagePayload] entry fetch failed:', error?.message)
    return {
      guestName: '',
      guestAffiliation: '',
      message: payload.message,
      createdAt: payload.created_at,
    }
  }

  return {
    guestName: data.guest_name,
    guestAffiliation: affiliationOf(data.relation_category, data.relation_detail),
    message: payload.message,
    side: sideOf(data.recipient_slot),
    createdAt: payload.created_at,
  }
}
