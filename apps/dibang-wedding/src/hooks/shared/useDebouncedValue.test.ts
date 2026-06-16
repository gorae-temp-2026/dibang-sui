/**
 * useDebouncedValue — 입력 값을 delay ms 동안 안정될 때만 반영.
 *
 * 책임:
 *  - 초기 mount 직후 debounced === value.
 *  - value 변경 → delay 경과 후에만 debounced 갱신.
 *  - 연속 변경 → 마지막 변경 후 delay 경과한 값만 반영(이전 setTimeout cleanup).
 *
 * vi.useFakeTimers + advanceTimersByTime로 결정성 확보.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('초기 mount: debounced === 초기 value', () => {
    vi.useFakeTimers()
    const { result } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' },
    })
    expect(result.current).toBe('a')
  })

  it('value 변경 후 delay 경과 → debounced 갱신', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('b')
  })

  it('연속 변경 → 마지막 값만 반영 (이전 타이머 cleanup)', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 100), {
      initialProps: { v: 'x' },
    })
    rerender({ v: 'y' })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    rerender({ v: 'z' })
    act(() => {
      vi.advanceTimersByTime(99)
    })
    // 100ms 안 지났으므로 아직 'x' 유지
    expect(result.current).toBe('x')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    // 마지막 변경(z) 기준 100ms 경과 → 'z'
    expect(result.current).toBe('z')
  })
})
