/**
 * 인앱 브라우저 감지 및 외부 브라우저 리다이렉트 유틸리티.
 *
 * 카카오톡 등 인앱 브라우저로 공유 링크/QR을 열면 OAuth·결제·클립보드 등이
 * 제약되므로, 가능한 경우 외부 브라우저(크롬/사파리)로 리다이렉트한다.
 *
 * 지원:
 * - Android: intent scheme (Chrome 우선 → 기본 브라우저 폴백)
 * - 카카오톡(iOS/Android): kakaotalk://web/openExternal → 시스템 브라우저
 * - iOS 비카카오 인앱: 강제 리다이렉트 불가 → 차단 안내 페이지
 *
 * 출처: web-mobile-application/packages/shared/lib/inAppBrowser.ts 핵심 로직 이식.
 * 차단 페이지는 이 레포 규칙(이모지 금지·본문 16px·보조 14px)에 맞춰 신규 작성.
 */

type InAppBrowser =
  | 'kakao'
  | 'instagram'
  | 'threads'
  | 'facebook'
  | 'line'
  | 'naver'
  | 'unknown'

type Platform = 'android' | 'ios' | 'unknown'

export interface InAppBrowserInfo {
  isInApp: boolean
  browser: InAppBrowser
  platform: Platform
}

export type RedirectResult = 'normal' | 'redirected' | 'blocked'

/** 무한루프 방지용 쿼리 파라미터 */
const REDIRECT_MARKER = '__externalRedirected'

/** UA 문자열로 인앱 브라우저 감지 */
export function detectInAppBrowser(
  ua: string = navigator.userAgent,
): InAppBrowserInfo {
  const platform: Platform = /Android/i.test(ua)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) &&
          typeof navigator !== 'undefined' &&
          navigator.maxTouchPoints > 1)
      ? 'ios'
      : 'unknown'

  // 각 인앱 브라우저 UA 패턴 (순서 중요: Threads는 Instagram보다 먼저 체크)
  const patterns: [RegExp, InAppBrowser][] = [
    [/KAKAOTALK/i, 'kakao'],
    [/Threads/i, 'threads'],
    [/Instagram/i, 'instagram'],
    [/FBAN|FBAV/i, 'facebook'],
    [/Line\//i, 'line'],
    [/NAVER|NaverCafe|DAUM/i, 'naver'],
  ]

  for (const [pattern, browser] of patterns) {
    if (pattern.test(ua)) {
      return { isInApp: true, browser, platform }
    }
  }

  // Android WebView 범용 감지 (wv 플래그)
  if (platform === 'android' && /; wv\)/i.test(ua)) {
    return { isInApp: true, browser: 'unknown', platform }
  }

  return { isInApp: false, browser: 'unknown', platform }
}

/** 외부 브라우저 리다이렉트 URL 생성. 리다이렉트 불가 시 null 반환 */
export function getExternalBrowserUrl(
  currentUrl: string,
  browser: InAppBrowser,
  platform: Platform,
): string | null {
  // 카카오톡: 플랫폼 무관하게 공식 scheme 지원
  if (browser === 'kakao') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`
  }

  // Android: intent scheme (Chrome 우선, 없으면 기본 브라우저)
  if (platform === 'android') {
    const parsed = new URL(currentUrl)
    const scheme = parsed.protocol.replace(':', '')
    const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`
    return `intent://${intentPath}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`
  }

  // iOS 비카카오: 강제 리다이렉트 불가
  return null
}

/**
 * 외부 브라우저로 리다이렉트 시도.
 * @returns 'normal' 인앱 아님, 'redirected' 리다이렉트 실행, 'blocked' 리다이렉트 불가
 */
export function tryRedirectToExternalBrowser(): RedirectResult {
  const { isInApp, browser, platform } = detectInAppBrowser()
  if (!isInApp) return 'normal'

  // 무한루프 방지: 이미 리다이렉트 시도했으면 차단 페이지로
  const url = new URL(window.location.href)
  if (url.searchParams.has(REDIRECT_MARKER)) {
    return 'blocked'
  }

  // 리다이렉트 시도 마킹
  url.searchParams.set(REDIRECT_MARKER, '1')
  const markedUrl = url.toString()

  const redirectUrl = getExternalBrowserUrl(markedUrl, browser, platform)

  if (redirectUrl) {
    // replace로 히스토리 교체하여 뒤로가기 무한루프 방지
    window.location.replace(redirectUrl)
    return 'redirected'
  }

  return 'blocked'
}

/**
 * 인앱 브라우저 가드와 함께 앱 부트스트랩.
 * - 정상 브라우저 → bootstrapModule 실행
 * - 리다이렉트 성공 → 페이지 이탈 (아무것도 안 함)
 * - 리다이렉트 불가 → 차단 페이지 렌더
 */
export function bootstrapWithInAppGuard(
  bootstrapModule: () => Promise<unknown>,
): void {
  const result = tryRedirectToExternalBrowser()

  if (result === 'normal') {
    bootstrapModule()
  } else if (result === 'blocked') {
    const root = document.getElementById('root')
    if (!root) throw new Error('Root element not found')
    renderBlockedPage(root)
  }
  // 'redirected'면 페이지 이탈 중이므로 아무것도 안 함
}

/**
 * 차단 페이지를 순수 DOM으로 렌더 (React 없이 main.tsx에서 직접 호출).
 * 레포 규칙 준수: 이모지 미사용, 본문 16px·보조 14px 이상.
 */
export function renderBlockedPage(root: HTMLElement): void {
  // 차단 페이지에 표시할 URL에서 리다이렉트 마커 제거
  const cleanUrl = new URL(window.location.href)
  cleanUrl.searchParams.delete(REDIRECT_MARKER)
  const displayUrl = cleanUrl.toString()

  root.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      color: #111827;
      text-align: center;
    ">
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px;">
        브라우저에서 열어주세요
      </h1>
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px; line-height: 1.6;">
        이 페이지는 인앱 브라우저에서 지원되지 않습니다.<br/>
        아래 버튼으로 주소를 복사한 뒤,<br/>
        Safari 또는 Chrome에서 열어주세요.
      </p>
      <button id="__inapp_copy_btn" style="
        padding: 14px 32px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        background: #111827;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      ">
        주소 복사하기
      </button>
      <p id="__inapp_copy_result" style="
        font-size: 14px;
        color: #10b981;
        margin-top: 14px;
        min-height: 20px;
      "></p>
    </div>
  `

  const btn = document.getElementById('__inapp_copy_btn')
  const resultEl = document.getElementById('__inapp_copy_result')

  btn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(displayUrl)
      if (resultEl) resultEl.textContent = '주소가 복사되었습니다'
    } catch {
      // clipboard API 실패 시 fallback
      const textarea = document.createElement('textarea')
      textarea.value = displayUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (resultEl) {
        resultEl.textContent = success
          ? '주소가 복사되었습니다'
          : '복사에 실패했습니다. 주소를 직접 복사해주세요.'
      }
    }
  })
}
