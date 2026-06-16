/**
 * useSlugCheck — useDebouncedValue + useSlugAvailability 합성 훅.
 *
 * 책임:
 *  - slug 입력을 500ms 디바운스
 *  - 디바운스된 slug + originalSlug를 useSlugAvailability에 전달
 *  - 해당 쿼리 결과(SlugAvailability)를 그대로 반환
 *
 * inner hooks 둘 다 vi.mock 으로 대체 — 본 spec은 합성 와이어링만 검증.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const useDebouncedValue = vi.fn()
const useSlugAvailability = vi.fn()

vi.mock('../shared/useDebouncedValue', () => ({
  useDebouncedValue: (v: string, ms: number) => useDebouncedValue(v, ms),
}))
vi.mock('../../queries/invitation/useSlugAvailability', () => ({
  useSlugAvailability: (slug: string, original?: string) =>
    useSlugAvailability(slug, original),
}))

import { useSlugCheck } from './useSlugCheck'

afterEach(() => {
  useDebouncedValue.mockReset()
  useSlugAvailability.mockReset()
})

describe('useSlugCheck', () => {
  it('입력 slug를 500ms 디바운스로 전달 + 결과 패스스루', () => {
    useDebouncedValue.mockReturnValue('mywed')
    useSlugAvailability.mockReturnValue('available')
    const { result } = renderHook(() => useSlugCheck('mywed'))
    expect(useDebouncedValue).toHaveBeenCalledWith('mywed', 500)
    expect(useSlugAvailability).toHaveBeenCalledWith('mywed', undefined)
    expect(result.current).toBe('available')
  })

  it('originalSlug 전달 시 그대로 useSlugAvailability에 전파', () => {
    useDebouncedValue.mockReturnValue('new-slug')
    useSlugAvailability.mockReturnValue('idle')
    renderHook(() => useSlugCheck('new-slug', 'old-slug'))
    expect(useSlugAvailability).toHaveBeenCalledWith('new-slug', 'old-slug')
  })

  it('디바운스 결과가 입력과 다르면 그 값으로 쿼리', () => {
    // 사용자가 빠르게 타이핑해서 입력 = "newslu" 인데 디바운스 결과는 이전 값 "new"
    useDebouncedValue.mockReturnValue('new')
    useSlugAvailability.mockReturnValue('checking')
    renderHook(() => useSlugCheck('newslu'))
    expect(useSlugAvailability).toHaveBeenCalledWith('new', undefined)
  })

  it.each(['idle', 'checking', 'available', 'taken', 'error'] as const)(
    'useSlugAvailability 반환값 %s를 그대로 반환',
    (status) => {
      useDebouncedValue.mockReturnValue('s')
      useSlugAvailability.mockReturnValue(status)
      const { result } = renderHook(() => useSlugCheck('s'))
      expect(result.current).toBe(status)
    },
  )
})
