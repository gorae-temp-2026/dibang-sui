/**
 * useDownloadSharedPhotosZip — lib service를 useMutation으로 래핑.
 *
 * 책임:
 *  - mutate(args) → downloadSharedPhotosZip(args) 호출.
 *  - 성공 시 isPending false 종료. 실패 시 error 노출.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const downloadSharedPhotosZip = vi.fn()

vi.mock('../../lib/sharedPhotosZip', () => ({
  downloadSharedPhotosZip: (args: unknown) => downloadSharedPhotosZip(args),
}))

import { useDownloadSharedPhotosZip } from './useDownloadSharedPhotosZip'
import { createQueryWrapper } from '../../test-utils'

afterEach(() => {
  downloadSharedPhotosZip.mockReset()
})

describe('useDownloadSharedPhotosZip', () => {
  it('mutate(args) → 내부 service 호출', async () => {
    downloadSharedPhotosZip.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDownloadSharedPhotosZip(), {
      wrapper: createQueryWrapper(),
    })
    const args = { weddingId: 'w-1', loungeId: 'l-1', photos: [] } as never
    await result.current.mutateAsync(args)
    expect(downloadSharedPhotosZip).toHaveBeenCalledWith(args)
  })

  it('service throw → mutation isError + error 노출', async () => {
    const err = new Error('zip failed')
    downloadSharedPhotosZip.mockRejectedValue(err)
    const { result } = renderHook(() => useDownloadSharedPhotosZip(), {
      wrapper: createQueryWrapper(),
    })
    result.current.mutate({} as never)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(err)
  })
})
