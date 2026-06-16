/**
 * HTML 엔티티 디코딩 순수 유틸.
 *
 * 입력 문자열 내 `&amp;`, `&lt;`, `&#39;` 등의 HTML 엔티티를 원본 문자로 풀어준다.
 * DOMParser를 사용하므로 브라우저 또는 jsdom 환경에서 동작한다.
 *
 * 사용처:
 *   - display 영역에서 서버가 escape하여 내려준 메시지 본문 렌더 직전 디코딩
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(
    `<!doctype html><body>${html}`,
    'text/html',
  )
  return doc.body.textContent ?? ''
}
