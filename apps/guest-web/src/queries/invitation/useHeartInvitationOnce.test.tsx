import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, test } from 'vitest'
import { server } from '../../mocks/server'
import { useHeartInvitationOnce } from './useHeartInvitationOnce'

const SLUG = 'test-slug'
const API_BASE = 'http://localhost:8080'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setupHeartHandler(returnCount = 100, calls = { n: 0 }) {
  server.use(
    http.post(`${API_BASE}/invitations/${SLUG}/heart`, () => {
      calls.n += 1
      return HttpResponse.json({ heart_count: returnCount })
    }),
  )
  return calls
}

describe('useHeartInvitationOnce', () => {
  test('trigger 한 번 호출 시 mutation이 정확히 1회 발사된다', async () => {
    const calls = setupHeartHandler(101)
    const { result } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })

    act(() => {
      result.current.trigger()
    })

    await waitFor(() => expect(calls.n).toBe(1))
  })

  test('trigger를 여러 번 호출해도 mutation은 1회만 발사된다 (세션 잠금)', async () => {
    const calls = setupHeartHandler(102)
    const { result } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })

    act(() => {
      result.current.trigger()
      result.current.trigger()
      result.current.trigger()
    })

    await waitFor(() => expect(calls.n).toBe(1))
    // 한 번 더 호출해도 추가 발사 없음
    act(() => {
      result.current.trigger()
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(calls.n).toBe(1)
  })

  test('mutation 성공 시 syncedCount가 서버 응답의 heart_count로 채워진다', async () => {
    setupHeartHandler(234)
    const { result } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })

    act(() => {
      result.current.trigger()
    })

    await waitFor(() => expect(result.current.syncedCount).toBe(234))
  })

  test('새 마운트(=새로고침) 시 trigger가 다시 1회 발사 가능하다', async () => {
    const calls = setupHeartHandler(300)
    const { result: r1, unmount } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })
    act(() => r1.current.trigger())
    await waitFor(() => expect(calls.n).toBe(1))
    unmount()

    const { result: r2 } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })
    act(() => r2.current.trigger())
    await waitFor(() => expect(calls.n).toBe(2))
  })

  test('mutation 에러 시 잠금이 풀려 재시도 가능하다', async () => {
    let firstCall = true
    server.use(
      http.post(`${API_BASE}/invitations/${SLUG}/heart`, () => {
        if (firstCall) {
          firstCall = false
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json({ heart_count: 99 })
      }),
    )

    const { result } = renderHook(() => useHeartInvitationOnce(SLUG), { wrapper })

    act(() => result.current.trigger())
    // 첫 호출 실패 후 잠금 해제 대기
    await waitFor(() => expect(result.current.isError).toBe(true))

    act(() => result.current.trigger())
    await waitFor(() => expect(result.current.syncedCount).toBe(99))
  })
})
