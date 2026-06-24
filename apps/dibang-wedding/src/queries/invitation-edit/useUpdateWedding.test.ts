/**
 * useUpdateWedding — updateWedding + optional updateInvitation + 2 invalidate
 * + 온체인 update_invitation dual-write(인증 시): 이름·커버·인사말 Walrus blobId, 미수정 필드는 기존 온체인 값 보존.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const updateWedding = vi.fn()
const updateInvitation = vi.fn()
const getWedding = vi.fn()
const getInvitationForWedding = vi.fn()
const buildUpdateInvitationTx = vi.fn()
const executeOnchain = vi.fn()
const walrusStore = vi.fn()
const walrusStoreString = vi.fn()
const walrusStorePIIString = vi.fn()
const authState = { isAuthenticated: false }

vi.mock('@gorae/contracts/sdk.gen', () => ({
  updateWedding: (...args: unknown[]) => updateWedding(...args),
  updateInvitation: (...args: unknown[]) => updateInvitation(...args),
  getWedding: (...args: unknown[]) => getWedding(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMyWeddingsQueryKey: () => ['myWeddings'],
  getWeddingQueryKey: ({ path }: { path: { weddingId: string } }) => ['wedding', path.weddingId],
}))

vi.mock('@gorae/sui-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gorae/sui-sdk')>()
  return {
    ...actual,
    getInvitationForWedding: (...args: unknown[]) => getInvitationForWedding(...args),
    buildUpdateInvitationTx: (...args: unknown[]) => buildUpdateInvitationTx(...args),
    createJsonRpcClient: () => ({}),
    configureSui: () => {},
    walrusStore: (...args: unknown[]) => walrusStore(...args),
    walrusStoreString: (...args: unknown[]) => walrusStoreString(...args),
    walrusStorePIIString: (...args: unknown[]) => walrusStorePIIString(...args),
  }
})

vi.mock('../../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({ isAuthenticated: authState.isAuthenticated, executeOnchain }),
}))

vi.mock('../../env', () => ({ env: { VITE_SUI_NETWORK: 'testnet' } }))

import { useUpdateWedding } from './useUpdateWedding'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  updateWedding.mockReset()
  updateInvitation.mockReset()
  getWedding.mockReset()
  getInvitationForWedding.mockReset()
  buildUpdateInvitationTx.mockReset()
  executeOnchain.mockReset()
  walrusStore.mockReset()
  walrusStoreString.mockReset()
  walrusStorePIIString.mockReset()
  authState.isAuthenticated = false
})

describe('useUpdateWedding', () => {
  it('invitationReq 빈 → updateWedding만 호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-1', 'i-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: {} })
    expect(updateWedding).toHaveBeenCalledTimes(1)
    expect(updateInvitation).not.toHaveBeenCalled()
  })

  it('invitationReq.cover_image 있음 + invitationId 있음 → updateInvitation도 호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-2', 'i-2'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq: {},
      invitationReq: { cover_image: 'https://a/c.jpg' },
    })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-2', invitationId: 'i-2' },
      body: { cover_image: 'https://a/c.jpg' },
      throwOnError: true,
    })
  })

  it('invitationReq 채워졌어도 invitationId 빈 문자열 → updateInvitation 미호출', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-3', ''), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      weddingReq: {},
      invitationReq: { custom_message: 'x' },
    })
    expect(updateInvitation).not.toHaveBeenCalled()
  })

  it('미인증 → 온체인 update 미호출(getWedding 미조회)', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-1', 'i-1'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: {} })
    expect(getWedding).not.toHaveBeenCalled()
    expect(buildUpdateInvitationTx).not.toHaveBeenCalled()
  })

  it('인증 시 온체인 update_invitation 호출 — 변경 필드는 Walrus, 미변경 필드는 기존 온체인 값 보존', async () => {
    authState.isAuthenticated = true
    updateWedding.mockResolvedValue({ data: null })
    updateInvitation.mockResolvedValue({ data: null })
    getWedding.mockResolvedValue({ data: { sui_wedding_id: '0xW' } })
    getInvitationForWedding.mockResolvedValue({
      id: '0xINV',
      groomNameBlobId: 'oldG',
      brideNameBlobId: 'oldB',
      date: 'oldDate',
      time: 'oldTime',
      venueName: 'oldV',
      venueHall: 'oldH',
      coverPhotoBlobId: 'oldCover',
      greetingBlobId: 'oldGreet',
    })
    walrusStorePIIString.mockResolvedValue('nameBlob')
    walrusStoreString.mockResolvedValue('greetBlob')
    buildUpdateInvitationTx.mockReturnValue({ tx: true })
    executeOnchain.mockResolvedValue('digest')

    const { result } = renderHook(() => useUpdateWedding('w-on', 'i-on'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({
      // groom만 새 값, bride는 빈 값(→ 기존 보존), 날짜·시간·예식장명 새 값, venue_hall 미제공(→ 기존 보존)
      weddingReq: {
        info: {
          groom_name: 'newGroom',
          bride_name: '',
          date: '2026',
          time: '13:00',
          venue: { venue_name: 'NewVenue' },
        },
      } as never,
      // 인사말만 교체, 커버는 미제공(→ 기존 blobId 보존)
      invitationReq: { custom_message: 'hi' },
    })

    expect(buildUpdateInvitationTx).toHaveBeenCalledWith({
      invitationId: '0xINV',
      groomNameBlobId: 'nameBlob', // 새 groom → Walrus
      brideNameBlobId: 'oldB', // bride 빈 값 → 기존 보존
      date: '2026',
      time: '13:00',
      venueName: 'NewVenue',
      venueHall: 'oldH', // 미제공 → 기존 보존
      coverPhotoBlobId: 'oldCover', // cover_image 미제공 → 기존 보존
      greeting: 'greetBlob', // custom_message → Walrus
    })
    expect(executeOnchain).toHaveBeenCalledWith({ tx: true })
  })

  it('인증이어도 sui_wedding_id 없으면 온체인 update 생략', async () => {
    authState.isAuthenticated = true
    updateWedding.mockResolvedValue({ data: null })
    updateInvitation.mockResolvedValue({ data: null })
    getWedding.mockResolvedValue({ data: { sui_wedding_id: null } })
    const { result } = renderHook(() => useUpdateWedding('w-x', 'i-x'), {
      wrapper: createQueryWrapper(),
    })
    // 청첩장 데이터가 있어 온체인 게이트는 열리지만(getWedding 조회), sui_wedding_id 없어 update 생략.
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: { custom_message: 'x' } })
    expect(getWedding).toHaveBeenCalled()
    expect(getInvitationForWedding).not.toHaveBeenCalled()
    expect(buildUpdateInvitationTx).not.toHaveBeenCalled()
  })

  it('인증이어도 온체인 반영 대상(info/invitationData) 없으면 게이트 닫힘 → getWedding 미조회', async () => {
    authState.isAuthenticated = true
    updateWedding.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useUpdateWedding('w-y', 'i-y'), {
      wrapper: createQueryWrapper(),
    })
    await result.current.mutateAsync({ weddingReq: { hosts: {} } as never, invitationReq: {} })
    expect(getWedding).not.toHaveBeenCalled()
    expect(buildUpdateInvitationTx).not.toHaveBeenCalled()
  })

  it('성공 후 myWeddings + wedding 2개 invalidate', async () => {
    updateWedding.mockResolvedValue({ data: null })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateWedding('w-4', 'i-4'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ weddingReq: {}, invitationReq: {} })
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['wedding', 'w-4'] })
    })
  })
})
