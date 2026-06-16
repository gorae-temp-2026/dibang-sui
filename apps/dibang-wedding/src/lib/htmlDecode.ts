/**
 * htmlDecode
 *
 * HTML entity 디코딩 순수 함수. 모듈 레벨 mutable 캐시(_decoder textarea)
 * 사용 금지. DOMParser가 사용 가능하면 그것을, 아니면 일회용 textarea를 매번 만든다.
 *
 * SSR/Node 환경(window 없음)에서는 입력을 그대로 돌려준다.
 */

export function decodeHtml(raw: string): string {
  if (typeof document === 'undefined') return raw;
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    return doc.documentElement.textContent ?? raw;
  }
  const ta = document.createElement('textarea');
  ta.innerHTML = raw;
  return ta.value;
}
