/**
 * GalleryUploader — co-located 테스트.
 *
 * 컴포넌트 책임 (낙관적 UI):
 *  - 헤더 + 카운터 ((store+items)/60) + 그리드.
 *  - 총합 < 60: "+" file input 셀 노출, 60 도달: "+" 셀 없음.
 *  - store 칸: 드래그 정렬·X(removeGalleryPhoto).
 *  - item 칸: localUrl 미리보기, uploading 오버레이 / failed 재시도·X —
 *    파일별 독립 (실패 칸이 있어도 다른 칸 동작).
 *  - file change → onPickFiles(files[]) + input value 리셋.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GalleryUploader, MAX_GALLERY_PHOTOS } from './GalleryUploader'
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm'
import type { InvitationUploadItem } from '../../machines/invitationImageUpload.machine'

afterEach(() => {
  useInvitationForm.getState().reset()
})

const baseProps = {
  items: [] as InvitationUploadItem[],
  onPickFiles: vi.fn(),
  onRetryItem: vi.fn(),
  onRemoveItem: vi.fn(),
}

function makeItem(overrides: Partial<InvitationUploadItem> = {}): InvitationUploadItem {
  return {
    id: 'item-1',
    file: new File(['x'], 'g.jpg', { type: 'image/jpeg' }),
    localUrl: 'blob:g.jpg',
    status: 'uploading',
    ...overrides,
  }
}

describe('GalleryUploader', () => {
  it('기본: 헤더 + (0/60) 카운터 + "+" 셀 노출', () => {
    render(<GalleryUploader {...baseProps} />)
    expect(screen.getByRole('heading', { name: /Gallery photos/ })).toBeInTheDocument()
    expect(screen.getByText('(0/60)')).toBeInTheDocument()
    expect(document.querySelector('input[type="file"][multiple]')).toBeInTheDocument()
  })

  it('카운터: store 사진 + 진행 중 item을 합산한다', () => {
    useInvitationForm.getState().addGalleryPhoto('https://a/1.jpg')
    render(<GalleryUploader {...baseProps} items={[makeItem()]} />)
    expect(screen.getByText('(2/60)')).toBeInTheDocument()
  })

  it('uploading item 칸: localUrl 미리보기 + "업로드 중" 오버레이', () => {
    render(<GalleryUploader {...baseProps} items={[makeItem()]} />)
    const img = screen.getByAltText('Photo uploading') as HTMLImageElement
    expect(img.src).toContain('blob:g.jpg')
    expect(screen.getByText('Uploading')).toBeInTheDocument()
  })

  it('failed item 칸: 재시도 → onRetryItem(id), X → onRemoveItem(id)', async () => {
    const onRetryItem = vi.fn()
    const onRemoveItem = vi.fn()
    render(
      <GalleryUploader
        {...baseProps}
        onRetryItem={onRetryItem}
        onRemoveItem={onRemoveItem}
        items={[makeItem({ id: 'f1', status: 'failed', error: 'boom' })]}
      />,
    )
    expect(screen.getByText('Failed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetryItem).toHaveBeenCalledWith('f1')
    await userEvent.click(screen.getByRole('button', { name: 'X' }))
    expect(onRemoveItem).toHaveBeenCalledWith('f1')
  })

  it('failed item이 있으면 안내 문구가 보인다', () => {
    render(<GalleryUploader {...baseProps} items={[makeItem({ status: 'failed' })]} />)
    expect(screen.getByText(/Some photos failed to upload/)).toBeInTheDocument()
  })

  it('store에 사진 3장: 카운터 3/60 + 사진 3개 + 삭제 클릭 → 1개 제거', async () => {
    const store = useInvitationForm.getState()
    store.setField('galleryPhotos', ['https://a/1.jpg', 'https://a/2.jpg', 'https://a/3.jpg'])
    render(<GalleryUploader {...baseProps} />)
    expect(screen.getByText('(3/60)')).toBeInTheDocument()
    const xButtons = screen.getAllByRole('button', { name: 'X' })
    expect(xButtons).toHaveLength(3)
    await userEvent.click(xButtons[1])
    expect(useInvitationForm.getState().galleryPhotos).toEqual(['https://a/1.jpg', 'https://a/3.jpg'])
  })

  it('총합 60 도달: "+" 셀 노출 안 함 (진행 중 item 포함 계산)', () => {
    const photos = Array.from({ length: MAX_GALLERY_PHOTOS - 1 }, (_, i) => `https://a/${i}.jpg`)
    useInvitationForm.getState().setField('galleryPhotos', photos)
    render(<GalleryUploader {...baseProps} items={[makeItem()]} />)
    expect(document.querySelector('input[type="file"][multiple]')).not.toBeInTheDocument()
    expect(screen.getByText('(60/60)')).toBeInTheDocument()
  })

  it('파일 선택 → onPickFiles에 배열로 전달', async () => {
    const onPickFiles = vi.fn()
    render(<GalleryUploader {...baseProps} onPickFiles={onPickFiles} />)
    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    const f1 = new File(['a'], '1.png', { type: 'image/png' })
    const f2 = new File(['b'], '2.png', { type: 'image/png' })
    await userEvent.upload(fileInput, [f1, f2])
    expect(onPickFiles).toHaveBeenCalledTimes(1)
    const passed = onPickFiles.mock.calls[0][0] as File[]
    expect(passed).toHaveLength(2)
    expect(passed[0].name).toBe('1.png')
    expect(passed[1].name).toBe('2.png')
  })
})
