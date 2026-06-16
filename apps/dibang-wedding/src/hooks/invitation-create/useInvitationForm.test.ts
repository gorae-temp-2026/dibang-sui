/**
 * useInvitationForm — zustand store + transformer 단위 테스트.
 *
 * 본 hook은 React 외부에서 직접 `.getState()` / store action 호출이 가능한 zustand 스토어.
 * 따라서 renderHook 없이 vanilla 호출로 검증 가능.
 *
 * 검증 범위:
 *  - 초기 상태 (initialState 일치)
 *  - 액션: setField·errors 자동 클리어, updateAccountSlot,
 *    addGalleryPhoto/remove/reorder, setGalleryPhotoPosition,
 *    validate (REQUIRED_FIELDS), clearErrors, reset
 *  - 변환 함수: toCreateWeddingRequest, toUpdateInvitationRequest, toPreviewData
 *
 * 모든 액션을 빠짐없이 다 검증하면 시간 과부하 — 외부 의존(API 매핑) 흐름과
 * 가드 분기(필수값 누락·계좌 enabled) 위주.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_GREETING,
  toCreateWeddingRequest,
  toPreviewData,
  toUpdateInvitationRequest,
  useInvitationForm,
} from './useInvitationForm'

afterEach(() => {
  useInvitationForm.getState().reset()
})

describe('useInvitationForm — initial state', () => {
  it('초기 myRole=groom, 빈 이름/날짜/장소', () => {
    const s = useInvitationForm.getState()
    expect(s.myRole).toBe('groom')
    expect(s.groomName).toBe('')
    expect(s.brideName).toBe('')
    expect(s.date).toBe('')
    expect(s.venueName).toBe('')
  })

  it('초기 groomAccounts·brideAccounts 각 3슬롯, 모두 enabled=false', () => {
    const s = useInvitationForm.getState()
    expect(s.groomAccounts).toHaveLength(3)
    expect(s.brideAccounts).toHaveLength(3)
    expect(s.groomAccounts.every((a) => !a.enabled)).toBe(true)
  })
})

describe('useInvitationForm — setField + errors 자동 해제', () => {
  it('setField가 값을 갱신', () => {
    useInvitationForm.getState().setField('groomName', '홍길동')
    expect(useInvitationForm.getState().groomName).toBe('홍길동')
  })

  it('이미 에러 set에 있는 필드에 값이 들어오면 errors에서 제거', () => {
    const s1 = useInvitationForm.getState()
    s1.validate() // 모든 필수 필드가 비어있으므로 모두 에러
    expect(useInvitationForm.getState().errors.has('groomName')).toBe(true)
    s1.setField('groomName', '홍길동')
    expect(useInvitationForm.getState().errors.has('groomName')).toBe(false)
  })

  it('값이 빈 문자열이면 errors에서 자동 제거되지 않음', () => {
    const s1 = useInvitationForm.getState()
    s1.validate()
    expect(useInvitationForm.getState().errors.has('groomName')).toBe(true)
    s1.setField('groomName', '')
    expect(useInvitationForm.getState().errors.has('groomName')).toBe(true)
  })
})

describe('useInvitationForm — updateAccountSlot', () => {
  it('groom 슬롯의 enabled 토글', () => {
    useInvitationForm.getState().updateAccountSlot('groom', 0, 'enabled', true)
    expect(useInvitationForm.getState().groomAccounts[0].enabled).toBe(true)
    // 다른 슬롯은 그대로
    expect(useInvitationForm.getState().groomAccounts[1].enabled).toBe(false)
  })

  it('bride 슬롯의 name 갱신', () => {
    useInvitationForm.getState().updateAccountSlot('bride', 1, 'name', '아버지')
    expect(useInvitationForm.getState().brideAccounts[1].name).toBe('아버지')
  })
})

describe('useInvitationForm — gallery photos', () => {
  it('addGalleryPhoto: URL을 배열 끝에 추가', () => {
    const { addGalleryPhoto } = useInvitationForm.getState()
    addGalleryPhoto('https://a/1.jpg')
    addGalleryPhoto('https://a/2.jpg')
    expect(useInvitationForm.getState().galleryPhotos).toEqual([
      'https://a/1.jpg',
      'https://a/2.jpg',
    ])
  })

  it('removeGalleryPhoto: index 위치 제거', () => {
    const s = useInvitationForm.getState()
    s.addGalleryPhoto('a')
    s.addGalleryPhoto('b')
    s.addGalleryPhoto('c')
    s.removeGalleryPhoto(1)
    expect(useInvitationForm.getState().galleryPhotos).toEqual(['a', 'c'])
  })

  it('reorderGalleryPhoto: 항목 이동', () => {
    const s = useInvitationForm.getState()
    s.addGalleryPhoto('a')
    s.addGalleryPhoto('b')
    s.addGalleryPhoto('c')
    s.reorderGalleryPhoto(0, 2)
    expect(useInvitationForm.getState().galleryPhotos).toEqual(['b', 'c', 'a'])
  })

  it('setGalleryPhotoPosition: URL → 위치 객체 저장', () => {
    useInvitationForm.getState().setGalleryPhotoPosition('https://a/x.jpg', {
      cropArea: { x: 0, y: 0, width: 1, height: 1 },
      zoom: 1.5,
      editorCrop: { x: 2, y: 3 },
    })
    const stored = useInvitationForm.getState().galleryPhotoPositions['https://a/x.jpg']
    expect(stored?.zoom).toBe(1.5)
    expect(stored?.editorCrop).toEqual({ x: 2, y: 3 })
  })
})

describe('useInvitationForm — validate', () => {
  it('모든 필수 필드 비어있음 → errors 전부 채워지고 첫 누락 라벨 반환', () => {
    const first = useInvitationForm.getState().validate()
    expect(first).toBe('신랑 이름')
    expect(useInvitationForm.getState().errors.has('groomName')).toBe(true)
    expect(useInvitationForm.getState().errors.has('brideName')).toBe(true)
    expect(useInvitationForm.getState().errors.has('date')).toBe(true)
    expect(useInvitationForm.getState().errors.has('time')).toBe(true)
    expect(useInvitationForm.getState().errors.has('venueName')).toBe(true)
    expect(useInvitationForm.getState().errors.has('venueAddress')).toBe(true)
  })

  it('필수 필드 모두 채움 → null 반환, errors 비움', () => {
    const s = useInvitationForm.getState()
    s.setField('groomName', '신랑')
    s.setField('brideName', '신부')
    s.setField('date', '2026-06-01')
    s.setField('time', '12:00')
    s.setField('venueName', '예식장')
    s.setField('venueAddress', '서울 어디 1번지')
    expect(useInvitationForm.getState().validate()).toBeNull()
    expect(useInvitationForm.getState().errors.size).toBe(0)
  })
})

describe('useInvitationForm — reset / clearErrors', () => {
  it('clearErrors: errors만 비우고 다른 값은 유지', () => {
    const s = useInvitationForm.getState()
    s.setField('groomName', '홍길동')
    s.validate()
    s.clearErrors()
    expect(useInvitationForm.getState().errors.size).toBe(0)
    expect(useInvitationForm.getState().groomName).toBe('홍길동')
  })

  it('reset: 모든 필드 초기 상태 + errors 비움', () => {
    const s = useInvitationForm.getState()
    s.setField('groomName', '홍길동')
    s.addGalleryPhoto('a')
    s.reset()
    const after = useInvitationForm.getState()
    expect(after.groomName).toBe('')
    expect(after.galleryPhotos).toEqual([])
    expect(after.errors.size).toBe(0)
  })
})

describe('toCreateWeddingRequest', () => {
  it('userId 없이 변환: info/hosts/slug 구조', () => {
    const s = useInvitationForm.getState()
    s.setField('groomName', '신랑')
    s.setField('brideName', '신부')
    s.setField('date', '2026-06-01')
    s.setField('time', '12:00')
    s.setField('venueName', '예식장')
    s.setField('venueAddress', '서울')
    s.setField('slug', 'my-wed')
    const req = toCreateWeddingRequest(useInvitationForm.getState())
    expect(req.info.groom_name).toBe('신랑')
    expect(req.info.bride_name).toBe('신부')
    expect(req.info.date).toBe('2026-06-01')
    expect(req.hosts).toEqual({})
    expect(req.slug).toBe('my-wed')
  })

  it('userId 주어지면 myRole=groom → host_groom_id 슬롯에 매핑', () => {
    const s = useInvitationForm.getState()
    s.setField('myRole', 'groom')
    const req = toCreateWeddingRequest(useInvitationForm.getState(), 'user-1')
    expect(req.hosts.host_groom_id).toBe('user-1')
    expect(req.hosts.host_bride_id).toBeUndefined()
  })

  it('myRole=bride + userId → host_bride_id 슬롯', () => {
    const s = useInvitationForm.getState()
    s.setField('myRole', 'bride')
    const req = toCreateWeddingRequest(useInvitationForm.getState(), 'user-2')
    expect(req.hosts.host_bride_id).toBe('user-2')
    expect(req.hosts.host_groom_id).toBeUndefined()
  })

  it('계좌 enabled=true인 슬롯만 info의 account 필드에 들어감', () => {
    const s = useInvitationForm.getState()
    s.updateAccountSlot('groom', 0, 'enabled', true)
    s.updateAccountSlot('groom', 0, 'bank', '국민은행')
    s.updateAccountSlot('groom', 0, 'number', '111')
    // 1, 2번 슬롯은 비활성
    const req = toCreateWeddingRequest(useInvitationForm.getState())
    expect(req.info.groom_account).toEqual({ bank: '국민은행', address: '111' })
    expect(req.info.groom_father_account).toBeUndefined()
    expect(req.info.groom_mother_account).toBeUndefined()
  })
})

describe('toUpdateInvitationRequest', () => {
  it('빈 필드들은 undefined로, coverTextConfig는 그대로 전달', () => {
    const req = toUpdateInvitationRequest(useInvitationForm.getState())
    expect(req.design_template_id).toBeUndefined()
    expect(req.custom_message).toBeUndefined()
    expect(req.gallery_photos).toBeUndefined()
    expect(req.cover_image).toBeUndefined()
    expect(req.cover_text_config).toBeDefined()
  })

  it('갤러리/커버 채워지면 그대로 노출', () => {
    const s = useInvitationForm.getState()
    s.setField('coverImage', 'https://a/cover.jpg')
    s.addGalleryPhoto('https://a/1.jpg')
    s.setField('customMessage', 'hello')
    const req = toUpdateInvitationRequest(useInvitationForm.getState())
    expect(req.cover_image).toBe('https://a/cover.jpg')
    expect(req.gallery_photos).toEqual(['https://a/1.jpg'])
    expect(req.custom_message).toBe('hello')
  })
})

describe('toPreviewData', () => {
  it('빈 store: 기본값 fallback (신랑/신부/예식장/주소 등)', () => {
    const data = toPreviewData(useInvitationForm.getState())
    expect(data.groomName).toBe('신랑')
    expect(data.brideName).toBe('신부')
    expect(data.venue.name).toBe('예식장')
    expect(data.venue.address).toBe('주소를 입력하세요')
    expect(data.greetingMessage).toBe(DEFAULT_GREETING)
  })

  it('store에 값 있음: 그 값 그대로 사용 + customMessage 우선', () => {
    const s = useInvitationForm.getState()
    s.setField('groomName', '실제 신랑')
    s.setField('venueName', '실제 장소')
    s.setField('customMessage', '안녕하세요')
    const data = toPreviewData(useInvitationForm.getState())
    expect(data.groomName).toBe('실제 신랑')
    expect(data.venue.name).toBe('실제 장소')
    expect(data.greetingMessage).toBe('안녕하세요')
  })
})
