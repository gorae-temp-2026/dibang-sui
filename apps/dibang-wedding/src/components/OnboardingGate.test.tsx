import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 게이트는 공유 useGetMe로 사용자 상태를 읽는다 — 데이터 소스를 모킹해 게이팅 로직만 검증.
const mockUseGetMe = vi.fn()
vi.mock('../queries/shared/useGetMe', () => ({
  useGetMe: () => mockUseGetMe(),
}))

import { OnboardingGate } from './OnboardingGate'

function renderGate() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/my-wedding']}>
        <Routes>
          <Route
            path="/my-wedding"
            element={
              <OnboardingGate>
                <div>PROTECTED_CHILD</div>
              </OnboardingGate>
            }
          />
          <Route path="/onboarding/consent" element={<div>CONSENT_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => mockUseGetMe.mockReset())

describe('OnboardingGate', () => {
  it('consents_required가 남아있으면 /onboarding/consent로 보낸다', () => {
    mockUseGetMe.mockReturnValue({
      data: { consents_required: ['service'] },
      isLoading: false,
      isError: false,
    })
    renderGate()
    expect(screen.getByText('CONSENT_PAGE')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED_CHILD')).not.toBeInTheDocument()
  })

  it('consents_required가 비면 children을 통과시킨다', () => {
    mockUseGetMe.mockReturnValue({
      data: { consents_required: [] },
      isLoading: false,
      isError: false,
    })
    renderGate()
    expect(screen.getByText('PROTECTED_CHILD')).toBeInTheDocument()
  })

  it('로딩 중에는 children을 통과시킨다 (permissive 디폴트)', () => {
    mockUseGetMe.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderGate()
    expect(screen.getByText('PROTECTED_CHILD')).toBeInTheDocument()
  })
})
