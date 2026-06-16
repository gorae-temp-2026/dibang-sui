/**
 * useWarmth — items 기반 체온(°) 파생 훅.
 *
 * 책임:
 *  - computeWarmth(items)를 useMemo로 감싸 (value, label) 반환.
 *  - label은 `${value.toFixed(1)}°` 형식.
 *  - items 참조가 바뀌어야 재계산 (useMemo deps).
 *
 * computeWarmth는 lib의 순수 함수 — 통합 검증으로 동작.
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FeedItem } from '@gorae/contracts'
import { useWarmth } from './useWarmth'

describe('useWarmth', () => {
  it('빈 items: 숫자 value + "°" 접미 label', () => {
    const { result } = renderHook(() => useWarmth([]))
    expect(typeof result.current.value).toBe('number')
    expect(result.current.label.endsWith('°')).toBe(true)
    // toFixed(1) → 소수점 한 자리
    expect(result.current.label).toMatch(/^-?\d+\.\d°$/)
  })

  // (단일 빈 FeedItem 객체로는 computeWarmth가 NaN을 반환 — 실제 필드가 필요해
  //  본 spec에서는 빈 배열만 안전하게 검증한다. 비-empty 시나리오는 computeWarmth
  //  단위 테스트의 책임.)

  it('동일 items 참조 → 같은 결과 (useMemo 캐시)', () => {
    const items: FeedItem[] = []
    const { result, rerender } = renderHook(({ x }: { x: FeedItem[] }) => useWarmth(x), {
      initialProps: { x: items },
    })
    const first = result.current
    rerender({ x: items })
    expect(result.current).toBe(first)
  })
})
