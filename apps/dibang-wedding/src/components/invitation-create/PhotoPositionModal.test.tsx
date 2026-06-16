/**
 * PhotoPositionModal — co-located 테스트.
 *
 * 컴포넌트 책임:
 *  - 모달 헤더 "사진 위치 조정" + 안내 텍스트.
 *  - 취소 버튼 / 닫기 X 버튼 → onClose 호출.
 *  - 적용 버튼: croppedArea === null이면 onApply 호출 안 함 (early return).
 *  - zoom range input 변경 → state 갱신 (Cropper의 zoom prop 변화로 확인).
 *  - saved prop으로 초기 zoom·crop 복원.
 *
 * react-easy-crop의 Cropper는 jsdom에서 매끄럽지 않아 vi.mock으로 대체.
 * 모달 자체의 책임만 검증.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PhotoPositionModal } from './PhotoPositionModal'

vi.mock('react-easy-crop', () => ({
  default: ({ zoom }: { zoom: number }) => (
    <div data-testid="cropper-mock" data-zoom={zoom} />
  ),
}))

describe('PhotoPositionModal', () => {
  const defaultProps = {
    url: 'https://a/1.jpg',
    saved: null,
    onApply: vi.fn(),
    onClose: vi.fn(),
  }

  it('헤더 + 안내문 + 취소/적용 버튼 노출', () => {
    render(<PhotoPositionModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: '사진 위치 조정' })).toBeInTheDocument()
    expect(screen.getByText(/드래그하여 위치를/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '적용' })).toBeInTheDocument()
  })

  it('취소 버튼 → onClose 호출', async () => {
    const onClose = vi.fn()
    render(<PhotoPositionModal {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('X 닫기 버튼 → onClose 호출', async () => {
    const onClose = vi.fn()
    render(<PhotoPositionModal {...defaultProps} onClose={onClose} />)
    const closeBtn = screen.getByText(/×/)
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('적용 버튼: croppedArea null이면 onApply 미호출, onClose도 미호출', async () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<PhotoPositionModal {...defaultProps} onApply={onApply} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('zoom range 변경 → Cropper의 zoom prop 갱신', () => {
    render(<PhotoPositionModal {...defaultProps} />)
    expect(screen.getByTestId('cropper-mock')).toHaveAttribute('data-zoom', '1')
    const range = document.querySelector('input[type="range"]') as HTMLInputElement
    fireEvent.change(range, { target: { value: '2' } })
    expect(screen.getByTestId('cropper-mock')).toHaveAttribute('data-zoom', '2')
  })

  it('saved prop이 있으면 초기 zoom을 그 값으로 복원', () => {
    render(
      <PhotoPositionModal
        {...defaultProps}
        saved={{
          cropArea: { x: 0, y: 0, width: 100, height: 100 },
          zoom: 1.5,
          editorCrop: { x: 5, y: 10 },
        }}
      />,
    )
    expect(screen.getByTestId('cropper-mock')).toHaveAttribute('data-zoom', '1.5')
  })
})
