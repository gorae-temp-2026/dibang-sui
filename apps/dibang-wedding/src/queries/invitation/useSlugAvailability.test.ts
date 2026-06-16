/**
 * useSlugAvailability — slug 유효성 분기 매핑.
 *
 * 책임:
 *  - slug 빈/<2자/originalSlug와 동일 → idle (조회 안 함).
 *  - 정상 조회: isLoading → checking / data 있음 → taken /
 *    404 error → available / 다른 error → error / data 없음 → available.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getInvitationOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getInvitationOptions: (...args: unknown[]) => getInvitationOptions(...args),
}))

import { useSlugAvailability } from './useSlugAvailability'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  getInvitationOptions.mockReset()
})

function options(impl: () => Promise<unknown>) {
  return { queryKey: ['inv', impl.name], queryFn: impl }
}

describe('useSlugAvailability', () => {
  it.each([
    ['빈 slug', '', undefined],
    ['1자 slug', 'a', undefined],
    ['originalSlug와 동일', 'old', 'old'],
  ])('%s → idle (skip)', (_label, slug, original) => {
    getInvitationOptions.mockReturnValue(options(async () => null))
    const { result } = renderHook(() => useSlugAvailability(slug, original), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current).toBe('idle')
  })

  it('정상 응답(data 있음) → taken', async () => {
    getInvitationOptions.mockReturnValue(options(async () => ({ id: 'inv-1' })))
    const { result } = renderHook(() => useSlugAvailability('mywed'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current).toBe('taken'))
  })

  it('404 error → available', async () => {
    getInvitationOptions.mockReturnValue(
      options(async () => {
        const err = Object.assign(new Error('not found'), { status: 404 })
        throw err
      }),
    )
    const { result } = renderHook(() => useSlugAvailability('newslug'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current).toBe('available'))
  })

  it('다른 error(500) → error', async () => {
    getInvitationOptions.mockReturnValue(
      options(async () => {
        const err = Object.assign(new Error('server'), { status: 500 })
        throw err
      }),
    )
    const { result } = renderHook(() => useSlugAvailability('netfail'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current).toBe('error'))
  })

  it('응답 success but data falsy → available', async () => {
    getInvitationOptions.mockReturnValue(options(async () => null))
    const { result } = renderHook(() => useSlugAvailability('emptyok'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current).toBe('available'))
  })
})
