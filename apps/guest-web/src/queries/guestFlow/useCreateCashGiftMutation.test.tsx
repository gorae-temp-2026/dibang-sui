/**
 * useCreateCashGiftMutation — guest-web 측 cash gift 생성 mutation.
 *
 * guest-web에는 MSW가 이미 셋업되어 있으므로 (apps/guest-web/src/mocks/server.ts)
 * SDK vi.mock 대신 MSW로 네트워크 stub. SDK가 fetch 기반이라 MSW가 가로챈다.
 *
 * 책임:
 *  - mutateAsync(params): SDK createCashGift({ body }) 호출 → data 반환.
 *  - 모든 옵션 필드(relation_detail, guestbook_entry_id 등) body에 그대로 전달.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { useCreateCashGiftMutation } from './useCreateCashGiftMutation'

const API_BASE = 'http://localhost:8080'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  server.resetHandlers()
})

describe('useCreateCashGiftMutation', () => {
  it('mutateAsync(params) → POST /cash-gifts 호출 + 응답 data 반환', async () => {
    let captured: unknown = null
    server.use(
      http.post(`${API_BASE}/cash-gifts`, async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ id: 'gift-123', amount: 50000 })
      }),
    )

    const { result } = renderHook(() => useCreateCashGiftMutation(), { wrapper })
    const data = await result.current.mutateAsync({
      wedding_id: 'w-1',
      guest_name: '홍길동',
      recipient_slot: 'groom',
      relation_category: '친구/지인',
      relation_detail: '대학 동기',
      amount: 50000,
      pay_method: 'transfer',
    })
    expect(data).toEqual({ id: 'gift-123', amount: 50000 })
    expect(captured).toEqual({
      wedding_id: 'w-1',
      guest_name: '홍길동',
      recipient_slot: 'groom',
      relation_category: '친구/지인',
      relation_detail: '대학 동기',
      amount: 50000,
      pay_method: 'transfer',
      guestbook_entry_id: undefined,
    })
  })

  it('옵션 필드(relation_detail, guestbook_entry_id) 채워 전달', async () => {
    let captured: { guestbook_entry_id?: string } | null = null
    server.use(
      http.post(`${API_BASE}/cash-gifts`, async ({ request }) => {
        captured = (await request.json()) as { guestbook_entry_id?: string }
        return HttpResponse.json({ id: 'gift-456' })
      }),
    )

    const { result } = renderHook(() => useCreateCashGiftMutation(), { wrapper })
    await result.current.mutateAsync({
      wedding_id: 'w-2',
      guest_name: '김',
      recipient_slot: 'bride',
      relation_category: '가족/친척',
      amount: 30000,
      pay_method: 'transfer',
      guestbook_entry_id: 'gb-99',
    })
    expect((captured as { guestbook_entry_id?: string } | null)?.guestbook_entry_id).toBe('gb-99')
  })

  it('서버 5xx → throw (throwOnError: true)', async () => {
    server.use(
      http.post(`${API_BASE}/cash-gifts`, () => new HttpResponse(null, { status: 500 })),
    )

    const { result } = renderHook(() => useCreateCashGiftMutation(), { wrapper })
    await expect(
      result.current.mutateAsync({
        wedding_id: 'w-3',
        guest_name: 'x',
        recipient_slot: 'groom',
        relation_category: '친구/지인',
        amount: 10000,
        pay_method: 'transfer',
      }),
    ).rejects.toBeDefined()
  })

  it('mutate 후 isSuccess + isPending false로 종료', async () => {
    server.use(
      http.post(`${API_BASE}/cash-gifts`, () => HttpResponse.json({ id: 'gift-x' })),
    )

    const { result } = renderHook(() => useCreateCashGiftMutation(), { wrapper })
    result.current.mutate({
      wedding_id: 'w-4',
      guest_name: 'x',
      recipient_slot: 'groom',
      relation_category: '친구/지인',
      amount: 10000,
      pay_method: 'transfer',
    })
    // isPending=true 중간 시점 잡기는 race-y. 종료 상태만 검증.
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isPending).toBe(false)
  })
})
