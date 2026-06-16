// GA4 커스텀 이벤트 수집 유틸 (A/B 테스트용).
// index.html에서 gtag.js(G-54NWHZ813P)가 이미 로드되어 window.gtag가 존재한다.
// 직접 window.gtag를 산발 호출하는 대신 이 유틸로 캡슐화한다.
//
// 사이드이펙트 가드:
//  - dev(import.meta.env.PROD === false)에서는 전송하지 않는다(A/B는 prod 데이터만 의미 있음, dev 노이즈 제외).
//  - window.gtag가 없으면(SSR/광고 차단기/로드 전) 조용히 무시한다(에러·플로우 영향 없음).

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: GtagParams) => void;
  }
}

export type ABVariant = 'v1' | 'v2';

export function trackEvent(name: string, params?: GtagParams): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
