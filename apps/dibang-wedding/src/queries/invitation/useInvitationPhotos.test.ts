/**
 * useInvitationPhotos — listMobileInvitationPhotos query 래퍼.
 *
 * 책임:
 *  - weddingId/invitationId 중 하나라도 falsy → disabled.
 *  - 둘 다 있음 → fetch + 응답 data 반환.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listMobileInvitationPhotosOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  listMobileInvitationPhotosOptions: (...args: unknown[]) =>
    listMobileInvitationPhotosOptions(...args),
}))

import { useInvitationPhotos } from './useInvitationPhotos'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  listMobileInvitationPhotosOptions.mockReset()
})

function makeOptions(data: unknown) {
  return {
    queryKey: ['mobile-photos'],
    queryFn: async () => data,
  }
}

describe('useInvitationPhotos', () => {
  it.each([
    ['weddingId undefined', undefined, 'inv-1'],
    ['invitationId undefined', 'w-1', undefined],
    ['둘 다 undefined', undefined, undefined],
  ])('%s → disabled', (_label, w, i) => {
    listMobileInvitationPhotosOptions.mockReturnValue(makeOptions([]))
    const { result } = renderHook(() => useInvitationPhotos(w, i), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('둘 다 있음 → fetch + 응답 반환', async () => {
    listMobileInvitationPhotosOptions.mockReturnValue(makeOptions({ data: ['p1'] }))
    const { result } = renderHook(() => useInvitationPhotos('w-1', 'i-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMobileInvitationPhotosOptions).toHaveBeenCalledWith({
      path: { weddingId: 'w-1', invitationId: 'i-1' },
    })
    expect(result.current.data).toEqual({ data: ['p1'] })
  })
})
