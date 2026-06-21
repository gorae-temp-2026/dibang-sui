// 데모용 경량 i18n — ko/en, 기본 ko. 적용 범위 = 하단 네비 + 디방인연 + Setting(데모 핵심).
// 세계관 어휘 동결: 영어에선 로마자(inyeon·ieum·moi·yone). zustand persist로 언어 유지.
// 무거운 i18next 대신 사전+훅(데모 스코프 한정). 키 없으면 ko 폴백 → 원문.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'ko' | 'en'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}
export const useLangStore = create<LangState>()(
  persist((set) => ({ lang: 'ko', setLang: (lang) => set({ lang }) }), { name: 'dibang:lang' }),
)

type Dict = Record<string, string>
const KO: Dict = {
  // ── 하단 네비 ──
  'nav.inyeon': '인연',
  'nav.eventList': '이벤트 리스트',
  'nav.myEvent': '나의 이벤트',
  'nav.setting': '설정',
  // ── Setting ──
  'settings.title': '설정',
  'settings.currentLogin': '현재 로그인',
  'settings.language': '언어',
  'settings.myYone': '내 요네',
  'settings.yoneUnit': '요네',
  'settings.charge': '요네 충전',
  'settings.chargeHint': 'Sui로 충전하고 선물·꾸미기에 바로 쓰세요',
  'settings.terms': '약관·동의',
  'settings.marketing': '마케팅 정보 수신 동의',
  'settings.saved': '변경되었습니다',
  'settings.logout': '로그아웃',
  // ── 디방인연 공통 ──
  'inyeon.brand': '디방인연',
  'inyeon.rail.universe': '유니버스',
  'inyeon.rail.received': '받은이음',
  'inyeon.rail.chat': '채팅',
  'inyeon.rail.me': '프로필',
  'inyeon.online': '접속 중',
  'inyeon.offline': '오프라인',
  'inyeon.mutual': '공통 친구 {n}명',
  'inyeon.revealName': '이음하면 이름이 공개돼요',
  'inyeon.pass': '넘기기',
  'inyeon.ieum': '이음 신청',
  'inyeon.viewProfile': '프로필 보기',
  'inyeon.morePhotos': '사진 더보기',
  'inyeon.deckEmptyTitle': '오늘의 인연을 다 봤어요',
  'inyeon.deckEmptyDesc': '잠시 후 새로운 모이들이 다시 모여요. 지금까지 본 모이들을 다시 볼 수도 있어요.',
  'inyeon.deckReset': '처음부터 다시 보기',
  // 관계 거리(티어) — 카드/프로필 공통
  'inyeon.tier.0.label': '함께 참여한 결혼식',
  'inyeon.tier.1.label': '두 다리 건너',
  'inyeon.tier.2.label': '새 인연',
  'inyeon.tier.0.hook': '함께 참여한 결혼식이 있어요',
  'inyeon.tier.1.hook': '두 다리 건너 아는 사이예요',
  'inyeon.tier.2.hook': '아직 마주친 적 없는 새 인연이에요',
}
const EN: Dict = {
  'nav.inyeon': 'Inyeon',
  'nav.eventList': 'Event list',
  'nav.myEvent': 'My event',
  'nav.setting': 'Setting',
  'settings.title': 'Setting',
  'settings.currentLogin': 'Signed in',
  'settings.language': 'Language',
  'settings.myYone': 'My Yone',
  'settings.yoneUnit': 'Yone',
  'settings.charge': 'Charge Yone',
  'settings.chargeHint': 'Top up with Sui and use it right away for gifts and decor',
  'settings.terms': 'Terms & consent',
  'settings.marketing': 'Marketing messages consent',
  'settings.saved': 'Saved',
  'settings.logout': 'Sign out',
  'inyeon.brand': 'dibang inyeon',
  'inyeon.rail.universe': 'Universe',
  'inyeon.rail.received': 'Received',
  'inyeon.rail.chat': 'Chat',
  'inyeon.rail.me': 'Profile',
  'inyeon.online': 'Online',
  'inyeon.offline': 'Offline',
  'inyeon.mutual': '{n} mutual',
  'inyeon.revealName': 'Names are shared once you ieum',
  'inyeon.pass': 'Pass',
  'inyeon.ieum': 'Ieum',
  'inyeon.viewProfile': 'View profile',
  'inyeon.morePhotos': 'More photos',
  'inyeon.deckEmptyTitle': "You've seen everyone for now",
  'inyeon.deckEmptyDesc': 'New moi will gather again soon. You can also look back through the ones you’ve seen.',
  'inyeon.deckReset': 'Start over',
  'inyeon.tier.0.label': 'Same wedding',
  'inyeon.tier.1.label': 'Friend of a friend',
  'inyeon.tier.2.label': 'New connection',
  'inyeon.tier.0.hook': 'You were at the same wedding',
  'inyeon.tier.1.hook': 'Connected through a mutual',
  'inyeon.tier.2.hook': 'A new connection you haven’t met yet',
}
const DICT: Record<Lang, Dict> = { ko: KO, en: EN }

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICT[lang]?.[key] ?? KO[key] ?? key
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
