/**
 * InyeonPage — 디방인연 탭 스모크 (포팅 ②).
 *
 * 책임:
 *  - 다크 셸 · 브랜드 · SUI 지갑 잔액 노출.
 *  - 첫 카드 = 익명 hook(이름 미노출) + 프로필 보기 → 상세 → 이음 신청.
 *  - 이음 신청 클릭 → 이음 시트(한마디 입력) 오픈.
 *
 * ※ 카드 풀은 온체인 discoverUsers(useDiscoverUsers)에서 오므로 mock으로 1명 주입.
 * ※ 앱 기본 언어 = en(i18n.ts) → 노출 텍스트는 영문. assertion은 translate('en', key)로 동결.
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createQueryWrapper } from '../test-utils'
import { translate } from '../lib/i18n'
import type { Moi } from '../components/inyeon/types'

vi.mock('../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({ address: null, isAuthenticated: false, executeOnchain: vi.fn() }),
}))

vi.mock('../hooks/useCredit', () => ({
  useMyCreditStats: () => ({ data: undefined, isLoading: false }),
}))

vi.mock('../hooks/useOnchainHostActions', () => ({
  useOnchainHostActions: () => ({ requestIum: vi.fn(), acceptIum: vi.fn(), purchaseItem: vi.fn() }),
}))

// 온체인 매칭 후보 1명(tier 0 = 같은 결혼식) 주입 — 카드/이음 흐름 검증용.
const MOI: Moi = {
  id: 1,
  name: '0xabc…1234',
  photos: [{ hue: 210 }],
  online: false,
  tier: 0,
  deg: 1,
  hook: translate('en', 'inyeon.tier.0.hook'),
  mutualCount: 3,
  prov: [{ emoji: '💒', text: 'shared wedding', tier: 0 }],
  balLabel: translate('en', 'trust.high'),
  barsF: 4,
  net: 3,
}
// 반환 객체를 모듈 상수로 고정 — 매 렌더 새 참조면 SET_POOL useEffect가 무한 루프.
const DISCOVER = {
  users: [MOI],
  incoming: [],
  sentMoiIds: [],
  matchedAddresses: [],
  loading: false,
  refetch: vi.fn(),
}
vi.mock('../hooks/useDiscoverUsers', () => ({
  useDiscoverUsers: () => DISCOVER,
}))

vi.mock('../env', () => ({
  env: { VITE_SUI_NETWORK: 'testnet' },
}))

import { InyeonPage } from './InyeonPage'

describe('InyeonPage 디방인연', () => {
  it('브랜드 · SUI 지갑 · 익명 카드 hook을 노출한다', () => {
    render(<InyeonPage />, { wrapper: createQueryWrapper() })
    expect(screen.getByText(translate('en', 'inyeon.brand'))).toBeInTheDocument()
    expect(screen.getByText(/SUI$/)).toBeInTheDocument()
    // 이음 전이라 이름 대신 generic hook (구체 식장명 없음)
    expect(screen.getByText(translate('en', 'inyeon.tier.0.hook'))).toBeInTheDocument()
  })

  it('프로필 보기 → 상세 → 이음 신청 → 한마디 입력 시트가 열린다', async () => {
    const user = userEvent.setup()
    render(<InyeonPage />, { wrapper: createQueryWrapper() })
    // 카드 = 익명 단계. 프로필 보기(IeumIcon) → 상세 시트.
    await user.click(screen.getByRole('button', { name: translate('en', 'inyeon.viewProfile') }))
    // 상세 시트의 "이음 신청하기" → 이음(한마디) 시트.
    await user.click(await screen.findByRole('button', { name: translate('en', 'page.inyeon.requestIeum') }))
    expect(await screen.findByPlaceholderText(translate('en', 'ieum.placeholder'))).toBeInTheDocument()
  })
})
