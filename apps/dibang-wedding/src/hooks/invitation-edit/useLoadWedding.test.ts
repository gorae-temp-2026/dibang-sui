/**
 * useLoadWedding — getWedding + getInvitation 두 query 합성.
 *
 * 책임:
 *  - getWedding 호출, 응답에서 invitations 배열 추출.
 *  - targetInvitationId 매치하는 invitation 찾기, 없으면 invitations[0].
 *  - 그 invitation의 slug로 getInvitation 호출 (slug 없으면 disabled).
 *  - isLoading은 wedding OR (slug 있을 때) invitation 로딩 합산.
 *
 * 생성된 query options를 vi.mock으로 대체.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getWeddingOptions = vi.fn()
const getInvitationOptions = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getWeddingOptions: (...args: unknown[]) => getWeddingOptions(...args),
  getInvitationOptions: (...args: unknown[]) => getInvitationOptions(...args),
}))

import { useLoadWedding } from './useLoadWedding'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  getWeddingOptions.mockReset()
  getInvitationOptions.mockReset()
})

function makeOptions(queryKey: unknown[], data: unknown) {
  return {
    queryKey,
    queryFn: async () => data,
  }
}

describe('useLoadWedding', () => {
  it('wedding 로드 + invitations[0]을 자동 선택', async () => {
    getWeddingOptions.mockReturnValue(
      makeOptions(['wedding', 'w-1'], {
        id: 'w-1',
        invitations: [
          { id: 'inv-1', slug: 'main' },
          { id: 'inv-2', slug: 'second' },
        ],
      }),
    )
    getInvitationOptions.mockReturnValue(
      makeOptions(['invitation', 'main'], { id: 'inv-1', slug: 'main', heart_count: 5 }),
    )
    const { result } = renderHook(() => useLoadWedding('w-1'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.invitation).toBeDefined())
    expect(result.current.slug).toBe('main')
    expect(result.current.invitationId).toBe('inv-1')
    expect(getInvitationOptions).toHaveBeenCalledWith({ path: { slug: 'main' } })
  })

  it('targetInvitationId 매치 → 그 invitation을 선택', async () => {
    getWeddingOptions.mockReturnValue(
      makeOptions(['wedding', 'w-2'], {
        id: 'w-2',
        invitations: [
          { id: 'inv-A', slug: 'a' },
          { id: 'inv-B', slug: 'b' },
        ],
      }),
    )
    getInvitationOptions.mockReturnValue(
      makeOptions(['invitation', 'b'], { id: 'inv-B', slug: 'b' }),
    )
    const { result } = renderHook(() => useLoadWedding('w-2', 'inv-B'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.slug).toBe('b'))
    expect(result.current.invitationId).toBe('inv-B')
  })

  it('targetInvitationId 매치 없음 → invitations[0] 폴백', async () => {
    getWeddingOptions.mockReturnValue(
      makeOptions(['wedding', 'w-3'], {
        id: 'w-3',
        invitations: [{ id: 'inv-X', slug: 'x' }],
      }),
    )
    getInvitationOptions.mockReturnValue(
      makeOptions(['invitation', 'x'], { id: 'inv-X', slug: 'x' }),
    )
    const { result } = renderHook(() => useLoadWedding('w-3', 'inv-NOTHERE'), {
      wrapper: createQueryWrapper(),
    })
    await waitFor(() => expect(result.current.slug).toBe('x'))
  })

  it('wedding에 invitations 없음 → slug/invitationId 빈 문자열 + invitation query disabled', async () => {
    getWeddingOptions.mockReturnValue(
      makeOptions(['wedding', 'w-4'], { id: 'w-4', invitations: [] }),
    )
    getInvitationOptions.mockReturnValue(makeOptions(['invitation', ''], null))
    const { result } = renderHook(() => useLoadWedding('w-4'), {
      wrapper: createQueryWrapper(),
    })
    // wedding 로딩 완료 대기
    await waitFor(() => expect(result.current.wedding).toBeDefined())
    expect(result.current.slug).toBe('')
    expect(result.current.invitationId).toBe('')
    expect(result.current.invitation).toBeUndefined()
  })
})
