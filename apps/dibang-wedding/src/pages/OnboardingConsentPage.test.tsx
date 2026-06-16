import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi } from 'vitest'

// contracts 모킹: 네트워크 없이 동의 저장 성공 + 안정적인 getMe 캐시 키.
vi.mock('@gorae/contracts/@tanstack/react-query.gen', () => ({
  createConsentsMutation: () => ({ mutationFn: async () => ({}) }),
  getMeQueryKey: () => ['getMe'],
}))

import { OnboardingConsentPage } from './OnboardingConsentPage'

const GET_ME_KEY = ['getMe']

function seededClient() {
  const client = new QueryClient({
    // gcTime Infinity: 관찰자 없는 시드 캐시가 수거되지 않게 유지(테스트 안정성).
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  // 동의 전 상태: 필수 약관 미동의 → 게이트가 동의 페이지로 보내는 상황.
  client.setQueryData(GET_ME_KEY, {
    id: 'u-1',
    name: '박태원',
    email: 'ptw@test.local',
    consents_required: ['age_verification', 'service', 'privacy'],
    marketing_agreed: false,
  })
  return client
}

describe('OnboardingConsentPage — 동의 성공 후 게이트 루프 방지', () => {
  it('동의 저장 성공 시 getMe 캐시의 consents_required를 []로 낙관적 갱신한다', async () => {
    const client = seededClient()
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/onboarding/consent?next=/my-wedding']}>
          <OnboardingConsentPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByLabelText('(필수) 만 14세 이상 확인'))
    await userEvent.click(screen.getByLabelText('(필수) 서비스 이용약관 동의'))
    await userEvent.click(screen.getByLabelText('(필수) 개인정보 수집·이용 동의'))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작' }))

    // 동의 직후 캐시가 비어야(=[]) 도착 페이지의 OnboardingGate가 옛 상태로 되돌리지 않는다.
    // 현재 코드(invalidate만)에서는 캐시가 그대로라 실패(red) → 낙관적 갱신 적용 시 통과.
    await waitFor(() => {
      expect(client.getQueryData(GET_ME_KEY)).toMatchObject({ consents_required: [] })
    })
  })
})
