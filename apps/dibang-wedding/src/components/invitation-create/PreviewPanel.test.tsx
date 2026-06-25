/**
 * PreviewPanel — smoke 테스트.
 *
 * 외부 의존:
 *  - `react-moveable` (DOM 직접 조작 기반, jsdom에서 매끄럽지 않음)
 *  - `@gorae/invitation-ui`의 InvitationRenderer (sub-tree 크고 별도 패키지)
 *
 * 본 spec은 PreviewPanel 자체의 컨테이너 책임만 검증:
 *  - 외부 컴포넌트를 mock한 상태에서 render 가능 (crash 없음).
 *  - PhotoPositionModal은 editPhotoUrl이 set돼야 노출되므로, InvitationRenderer mock에서
 *    onEditPhoto 콜백을 즉시 호출해 분기 진입을 확인.
 *
 * 텍스트 드래그/리사이즈 → coverTextConfig 갱신 같은 인터랙션은 react-moveable 의존이라
 * 별도 통합/E2E 레이어로 미룬다 (FRONTEND_TESTING.md § 매트릭스 권장).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Moveable: 빈 div 대체 — props 무시.
vi.mock('react-moveable', () => ({
  default: () => null,
}))

// InvitationRenderer: coverTextRef·onEditPhoto props 사용을 가짜로 노출.
vi.mock('@gorae/invitation-ui', () => ({
  InvitationRenderer: ({
    coverTextRef,
    onEditPhoto,
  }: {
    coverTextRef?: (el: HTMLDivElement | null) => void
    onEditPhoto?: (url: string) => void
  }) => {
    return (
      <div data-testid="invitation-renderer">
        <button
          type="button"
          data-testid="renderer-pick-cover-text"
          onClick={() => coverTextRef?.(document.createElement('div'))}
        >
          set-cover-text-ref
        </button>
        <button
          type="button"
          data-testid="renderer-pick-edit-photo"
          onClick={() => onEditPhoto?.('https://a/1.jpg')}
        >
          pick-edit-photo
        </button>
      </div>
    )
  },
}))

import { PreviewPanel } from './PreviewPanel'
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm'

afterEach(() => {
  useInvitationForm.getState().reset()
})

describe('PreviewPanel (smoke)', () => {
  it('mock 상태에서 render 가능 + InvitationRenderer가 노출된다', () => {
    render(<PreviewPanel />)
    expect(screen.getByTestId('invitation-renderer')).toBeInTheDocument()
  })

  it('onEditPhoto 콜백 호출 → PhotoPositionModal이 노출된다', async () => {
    render(<PreviewPanel />)
    await userEvent.click(screen.getByTestId('renderer-pick-edit-photo'))
    // PhotoPositionModal 헤더로 분기 진입 확인 (실제 컴포넌트 그대로 사용)
    expect(screen.getByRole('heading', { name: 'Adjust photo position' })).toBeInTheDocument()
  })
})
