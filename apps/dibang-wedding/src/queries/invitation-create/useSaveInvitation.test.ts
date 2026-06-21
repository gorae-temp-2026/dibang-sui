/**
 * useSaveInvitation — Supabase 2단계(createWedding → optional updateInvitation)
 * + D0-1 온체인 dual-write: 인증 시 온체인 createWedding 실행, 실패해도 Supabase는 유지(suiIds null).
 *
 * 책임:
 *  - Supabase createWedding 1차 호출, wedding 반환.
 *  - invitationReq에 데이터 있으면 updateInvitation 2차 호출(invitationId = wedding.invitations[0]?.id).
 *  - 인증 상태면 온체인 createWedding(onchainParams) 실행 → extractWeddingObjectIds로 suiIds 확보.
 *    온체인 실패는 throw하지 않고 suiIds=null로 둔다(Supabase 유지, 추후 재시도).
 *  - 성공 후 myWeddings invalidate.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const createWedding = vi.fn()
const updateInvitation = vi.fn()
const createWeddingOnchain = vi.fn()
const createVaultOnchain = vi.fn()
const extractWeddingObjectIds = vi.fn()
const updateWeddingSuiIds = vi.fn()
const authState = { isAuthenticated: false }

vi.mock('@gorae/contracts/sdk.gen', () => ({
  createWedding: (...args: unknown[]) => createWedding(...args),
  updateInvitation: (...args: unknown[]) => updateInvitation(...args),
  updateWeddingSuiIds: (...args: unknown[]) => updateWeddingSuiIds(...args),
}))

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  getMyWeddingsQueryKey: () => ['myWeddings'],
}))

vi.mock('../../hooks/useOnchainHostActions', () => ({
  useOnchainHostActions: () => ({ createWedding: createWeddingOnchain, createVault: createVaultOnchain }),
}))

vi.mock('../../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({ isAuthenticated: authState.isAuthenticated }),
}))

vi.mock('./onchainWedding', () => ({
  extractWeddingObjectIds: (...args: unknown[]) => extractWeddingObjectIds(...args),
}))

vi.mock('../../env', () => ({ env: { VITE_SUI_NETWORK: 'testnet' } }))

import { useSaveInvitation } from './useSaveInvitation'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  createWedding.mockReset()
  updateInvitation.mockReset()
  createWeddingOnchain.mockReset()
  createVaultOnchain.mockReset()
  extractWeddingObjectIds.mockReset()
  updateWeddingSuiIds.mockReset()
  authState.isAuthenticated = false
  localStorage.clear()
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
  it('미인증 + invitationReq 빈 → createWedding만, updateInvitation·온체인 미호출, suiIds null', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-1', invitations: [{ id: 'inv-1' }] } })
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    const res = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(createWedding).toHaveBeenCalledWith({ body: weddingReq, throwOnError: true })
    expect(updateInvitation).not.toHaveBeenCalled()
    expect(createWeddingOnchain).not.toHaveBeenCalled()
    expect(res.wedding).toEqual({ id: 'w-1', invitations: [{ id: 'inv-1' }] })
    expect(res.suiIds).toBeNull()
  })

  it('invitationReq에 cover_image 있음 + invitations[0].id 사용', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-2', invitations: [{ id: 'inv-2' }] } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync({ weddingReq, invitationReq: { cover_image: 'https://a/c.jpg' } })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-2', invitationId: 'inv-2' },
      body: { cover_image: 'https://a/c.jpg' },
      throwOnError: true,
    })
  })

  it('wedding.invitations 빈 배열 → invitationId 빈 문자열 (가드 분기)', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-3', invitations: [] } })
    updateInvitation.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    await result.current.mutateAsync({ weddingReq, invitationReq: { gallery_photos: ['x'] } })
    expect(updateInvitation).toHaveBeenCalledWith({
      path: { weddingId: 'w-3', invitationId: '' },
      body: { gallery_photos: ['x'] },
      throwOnError: true,
    })
  })

  it('인증 시 온체인 createWedding 호출 + Sui ID 추출 → suiIds 반환', async () => {
    authState.isAuthenticated = true
    createWedding.mockResolvedValue({ data: { id: 'w-5', invitations: [{ id: 'i' }] } })
    createWeddingOnchain.mockResolvedValue('digest-abc')
    createVaultOnchain.mockResolvedValue('vault-digest')
    extractWeddingObjectIds
      .mockResolvedValueOnce({ weddingId: '0xW', loungeId: '0xL', capId: '0xC', vaultId: '' })
      .mockResolvedValueOnce({ weddingId: '', loungeId: '', capId: '', vaultId: '0xV' })
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    const res = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(createWeddingOnchain).toHaveBeenCalledWith()
    expect(createVaultOnchain).toHaveBeenCalledWith({ weddingId: '0xW', capId: '0xC' })
    expect(updateWeddingSuiIds).toHaveBeenCalledWith({
      path: { weddingId: 'w-5' },
      body: { sui_wedding_id: '0xW', sui_lounge_id: '0xL', sui_vault_id: '0xV' },
      throwOnError: true,
    })
    expect(res.suiIds).toEqual({ weddingId: '0xW', loungeId: '0xL', capId: '0xC', vaultId: '0xV' })
  })

  it('인증이어도 온체인 실패 시 throw하지 않고 Supabase 유지, suiIds null + onchainError 반환', async () => {
    authState.isAuthenticated = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    createWedding.mockResolvedValue({ data: { id: 'w-6', invitations: [{ id: 'i' }] } })
    createWeddingOnchain.mockRejectedValue(new Error('onchain fail'))
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    const res = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(res.wedding).toEqual({ id: 'w-6', invitations: [{ id: 'i' }] })
    expect(res.suiIds).toBeNull()
    expect(res.onchainError).toBe('onchain fail')
  })

  it('온체인 성공+DB기록 실패 시 digest를 localStorage에 보존, 재호출 시 재사용(중복발행 방지)', async () => {
    authState.isAuthenticated = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    createWedding.mockResolvedValue({ data: { id: 'w-7', invitations: [{ id: 'i' }] } })
    createWeddingOnchain.mockResolvedValue('digest-1')
    createVaultOnchain.mockResolvedValue('vault-digest-1')
    extractWeddingObjectIds
      .mockResolvedValueOnce({ weddingId: '0xW', loungeId: '0xL', capId: '0xC', vaultId: '' })
      .mockResolvedValueOnce({ weddingId: '', loungeId: '', capId: '', vaultId: '0xV' })
    updateWeddingSuiIds.mockRejectedValueOnce(new Error('db write failed'))
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper() })
    const res1 = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(res1.suiIds).toBeNull()
    expect(res1.onchainError).toBe('db write failed')
    expect(localStorage.getItem('dibang.onchain-pending.w-7')).not.toBeNull()

    // 2회차: 같은 weddingId로 재호출 시 createWeddingOnchain을 다시 호출하면 안 됨
    createWeddingOnchain.mockClear()
    createVaultOnchain.mockClear()
    createWedding.mockResolvedValue({ data: { id: 'w-7', invitations: [{ id: 'i' }] } })
    extractWeddingObjectIds
      .mockResolvedValueOnce({ weddingId: '0xW', loungeId: '0xL', capId: '0xC', vaultId: '' })
      .mockResolvedValueOnce({ weddingId: '', loungeId: '', capId: '', vaultId: '0xV' })
    updateWeddingSuiIds.mockResolvedValueOnce({ data: null })
    const res2 = await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    expect(createWeddingOnchain).not.toHaveBeenCalled()
    expect(createVaultOnchain).not.toHaveBeenCalled()
    expect(res2.suiIds).toEqual({ weddingId: '0xW', loungeId: '0xL', capId: '0xC', vaultId: '0xV' })
    expect(localStorage.getItem('dibang.onchain-pending.w-7')).toBeNull()
  })

  it('성공 후 myWeddings invalidate', async () => {
    createWedding.mockResolvedValue({ data: { id: 'w-4', invitations: [{ id: 'i' }] } })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSaveInvitation(), { wrapper: createQueryWrapper(client) })
    await result.current.mutateAsync({ weddingReq, invitationReq: {} })
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myWeddings'] }),
    )
  })
})
