// 경량 i18n (공유 패키지용) — ko/en, 기본 en.
// 이 패키지는 dibang-wedding·guest-web 양쪽에서 source 로 소비된다. 두 앱은 각자 zustand persist 스토어
// (key 'dibang:lang')로 언어를 저장한다. 패키지는 별도 스토어를 두되:
//   1) 생성 시 localStorage('dibang:lang')에서 현재 언어를 읽어 초기값을 맞춘다.
//   2) 앱의 setLang 이 발생시키는 window CustomEvent('dibang:lang')를 듣고 실시간 동기화한다.
// (앱 i18n.ts 의 setLang 이 이 이벤트를 dispatch 한다.) 기본 en 이라 미동기 상태여도 한국어가 새지 않는다.
import { create } from 'zustand'

export type Lang = 'ko' | 'en'

function readPersistedLang(): Lang {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('dibang:lang') : null
    if (raw) {
      const v = JSON.parse(raw) as { state?: { lang?: unknown }; version?: unknown }
      // 영문화 전환 이전(version<1)에 저장된 'ko'는 무시하고 영어 기본값을 쓴다(앱 스토어 migrate와 동일 정책).
      if (v?.version === 1) {
        const l = v?.state?.lang
        if (l === 'ko' || l === 'en') return l
      }
    }
  } catch { /* localStorage 접근 불가 시 기본값 */ }
  return 'en'
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}
export const useLangStore = create<LangState>((set) => ({
  lang: readPersistedLang(),
  setLang: (lang) => set({ lang }),
}))

// 앱 setLang → window 이벤트 → 패키지 스토어 동기화 (같은 탭 실시간 반영).
if (typeof window !== 'undefined') {
  window.addEventListener('dibang:lang', (e) => {
    const l = (e as CustomEvent<Lang>).detail
    if (l === 'ko' || l === 'en') useLangStore.setState({ lang: l })
  })
}

type Dict = Record<string, string>

