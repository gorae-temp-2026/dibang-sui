/**
 * InyeonPage — 디방인연 탭 스모크 (포팅 ②).
 *
 * 책임:
 *  - 다크 셸 · 브랜드 · 요네 지갑(1,250) 노출.
 *  - 첫 카드 = 익명 hook(이름 미노출) + 이음 신청 버튼.
 *  - 이음 신청 클릭 → 이음 시트(한마디 입력) 오픈.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InyeonPage } from './InyeonPage'

describe('InyeonPage 디방인연', () => {
  it('브랜드 · 요네 지갑 · 익명 카드 hook을 노출한다', () => {
    render(<InyeonPage />)
    expect(screen.getByText('디방인연')).toBeInTheDocument()
    expect(screen.getByText(/1,250/)).toBeInTheDocument()
    // 이음 전이라 이름 대신 generic hook (구체 식장명 없음)
    const hooks = screen.getAllByText(
      /함께 참여한 결혼식이 있어요|두 다리 건너 아는 사이예요|아직 마주친 적 없는 새 인연이에요/,
    )
    expect(hooks.length).toBeGreaterThan(0)
  })

  it('이음 신청 버튼 → 한마디 입력 시트가 열린다', async () => {
    const user = userEvent.setup()
    render(<InyeonPage />)
    await user.click(screen.getByRole('button', { name: '이음 신청' }))
    expect(await screen.findByPlaceholderText(/같은 결혼식에서/)).toBeInTheDocument()
  })
})
