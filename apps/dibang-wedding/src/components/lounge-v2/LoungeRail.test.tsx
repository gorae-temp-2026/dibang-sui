/**
 * LoungeRail — 접이식 액션 레일 (③ 라운지 레일 재구성).
 *
 * 책임:
 *  - 기본 접힘: 토글(＋)만 노출, 액션은 숨김 (평소 피드 안 가림).
 *  - 토글 → 액션 펼침 · 액션 클릭 시 핸들러 호출.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoungeRail } from './LoungeRail'

describe('LoungeRail 접이식 액션 레일', () => {
  it('기본 접힘 — 토글만 보이고 액션은 숨긴다', () => {
    render(
      <LoungeRail
        actions={[{ key: 'memory', label: '메모리', icon: <span />, onClick: vi.fn() }]}
      />,
    )
    expect(screen.getByLabelText('레일 펴기')).toBeInTheDocument()
    expect(screen.queryByLabelText('메모리')).not.toBeInTheDocument()
  })

  it('토글 → 액션 펼침, 액션 클릭 시 핸들러 호출', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<LoungeRail actions={[{ key: 'memory', label: '메모리', icon: <span />, onClick }]} />)

    await user.click(screen.getByLabelText('레일 펴기'))
    await user.click(await screen.findByLabelText('메모리'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