// ── 사전 ── (E9에서 컴포넌트별로 채운다. 키 네이밍: invitationUi.<영역>.<이름>)
const KO: Dict = {
  "invitationUi.canvas.ariaLabel": "청첩장 그림판",
  "invitationUi.ceremony.noticeHeading": "안내드립니다",
  "invitationUi.ceremony.qrFeatures": "간편 축의, 축하 메시지, 사진 공유",
  "invitationUi.ceremony.qrLead": "결혼식장에서 디지털 방명록 QR을 확인하세요.",
  "invitationUi.ceremony.qrLine1": "식장에 준비된 QR을 스캔하고",
  "invitationUi.ceremony.qrLine2": "를 하세요.",
  "invitationUi.ceremony.qrLine3": "예식이 끝나고 신랑 신부에게",
  "invitationUi.ceremony.qrLine4": "으로 전달됩니다.",
  "invitationUi.ceremony.title": "안내 사항",
  "invitationUi.gallery.close": "닫기",
  "invitationUi.gallery.cropPhoto": "사진 자르기",
  "invitationUi.gallery.nextPhoto": "다음 사진",
  "invitationUi.gallery.prevPhoto": "이전 사진",
  "invitationUi.gallery.title": "우리의 순간",
  "invitationUi.gratitude.brideSide": "신부측",
  "invitationUi.gratitude.copy": "복사",
  "invitationUi.gratitude.groomSide": "신랑측",
  "invitationUi.gratitude.kakao": "카카오",
  "invitationUi.gratitude.title": "마음 전하실 곳",
  "invitationUi.gratitude.toss": "토스",
  "invitationUi.guestbook.empty": "아직 남겨진 메시지가 없습니다",
  "invitationUi.guestbook.loadMore": "더보기",
  "invitationUi.guestbook.loading": "불러오는 중...",
  "invitationUi.guestbook.messagePlaceholder": "축하 메시지를 남겨주세요",
  "invitationUi.guestbook.namePlaceholder": "이름",
  "invitationUi.guestbook.submit": "등록",
  "invitationUi.guestbook.submitting": "등록 중...",
  "invitationUi.guestbook.title": "방명록",
  "invitationUi.heart.like": "좋아요",
  "invitationUi.invitation.daughterLineAfter": "",
  "invitationUi.invitation.daughterLineBefore": "",
  "invitationUi.invitation.daughterLineMid": " 의 딸 ",
  "invitationUi.invitation.deceasedPrefix": "故 ",
  "invitationUi.invitation.sonLineAfter": "",
  "invitationUi.invitation.sonLineBefore": "",
  "invitationUi.invitation.sonLineMid": " 의 아들 ",
  "invitationUi.invitation.title": "초대합니다",
  "invitationUi.location.copyAddress": "주소복사",
  "invitationUi.location.kakaoMap": "카카오맵",
  "invitationUi.location.naverMap": "네이버 지도",
  "invitationUi.location.title": "오시는 길",
  "invitationUi.lounge.enter": "입장하기",
  "invitationUi.lounge.previewAlt": "웨딩 라운지 미리보기",
  "invitationUi.mec.msg1": "결혼 축하해요! 행복하세요",
  "invitationUi.mec.msg2": "두 분의 앞날을 축복합니다",
  "invitationUi.mec.msg3": "항상 함께 웃는 가정 되세요",
  "invitationUi.mec.msg4": "사랑 가득한 날 되세요",
  "invitationUi.rsvp.attendNo": "참석이 어려워요",
  "invitationUi.rsvp.attendQuestion": "참석하실 수 있나요?",
  "invitationUi.rsvp.attendYes": "참석할게요",
  "invitationUi.rsvp.close": "닫기",
  "invitationUi.rsvp.companionNo": "없습니다",
  "invitationUi.rsvp.companionQuestion": "추가 동행 인원이 있나요?",
  "invitationUi.rsvp.companionYes": "있습니다",
  "invitationUi.rsvp.eyebrow": "참석 의사 전달하기",
  "invitationUi.rsvp.heading": "참석 의사 체크하기",
  "invitationUi.rsvp.hostQuestion": "어느 분의 하객이신가요?",
  "invitationUi.rsvp.intro1": "한 분 한 분을 소중히 모실 수 있도록",
  "invitationUi.rsvp.intro2": "참석 의사를 전해주시면 감사하겠습니다.",
  "invitationUi.rsvp.mealNo": "아니오",
  "invitationUi.rsvp.mealQuestion": "식사를 하실 예정인가요?",
  "invitationUi.rsvp.mealUndecided": "미정",
  "invitationUi.rsvp.mealYes": "네",
  "invitationUi.rsvp.namePlaceholder": "참석자 본인 성함",
  "invitationUi.rsvp.nameQuestion": "성함이 어떻게 되시나요?",
  "invitationUi.rsvp.peopleUnit": "명",
  "invitationUi.rsvp.phonePlaceholder": "핸드폰 번호 뒤 4자리",
  "invitationUi.rsvp.phoneQuestion": "동명이인 체크를 위한 번호를 알려주세요",
  "invitationUi.rsvp.roleBride": "신부",
  "invitationUi.rsvp.roleBrideFather": "신부 아버지",
  "invitationUi.rsvp.roleBrideMother": "신부 어머니",
  "invitationUi.rsvp.roleGroom": "신랑",
  "invitationUi.rsvp.roleGroomFather": "신랑 아버지",
  "invitationUi.rsvp.roleGroomMother": "신랑 어머니",
  "invitationUi.rsvp.submit": "RSVP 보내기",
  "invitationUi.rsvp.thanks1": "참석 의사를 전달해 주셔서 감사합니다.",
  "invitationUi.rsvp.thanks2": "결혼식 준비에 큰 도움이 됩니다. (선택 사항)",
  "invitationUi.share.kakaoLabel": "카카오톡 공유하기",
  "invitationUi.share.kakaoTitle": "카카오톡 공유",
  "invitationUi.share.linkLabel": "링크 공유하기",
  "invitationUi.share.linkTitle": "링크 복사",
  "invitationUi.toggle.invitation": "청첩장",
  "invitationUi.toggle.lounge": "라운지",
}
const EN: Dict = {
  "invitationUi.canvas.ariaLabel": "Invitation canvas",
  "invitationUi.ceremony.noticeHeading": "A Note for You",
  "invitationUi.ceremony.qrFeatures": "send a gift, leave a message, and share photos",
  "invitationUi.ceremony.qrLead": "Look for the digital guestbook QR code at the wedding venue.",
  "invitationUi.ceremony.qrLine1": "Scan the QR code at the venue to",
  "invitationUi.ceremony.qrLine2": ".",
  "invitationUi.ceremony.qrLine3": "After the ceremony, it is delivered to the couple as a",
  "invitationUi.ceremony.qrLine4": ".",
  "invitationUi.ceremony.title": "Ceremony Notice",
  "invitationUi.gallery.close": "Close",
  "invitationUi.gallery.cropPhoto": "Crop photo",
  "invitationUi.gallery.nextPhoto": "Next photo",
  "invitationUi.gallery.prevPhoto": "Previous photo",
  "invitationUi.gallery.title": "Our Moments",
  "invitationUi.gratitude.brideSide": "Bride's Side",
  "invitationUi.gratitude.copy": "Copy",
  "invitationUi.gratitude.groomSide": "Groom's Side",
  "invitationUi.gratitude.kakao": "Kakao",
  "invitationUi.gratitude.title": "Send Your Heart",
  "invitationUi.gratitude.toss": "Toss",
  "invitationUi.guestbook.empty": "No messages yet",
  "invitationUi.guestbook.loadMore": "Load more",
  "invitationUi.guestbook.loading": "Loading...",
  "invitationUi.guestbook.messagePlaceholder": "Leave a message of congratulations",
  "invitationUi.guestbook.namePlaceholder": "Name",
  "invitationUi.guestbook.submit": "Post",
  "invitationUi.guestbook.submitting": "Posting...",
  "invitationUi.guestbook.title": "Guestbook",
  "invitationUi.heart.like": "Like",
  "invitationUi.invitation.daughterLineAfter": "",
  "invitationUi.invitation.daughterLineBefore": "Daughter of ",
  "invitationUi.invitation.daughterLineMid": " — ",
  "invitationUi.invitation.deceasedPrefix": "The late ",
  "invitationUi.invitation.sonLineAfter": "",
  "invitationUi.invitation.sonLineBefore": "Son of ",
  "invitationUi.invitation.sonLineMid": " — ",
  "invitationUi.invitation.title": "Invitation",
  "invitationUi.location.copyAddress": "Copy Address",
  "invitationUi.location.kakaoMap": "KakaoMap",
  "invitationUi.location.naverMap": "Naver Map",
  "invitationUi.location.title": "Directions",
  "invitationUi.lounge.enter": "Enter",
  "invitationUi.lounge.previewAlt": "Wedding lounge preview",
  "invitationUi.mec.msg1": "Congratulations! Wishing you happiness",
  "invitationUi.mec.msg2": "Blessings on your journey ahead",
  "invitationUi.mec.msg3": "May your home always be full of laughter",
  "invitationUi.mec.msg4": "Have a day full of love",
  "invitationUi.rsvp.attendNo": "I can't make it",
  "invitationUi.rsvp.attendQuestion": "Can you attend?",
  "invitationUi.rsvp.attendYes": "I'll be there",
  "invitationUi.rsvp.close": "Close",
  "invitationUi.rsvp.companionNo": "No",
  "invitationUi.rsvp.companionQuestion": "Are you bringing extra guests?",
  "invitationUi.rsvp.companionYes": "Yes",
  "invitationUi.rsvp.eyebrow": "Let us know if you'll attend",
  "invitationUi.rsvp.heading": "RSVP",
  "invitationUi.rsvp.hostQuestion": "Whose guest are you?",
  "invitationUi.rsvp.intro1": "So we can welcome each guest with care,",
  "invitationUi.rsvp.intro2": "we'd be grateful if you'd let us know whether you can join us.",
  "invitationUi.rsvp.mealNo": "No",
  "invitationUi.rsvp.mealQuestion": "Will you be having a meal?",
  "invitationUi.rsvp.mealUndecided": "Undecided",
  "invitationUi.rsvp.mealYes": "Yes",
  "invitationUi.rsvp.namePlaceholder": "Your name",
  "invitationUi.rsvp.nameQuestion": "What's your name?",
  "invitationUi.rsvp.peopleUnit": "people",
  "invitationUi.rsvp.phonePlaceholder": "Last 4 digits of your phone",
  "invitationUi.rsvp.phoneQuestion": "Share a number so we can tell guests with the same name apart",
  "invitationUi.rsvp.roleBride": "Bride",
  "invitationUi.rsvp.roleBrideFather": "Bride's father",
  "invitationUi.rsvp.roleBrideMother": "Bride's mother",
  "invitationUi.rsvp.roleGroom": "Groom",
  "invitationUi.rsvp.roleGroomFather": "Groom's father",
  "invitationUi.rsvp.roleGroomMother": "Groom's mother",
  "invitationUi.rsvp.submit": "Send RSVP",
  "invitationUi.rsvp.thanks1": "Thank you for letting us know.",
  "invitationUi.rsvp.thanks2": "It's a great help in preparing the wedding. (Optional)",
  "invitationUi.share.kakaoLabel": "Share on KakaoTalk",
  "invitationUi.share.kakaoTitle": "Share on KakaoTalk",
  "invitationUi.share.linkLabel": "Share link",
  "invitationUi.share.linkTitle": "Copy link",
  "invitationUi.toggle.invitation": "Invitation",
  "invitationUi.toggle.lounge": "Lounge",
}

const DICT: Record<Lang, Dict> = { ko: KO, en: EN }

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const hit = DICT[lang]?.[key]
  let s = hit ?? EN[key] ?? KO[key] ?? key
  if (vars) for (const k of Object.keys(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
  return s
}

/** 컴포넌트용 — 언어 변경 시 자동 리렌더. */
export function useT() {
  const lang = useLangStore((s) => s.lang)
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
}
export function useLang() {
  return useLangStore((s) => s.lang)
}
