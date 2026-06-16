/**
 * useSaveInvitation — 2단계 mutation: createWedding → optional updateInvitation.
 *
 * 책임:
 *  - createWedding 1차 호출, wedding 반환.
 *  - invitationReq에 (gallery_photos OR cover_image OR custom_message OR
 *    design_template_id) 있으면 updateInvitation 2차 호출 (invitationId는
 *    wedding.invitations[0]?.id).
 *  - 없으면 updateInvitation 미호출.
 *  - 성공 후 myWeddings invalidate.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createWedding = vi.fn()
const updateInvitation = vi.fn()

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createWedding: (...args: unknown[]) => createWedding(...args),
  updateInvitation: (...args: unknown[]) => updateInvitation(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMyWeddingsQueryKey: () => ['myWeddings'],
}))

import { useSaveInvitation } from './useSaveInvitation'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createWedding.mockReset()
  updateInvitation.mockReset()
})

const weddingReq = {
  info: {
    groom_name: 'g',
    bride_name: 'b',
    date: '2026-01-01',
    time: '12:00',
    venue: { venue_name: 'v', venue_address: 'a' },
  },
  hosts: {},
  slug: 's',
}

describe('useSaveInvitation', () => {
  it('invitationReq 빈 → createWedding만 호출, updateInvitation 미호출', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-1', invitations: [{ id: 'inv-1' }] } })
    const { result } = renderHook(() => useSaveInvitation(), {
      wrapper: createQueryWrapper(),
    })
    const wedding = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(createWedding).toHaveBeenCalledWith({ body: weddingReq, throwOnError: true })
    expect(updateInvitation).not.toHaveBeenCalled()
    expect(wedding).toEqual({ id: 'w-1', invitations: [{ id: 'inv-1' }] })
  })

  it('invitationReq에 cover_image 있음 + invitations[0].id 사용', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-2', invitations: [{ id: 'inv-2' }] } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useSaveInvitation(), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq,
      invitationReq: { cover_image: 'https://a/c.jpg' },
    })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-2', invitationId: 'inv-2' },
      body: { cover_image: 'https://a/c.jpg' },
      throwOnError: true,
    })
  })

  it('wedding.invitations 빈 배열 → invitationId 빈 문자열로 전달 (가드 분기)', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-3', invitations: [] } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useSaveInvitation(), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq,
      invitationReq: { gallery_photos: ['x'] },
    })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-3', invitationId: '' },
      body: { gallery_photos: ['x'] },
      throwOnError: true,
    })
  })

  it('성공 후 myWeddings invalidate', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-4', invitations: [{ id: 'i' }] } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSaveInvitation(), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] }),
    )
  })
})
