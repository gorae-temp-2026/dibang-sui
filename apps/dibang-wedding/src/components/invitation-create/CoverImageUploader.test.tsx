/**
 * CoverImageUploader — co-located 테스트.
 *
 * 컴포넌트 책임 (낙관적 UI):
 *  - 헤더 + file input + 미리보기(item.localUrl 우선, 없으면 store.coverImage).
 *  - item.status='uploading': 미리보기 위 "업로드 중..." 오버레이 (input은 계속 활성 — 교체 가능).
 *  - item.status='failed': "업로드 실패" 오버레이 + 재시도 버튼 + 에러 텍스트.
 *  - 삭제: item 있으면 onRemoveItem, 없으면 store.coverImage 비움.
 *  - 위치 조정: 서버 URL 기준 — 업로드 진행/실패 중에는 숨김.
 *  - file 선택 → onPickFile(file) 호출 + input value 리셋.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoverImageUploader } from './CoverImageUploader'
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm'
import type { InvitationUploadItem } from '../../machines/invitationImageUpload.machine'

afterEach(() => {
  useInvitationForm.getState().reset()
})

const baseProps = {
  onPickFile: vi.fn(),
  onRetry: vi.fn(),
  onRemoveItem: vi.fn(),
}

function makeItem(overrides: Partial<InvitationUploadItem> = {}): InvitationUploadItem {
  return {
    id: 'item-1',
    file: new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
    localUrl: 'blob:cover.jpg',
    status: 'uploading',
    ...overrides,
  }
}

describe('CoverImageUploader', () => {
  it('기본: 헤더 "커버 이미지" + "파일 선택" 텍스트가 보인다', () => {
    render(<CoverImageUploader {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Cover image' })).toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
  })

  it('item 없음 + store.coverImage 비어있음: 미리보기·삭제 버튼 없음', () => {
    render(<CoverImageUploader {...baseProps} />)
    expect(screen.queryByAltText('Cover preview')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('uploading item: localUrl 미리보기 + "업로드 중..." 오버레이, input은 활성 유지', () => {
    render(<CoverImageUploader {...baseProps} item={makeItem()} />)
    const img = screen.getByAltText('Cover preview') as HTMLImageElement
    expect(img.src).toContain('blob:cover.jpg')
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeDisabled()
  })

  it('failed item: "업로드 실패" + 재시도 버튼 + 에러 텍스트, 재시도 클릭 → onRetry', async () => {
    const onRetry = vi.fn()
    render(
      <CoverImageUploader
        {...baseProps}
        onRetry={onRetry}
        item={makeItem({ status: 'failed', error: '이미지를 10MB 이하로 줄이지 못했습니다.' })}
      />,
    )
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    expect(screen.getByText('이미지를 10MB 이하로 줄이지 못했습니다.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('item 있을 때 삭제 클릭 → onRemoveItem (store는 건드리지 않음)', async () => {
    const onRemoveItem = vi.fn()
    useInvitationForm.getState().setField('coverImage', 'https://example.com/old.jpg')
    render(<CoverImageUploader {...baseProps} onRemoveItem={onRemoveItem} item={makeItem()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onRemoveItem).toHaveBeenCalledTimes(1)
    expect(useInvitationForm.getState().coverImage).toBe('https://example.com/old.jpg')
  })

  it('item 없이 store.coverImage 채워짐: 미리보기 + 삭제 클릭 → store 비워짐', async () => {
    useInvitationForm.getState().setField('coverImage', 'https://example.com/cover.jpg')
    render(<CoverImageUploader {...baseProps} />)
    expect(screen.getByAltText('Cover preview')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useInvitationForm.getState().coverImage).toBe('')
  })

  it('위치 조정: 저장된 커버(store)에선 보이고, 업로드 진행 중에는 숨김', () => {
    useInvitationForm.getState().setField('coverImage', 'https://example.com/cover.jpg')
    const { rerender } = render(<CoverImageUploader {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Adjust position' })).toBeInTheDocument()

    rerender(<CoverImageUploader {...baseProps} item={makeItem()} />)
    expect(screen.queryByRole('button', { name: 'Adjust position' })).not.toBeInTheDocument()
  })

  it('파일 선택 → onPickFile(file)로 콜백 호출', async () => {
    const onPickFile = vi.fn()
    render(<CoverImageUploader {...baseProps} onPickFile={onPickFile} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    await userEvent.upload(fileInput, file)
    expect(onPickFile).toHaveBeenCalledTimes(1)
    expect(onPickFile).toHaveBeenCalledWith(file)
  })
})
