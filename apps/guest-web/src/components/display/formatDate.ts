// 레거시 @gorae/shared/lib/formatDate 의 동일 구현. mecdisplay 헤더 날짜 표시 보존.
export function formatKoreanDate(date: string, time?: string): string {
  const d = new Date(`${date}T00:00:00`)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
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
