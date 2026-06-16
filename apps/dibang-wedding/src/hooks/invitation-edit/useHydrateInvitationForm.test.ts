/**
 * useHydrateInvitationForm — wedding+invitation → zustand store 주입.
 *
 * 책임:
 *  - wedding 또는 invitation undefined → early return (store 변경 없음).
 *  - 둘 다 있음 → 모든 필드 store에 setField + setGroomAccounts/setBrideAccounts.
 *  - 계좌가 bank 없으면 enabled=false 슬롯으로.
 *  - 옵션 필드(*_deceased, custom_message 등) null/undefined fallback.
 *  - 같은 invitation(slug)에 대해 최초 1회만 hydrate — refetch(창 포커스 등)로
 *    객체 참조가 바뀌어도 미저장 편집을 서버값으로 덮어쓰지 않는다.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useHydrateInvitationForm } from './useHydrateInvitationForm'
import { useInvitationForm } from '../invitation-create/useInvitationForm'

afterEach(() => {
  useInvitationForm.getState().reset()
})

function makeWedding() {
  return {
    info: {
      groom_name: '신랑이',
      bride_name: '신부이',
      groom_father_name: '신부친',
      groom_mother_name: '신모친',
      bride_father_name: '신부부친',
      bride_mother_name: '신부모친',
      groom_father_deceased: false,
      groom_mother_deceased: true,
      bride_father_deceased: false,
      bride_mother_deceased: false,
      date: '2026-06-01',
      time: '12:00',
      venue: { venue_name: 'V', venue_address: 'A', venue_hall: 'H' },
      groom_account: { bank: '국민은행', address: '123-456' },
      groom_father_account: { bank: '', address: '' },
      groom_mother_account: { bank: '신한은행', address: '777' },
      bride_account: { bank: '하나은행', address: '999' },
    },
  }
}

function makeInvitation() {
  return {
    slug: 'mywed',
    custom_message: 'hello',
    design_template_id: 'tpl-1',
    cover_image: 'https://a/cover.jpg',
    gallery_photos: ['https://a/1.jpg', 'https://a/2.jpg'],
    cover_text_config: {
      text: 'Custom',
      font_size: 50,
      x: 10,
      y: 20,
      rotation: 5,
    },
  }
}

describe('useHydrateInvitationForm', () => {
  it('wedding=undefined → store 변경 없음', () => {
    renderHook(() => useHydrateInvitationForm(undefined, makeInvitation(), 'mywed'))
    expect(useInvitationForm.getState().groomName).toBe('')
  })

  it('invitation=undefined → store 변경 없음', () => {
    renderHook(() => useHydrateInvitationForm(makeWedding(), undefined, 'mywed'))
    expect(useInvitationForm.getState().groomName).toBe('')
  })

  it('둘 다 주어짐 → 텍스트 필드 + 갤러리 + 커버 모두 주입', () => {
    renderHook(() => useHydrateInvitationForm(makeWedding(), makeInvitation(), 'mywed'))
    const s = useInvitationForm.getState()
    expect(s.groomName).toBe('신랑이')
    expect(s.brideName).toBe('신부이')
    expect(s.date).toBe('2026-06-01')
    expect(s.venueName).toBe('V')
    expect(s.slug).toBe('mywed')
    expect(s.originalSlug).toBe('mywed')
    expect(s.customMessage).toBe('hello')
    expect(s.designTemplateId).toBe('tpl-1')
    expect(s.coverImage).toBe('https://a/cover.jpg')
    expect(s.galleryPhotos).toEqual(['https://a/1.jpg', 'https://a/2.jpg'])
    expect(s.coverTextConfig).toEqual({
      text: 'Custom',
      fontSize: 50,
      x: 10,
      y: 20,
      rotation: 5,
      animation: 'typing',
      colorType: 'gradient',
      solidColor: '#FF8FA3',
      gradientColors: ['#FFB8C5', '#FFE0A8'],
    })
  })

  it('refetch로 같은 invitation이 새 객체로 와도 재hydrate하지 않는다 (미저장 편집 보존)', () => {
    const { rerender } = renderHook(
      ({ w, i, s }: { w: ReturnType<typeof makeWedding>; i: ReturnType<typeof makeInvitation>; s: string }) =>
        useHydrateInvitationForm(w, i, s),
      { initialProps: { w: makeWedding(), i: makeInvitation(), s: 'mywed' } },
    )
    // 사용자가 hydrate 후 편집 (낙관적 업로드 완료분 포함)
    const store = useInvitationForm.getState()
    store.addGalleryPhoto('https://a/new-upload.jpg')
    store.setField('coverImage', 'https://a/new-cover.jpg')

    // 창 포커스 복귀 등으로 같은 내용이 새 객체 참조로 재전달
    rerender({ w: makeWedding(), i: makeInvitation(), s: 'mywed' })

    const s = useInvitationForm.getState()
    expect(s.galleryPhotos).toContain('https://a/new-upload.jpg')
    expect(s.coverImage).toBe('https://a/new-cover.jpg')
  })

  it('reset 후에는 같은 invitation도 다시 hydrate한다 (StrictMode 이중 마운트·저장 후 재진입 회귀)', () => {
    // 2026-06-10 회귀: ref 가드는 [hydrate → 페이지 cleanup reset → 재마운트]에서
    // 살아남아 빈 store를 방치 → Edit 재진입 시 전부 빈칸. store 가드는 reset과 함께 풀린다.
    const { rerender } = renderHook(
      ({ w, i, s }: { w: ReturnType<typeof makeWedding>; i: ReturnType<typeof makeInvitation>; s: string }) =>
        useHydrateInvitationForm(w, i, s),
      { initialProps: { w: makeWedding(), i: makeInvitation(), s: 'mywed' } },
    )
    expect(useInvitationForm.getState().groomName).toBe('신랑이')

    useInvitationForm.getState().reset() // EditPage unmount cleanup 시뮬레이션
    expect(useInvitationForm.getState().groomName).toBe('')

    rerender({ w: makeWedding(), i: makeInvitation(), s: 'mywed' }) // 재마운트(캐시 히트) 시뮬레이션
    expect(useInvitationForm.getState().groomName).toBe('신랑이')
    expect(useInvitationForm.getState().slug).toBe('mywed')
  })

  it('다른 invitation(slug 변경)으로 바뀌면 다시 hydrate한다', () => {
    const { rerender } = renderHook(
      ({ w, i, s }: { w: ReturnType<typeof makeWedding>; i: ReturnType<typeof makeInvitation>; s: string }) =>
        useHydrateInvitationForm(w, i, s),
      { initialProps: { w: makeWedding(), i: makeInvitation(), s: 'mywed' } },
    )
    useInvitationForm.getState().setField('coverImage', 'https://a/edited.jpg')

    rerender({ w: makeWedding(), i: { ...makeInvitation(), slug: 'otherwed', cover_image: 'https://b/cover.jpg' }, s: 'otherwed' })

    const s = useInvitationForm.getState()
    expect(s.slug).toBe('otherwed')
    expect(s.coverImage).toBe('https://b/cover.jpg')
  })

  it('계좌 bank 있음 → enabled=true 슬롯, bank 없으면 enabled=false', () => {
    renderHook(() => useHydrateInvitationForm(makeWedding(), makeInvitation(), 'mywed'))
    const s = useInvitationForm.getState()
    // groomAccounts[0] = 신랑(국민은행), [1] = 아버지(bank 없음 → disabled), [2] = 어머니(신한은행)
    expect(s.groomAccounts[0].enabled).toBe(true)
    expect(s.groomAccounts[0].bank).toBe('국민은행')
    expect(s.groomAccounts[1].enabled).toBe(false)
    expect(s.groomAccounts[2].enabled).toBe(true)
    expect(s.groomAccounts[2].bank).toBe('신한은행')
    expect(s.brideAccounts[0].enabled).toBe(true)
    expect(s.brideAccounts[0].bank).toBe('하나은행')
  })

  it('deceased 필드 매핑', () => {
    renderHook(() => useHydrateInvitationForm(makeWedding(), makeInvitation(), 'mywed'))
    const s = useInvitationForm.getState()
    expect(s.groomFatherDeceased).toBe(false)
    expect(s.groomMotherDeceased).toBe(true)
    expect(s.brideFatherDeceased).toBe(false)
  })

  it('invitation.cover_text_config=null → coverTextConfig 변경 안 함 (기본값 유지)', () => {
    const inv = { ...makeInvitation(), cover_text_config: null }
    const before = useInvitationForm.getState().coverTextConfig
    renderHook(() => useHydrateInvitationForm(makeWedding(), inv, 'mywed'))
    const after = useInvitationForm.getState().coverTextConfig
    expect(after).toEqual(before)
  })
})
