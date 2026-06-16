/**
 * useAddInvitation — 2단계 mutation: createInvitation → optional updateInvitation.
 *
 * 책임:
 *  - createInvitation 1차 호출, inv.id 반환.
 *  - invitationReq에 (gallery_photos OR cover_image OR custom_message OR
 *    design_template_id) 있으면 updateInvitation 2차 호출.
 *  - 없으면 updateInvitation 미호출.
 *  - 성공 후 myWeddings query invalidate.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createInvitation = vi.fn()
const updateInvitation = vi.fn()
const getMyWeddingsQueryKey = vi.fn(() => ['myWeddings'])

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createInvitation: (...args: unknown[]) => createInvitation(...args),
  updateInvitation: (...args: unknown[]) => updateInvitation(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMyWeddingsQueryKey: () => getMyWeddingsQueryKey(),
}))

import { useAddInvitation } from './useAddInvitation'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createInvitation.mockReset()
  updateInvitation.mockReset()
  getMyWeddingsQueryKey.mockClear()
})

describe('useAddInvitation', () => {
  it('invitationReq 빈 객체 → createInvitation만 호출, updateInvitation 미호출', async () => {
    createInvitation.mockResolvedValue({ data: { id: 'inv-1' } })
    const { result } = renderHook(() => useAddInvitation('w-1'), {
      wrapper: createQueryWrapper(),
    })
    const inv = await result.current.mutateAsync({ slug: 'mywed', invitationReq: {} })
    expect(createInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-1' },
      body: { slug: 'mywed' },
      throwOnError: true,
    })
    expect(updateInvitation).not.toHaveBeenCalled()
    expect(inv).toEqual({ id: 'inv-1' })
  })

  it('invitationReq에 cover_image 있음 → updateInvitation 2차 호출', async () => {
    createInvitation.mockResolvedValue({ data: { id: 'inv-2' } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useAddInvitation('w-2'), {
      wrapper: createQueryWrapper(),
    })
    const invitationReq = { cover_image: 'https://a/c.jpg' }
    await result.current.mutateAsync({ slug: 's', invitationReq })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-2', invitationId: 'inv-2' },
      body: invitationReq,
      throwOnError: true,
    })
  })

  it.each([
    ['gallery_photos', { gallery_photos: ['x'] }],
    ['custom_message', { custom_message: 'hi' }],
    ['design_template_id', { design_template_id: 'tpl-1' }],
  ])('invitationReq.%s 만 있어도 updateInvitation 호출', async (_field, invitationReq) => {
    createInvitation.mockResolvedValue({ data: { id: 'inv-x' } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useAddInvitation('w-x'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ slug: 's', invitationReq })
    expect(updateInvitation).toHaveBeenCalledTimes(1)
  })

  it('성공 후 myWeddings query invalidate', async () => {
    createInvitation.mockResolvedValue({ data: { id: 'inv-3' } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAddInvitation('w-3'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ slug: 's', invitationReq: {} })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] }),
    )
  })
})
