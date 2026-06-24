/**
 * useCreateAnnouncement — generated createAnnouncementMutation spread +
 * 2 invalidate (listAnnouncements + listFeedInfinite).
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mutationFn = vi.fn()
// 온체인 best-effort 기록(useOnchainAnnouncement) 모킹 — DB 흐름과 독립이며 실패해도 제출에 영향 없음.
const onchainRecord = vi.fn()

vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createAnnouncementMutation: () => ({ mutationFn, mutationKey: ['createAnnouncement'] }),
  listAnnouncementsQueryKey: ({ path }: { path: { loungeId: string } }) => ['announcements', path.loungeId],
  listFeedInfiniteQueryKey: ({ path }: { path: { loungeId: string } }) => ['feed', 'infinite', path.loungeId],
}))

vi.mock('../../hooks/useOnchainAnnouncement', () => ({
  useOnchainAnnouncement: (_loungeId: string) => onchainRecord,
}))

import { useCreateAnnouncement } from './useCreateAnnouncement'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  mutationFn.mockReset()
  onchainRecord.mockReset()
})

describe('useCreateAnnouncement', () => {
  it('mutate → mutationFn 호출 + 2 invalidate', async () => {
    mutationFn.mockResolvedValue({ id: 'a-1' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAnnouncement('l-1'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ body: {} } as never)
    expect(mutationFn).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['announcements', 'l-1'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feed', 'infinite', 'l-1'] })
    })
  })

  it('message 있으면 온체인 best-effort dual-write를 { message, isPinned }로 호출', async () => {
    mutationFn.mockResolvedValue({ id: 'a-2' })
    onchainRecord.mockResolvedValue('digest-abc')
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(() => useCreateAnnouncement('l-2'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ body: { message: '공지 본문', is_pinned: true } } as never)
    await waitFor(() => {
      expect(onchainRecord).toHaveBeenCalledWith({ message: '공지 본문', isPinned: true })
    })
  })

  it('message 없으면 온체인 dual-write 미호출(빈 공지 방지)', async () => {
    mutationFn.mockResolvedValue({ id: 'a-3' })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const { result } = renderHook(() => useCreateAnnouncement('l-3'), {
      wrapper: createQueryWrapper(client),
    })
    await result.current.mutateAsync({ body: {} } as never)
    await waitFor(() => expect(mutationFn).toHaveBeenCalled())
    expect(onchainRecord).not.toHaveBeenCalled()
  })
})
