/**
 * useComposeMemory — upload + createMemory 합성 훅.
 *
 * 책임:
 *  - submit(text, file=null): createMemory만 호출, photoUrl=undefined.
 *  - submit(text, file): useUploadMemoryPhoto(presigned memory) → URL을 createMemory에 전달.
 *  - upload throw: createMemory 미호출, { ok: false } 반환.
 *  - createMemory throw: catch 후 { ok: false } 반환.
 *  - state pass-through: isUploading, isPosting, uploadError, postError.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const uploadMutateAsync = vi.fn()
const mutateAsync = vi.fn()
// 온체인 best-effort 기록(useOnchainMemory) 모킹 — DB 흐름과 독립이며 실패해도 제출에 영향 없음을 검증.
// (실제 훅은 compress-image→heic2any(Worker)를 끌어와 jsdom에서 못 뜨므로 모듈째 모킹.)
const onchainRecord = vi.fn()
const uploadState = { isPending: false, error: null as unknown }
const memoryMutationState = { isPending: false, isError: false }

vi.mock('../../queries/lounge-v2/useCreateMemory', () => ({
  useCreateMemory: (_loungeId: string) => ({
    mutateAsync,
    isPending: memoryMutationState.isPending,
    isError: memoryMutationState.isError,
  }),
}))

vi.mock('../../queries/lounge-v2/useUploadMemoryPhoto', () => ({
  useUploadMemoryPhoto: (_loungeId: string) => ({
    mutateAsync: (file: File) => uploadMutateAsync(file),
    isPending: uploadState.isPending,
    error: uploadState.error,
  }),
}))

vi.mock('../useOnchainMemory', () => ({
  useOnchainMemory: (_loungeId: string) => onchainRecord,
}))

import { useComposeMemory } from './useComposeMemory'

afterEach(() => {
  uploadMutateAsync.mockReset()
  mutateAsync.mockReset()
  onchainRecord.mockReset()
  uploadState.isPending = false
  uploadState.error = null
  memoryMutationState.isPending = false
  memoryMutationState.isError = false
})

describe('useComposeMemory', () => {
  it('file=null: createMemory만 호출, photoUrl=undefined', async () => {
    mutateAsync.mockResolvedValue({ id: 'm-1' })
    const { result } = renderHook(() => useComposeMemory('l-1'))
    const r = await result.current.submit('hello', null)
    expect(uploadMutateAsync).not.toHaveBeenCalled()
    expect(mutateAsync).toHaveBeenCalledWith({ text: 'hello', asAnnounce: false, photoUrl: undefined })
    expect(r.ok).toBe(true)
  })

  it('file 주어짐 + upload 성공: createMemory에 photoUrl 전달', async () => {
    uploadMutateAsync.mockResolvedValue('https://a/uploaded.jpg')
    mutateAsync.mockResolvedValue({ id: 'm-2' })
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    const { result } = renderHook(() => useComposeMemory('l-2'))
    const r = await result.current.submit('with photo', file)
    expect(uploadMutateAsync).toHaveBeenCalledWith(file)
    expect(mutateAsync).toHaveBeenCalledWith({
      text: 'with photo',
      asAnnounce: false,
      photoUrl: 'https://a/uploaded.jpg',
    })
    expect(r.ok).toBe(true)
  })

  it('upload throw → createMemory 미호출, { ok: false }', async () => {
    uploadMutateAsync.mockRejectedValue(new Error('업로드 실패'))
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    const { result } = renderHook(() => useComposeMemory('l-3'))
    const r = await result.current.submit('text', file)
    expect(uploadMutateAsync).toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(r.ok).toBe(false)
  })

  it('createMemory throw → { ok: false }', async () => {
    mutateAsync.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useComposeMemory('l-4'))
    const r = await result.current.submit('text', null)
    expect(r.ok).toBe(false)
  })

  it('DB 성공 시 온체인 best-effort 기록을 { text, file }로 호출', async () => {
    mutateAsync.mockResolvedValue({ id: 'm-6' })
    onchainRecord.mockResolvedValue('digest-xyz')
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    uploadMutateAsync.mockResolvedValue('https://a/u.jpg')
    const { result } = renderHook(() => useComposeMemory('l-6'))
    const r = await result.current.submit('축하 글', file)
    expect(onchainRecord).toHaveBeenCalledWith({ text: '축하 글', file })
    expect(r.ok).toBe(true)
  })

  it('온체인 기록 실패(null 반환)해도 DB 흐름·결과에 영향 없음(best-effort)', async () => {
    mutateAsync.mockResolvedValue({ id: 'm-7' })
    onchainRecord.mockResolvedValue(null) // useOnchainMemory는 throw하지 않고 실패 시 null 반환
    const { result } = renderHook(() => useComposeMemory('l-7'))
    const r = await result.current.submit('text', null)
    expect(onchainRecord).toHaveBeenCalledWith({ text: 'text', file: null })
    expect(r.ok).toBe(true)
  })

  it('state pass-through: isUploading·isPosting·uploadError·postError', () => {
    uploadState.isPending = true
    uploadState.error = new Error('upload err')
    memoryMutationState.isPending = true
    memoryMutationState.isError = true
    const { result } = renderHook(() => useComposeMemory('l-5'))
    expect(result.current.isUploading).toBe(true)
    expect(result.current.uploadError).toBe('upload err')
    expect(result.current.isPosting).toBe(true)
    expect(result.current.postError).toBe(true)
  })
})
