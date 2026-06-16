/**
 * useRealtimeChannel — Supabase Realtime 채널 구독 effect 검증.
 *
 * 책임:
 *  - enabled=true (기본): supabase.channel(name).on(event).subscribe() 호출.
 *  - on 콜백이 트리거되면 onChange() 호출 (queries 레이어 invalidate용).
 *  - unmount 또는 enabled=false 전환 시 removeChannel.
 *  - deps는 [channelName, enabled]만 — event/onChange의 안정성은 호출처 책임.
 *
 * `../../lib/supabase`의 getSupabaseClient를 vi.mock으로 가짜 client 노출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const subscribe = vi.fn()
const removeChannel = vi.fn()
const channel = vi.fn()
const on = vi.fn()

// supabase.channel(name).on('postgres_changes', event, cb).subscribe()
// 체이닝을 흉내내는 builder.
function makeChannel() {
  const ch = {
    on: (_evt: string, _opts: unknown, cb: () => void) => {
      on(_evt, _opts, cb)
      return ch
    },
    subscribe: () => {
      subscribe()
      return ch
    },
  }
  return ch
}

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    channel: (name: string) => {
      channel(name)
      return makeChannel()
    },
    removeChannel: (ch: unknown) => removeChannel(ch),
  }),
}))

import { useRealtimeChannel } from './useRealtimeChannel'

afterEach(() => {
  subscribe.mockReset()
  removeChannel.mockReset()
  channel.mockReset()
  on.mockReset()
})

describe('useRealtimeChannel', () => {
  it('enabled=true (기본): supabase.channel(name) + on + subscribe 호출', () => {
    const onChange = vi.fn()
    renderHook(() =>
      useRealtimeChannel('ch-1', { schema: 'public', table: 't' }, onChange),
    )
    expect(channel).toHaveBeenCalledWith('ch-1')
    expect(on).toHaveBeenCalled()
    // postgres_changes 이벤트 메타 + 콜백
    const [evt, opts, cb] = on.mock.calls[0]
    expect(evt).toBe('postgres_changes')
    expect(opts).toEqual({ event: '*', schema: 'public', table: 't' })
    expect(typeof cb).toBe('function')
    expect(subscribe).toHaveBeenCalledTimes(1)
  })

  it('on 콜백 트리거 → onChange() 호출', () => {
    const onChange = vi.fn()
    renderHook(() =>
      useRealtimeChannel('ch-2', { schema: 'public', table: 't' }, onChange),
    )
    const cb = on.mock.calls[0][2] as () => void
    cb()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('enabled=false → 구독 안 함', () => {
    renderHook(() =>
      useRealtimeChannel('ch-3', { schema: 'public', table: 't' }, vi.fn(), false),
    )
    expect(channel).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('unmount → removeChannel 호출 (React 19 strict 더블 cleanup 허용)', () => {
    const { unmount } = renderHook(() =>
      useRealtimeChannel('ch-4', { schema: 'public', table: 't' }, vi.fn()),
    )
    const before = removeChannel.mock.calls.length
    unmount()
    expect(removeChannel.mock.calls.length).toBeGreaterThan(before)
  })

  it('event.filter도 전달', () => {
    renderHook(() =>
      useRealtimeChannel(
        'ch-5',
        { schema: 'public', table: 't', filter: 'id=eq.1' },
        vi.fn(),
      ),
    )
    expect(on.mock.calls[0][1]).toEqual({
      event: '*',
      schema: 'public',
      table: 't',
      filter: 'id=eq.1',
    })
  })
})
