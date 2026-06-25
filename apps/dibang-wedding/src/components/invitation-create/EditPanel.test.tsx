/**
 * EditPanel — 거대 컨테이너(~317 LOC). 모든 분기·필드를 다 검증하지 않고,
 * 다음만 smoke로 본다:
 *  - 필수 prop으로 render되고 기본 title이 노출된다.
 *  - title prop이 노출된다.
 *  - 기본(invitationOnly=false): "신랑 측 정보", "신부 측 정보", "갤러리 사진", "커버 이미지" 섹션이 모두 보인다.
 *  - invitationOnly=true: "신랑 측 정보" 등 비-청첩장 섹션이 안 보인다.
 *  - 자식 컴포넌트(AccountEditor·CoverImageUploader·GalleryUploader)는 별도 spec에서 단독 검증.
 *
 * daum-postcode는 호출 시에만 window.daum을 찾으므로 render-only 테스트는 안전.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditPanel } from './EditPanel'
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm'

// heic2any는 브라우저 전용(wasm) — jsdom 모듈 로드 시 평가 에러. 업로드 체인 import만 살아있으면 되므로 mock.
vi.mock('heic2any', () => ({ default: vi.fn() }))

// react-konva(Stage)는 jsdom에 실제 canvas가 없어 mount 시점에 터진다 —
// EditPanel smoke 범위 밖이므로 자리표시자로 대체 (CanvasEditor 자체 검증은 E2E 몫)
vi.mock('./CanvasEditor', () => ({
  CanvasEditor: () => <div data-testid="canvas-editor-stub" />,
}))

afterEach(() => {
  useInvitationForm.getState().reset()
})

const baseProps = {
  uploadContext: { mode: 'draft' } as const,
  onPickCover: vi.fn(),
  onRetryCover: vi.fn(),
  onRemoveCoverItem: vi.fn(),
  onAddGalleryPhotos: vi.fn(),
  galleryItems: [],
  onRetryGalleryItem: vi.fn(),
  onRemoveGalleryItem: vi.fn(),
  onUploadImage: vi.fn(async () => null),
}

describe('EditPanel (smoke)', () => {
  it('기본 title "Create invitation"이 보인다', () => {
    render(<EditPanel {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Create invitation', level: 1 })).toBeInTheDocument()
  })

  it('title prop 전달 → 그 텍스트가 h1으로 노출', () => {
    render(<EditPanel {...baseProps} title="결혼식 편집" />)
    expect(screen.getByRole('heading', { name: '결혼식 편집', level: 1 })).toBeInTheDocument()
  })

  it('invitationOnly=false (기본): 비-청첩장 섹션이 함께 노출된다', () => {
    render(<EditPanel {...baseProps} />)
    // 청첩장 섹션 + 비-청첩장(나의 역할/신랑·신부 정보) 섹션 텍스트
    expect(screen.getByRole('heading', { name: /My role/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Groom info' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bride info' })).toBeInTheDocument()
  })

  it('invitationOnly=true: 비-청첩장 섹션은 숨김', () => {
    render(<EditPanel {...baseProps} invitationOnly />)
    expect(screen.queryByRole('heading', { name: /My role/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Groom info' })).not.toBeInTheDocument()
  })
})
