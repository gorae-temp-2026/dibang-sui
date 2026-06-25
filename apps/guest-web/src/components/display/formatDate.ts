// 레거시 @gorae/shared/lib/formatDate 의 동일 구현. mecdisplay 헤더 날짜 표시 보존.
// 영문화(트랙 E): lang 인자로 언어 분기. en이면 영문 날짜 형식, ko면 기존 한국어 형식.
import type { Lang } from '../../lib/i18n'
import { useLangStore } from '../../lib/i18n'

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatKoreanDate(date: string, time?: string, lang?: Lang): string {
  // 비-React 호출에서 lang 미지정 시 스토어 현재값 사용.
  const l = lang ?? useLangStore.getState().lang
  const d = new Date(`${date}T00:00:00`)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  if (l === 'en') {
    const dayOfWeek = EN_DAYS[d.getDay()]
    let result = `${EN_MONTHS[d.getMonth()]} ${day}, ${year} (${dayOfWeek})`
    if (time) {
      const [h, m] = time.split(':').map(Number)
      const period = h < 12 ? 'AM' : 'PM'
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
      result += m > 0
        ? ` ${displayHour}:${String(m).padStart(2, '0')} ${period}`
        : ` ${displayHour} ${period}`
    }
    return result
  }

  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  let result = `${year}년 ${month}월 ${day}일 ${dayOfWeek}요일`
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    result += ` ${period} ${displayHour}시`
    if (m > 0) result += ` ${m}분`
  }
  return result
}
