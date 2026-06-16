// 네이버·카카오 지도 deep link URL 빌더.
// UI/데이터 분리 라운드 3 A1-2: packages/invitation-ui/Location.tsx에서 분리.
// 컴포넌트는 빌더 호출 결과를 받아 콜백으로 실 nav (window.location.href·window.open)에 위임.
//
// 모바일은 앱 스킴(nmap:// / kakaomap://)을 먼저 시도하고 500ms 후 웹 fallback.
// 데스크톱은 웹 fallback만.

export type MapType = 'naver' | 'kakao';

export interface MapLink {
  /** 모바일 앱 스킴 URL. 데스크톱에선 undefined. */
  appScheme: string | undefined;
  /** 웹 fallback URL (모든 환경). */
  webUrl: string;
}

export function buildMapLink(type: MapType, address: string, isMobile: boolean): MapLink {
  const encoded = encodeURIComponent(address);
  if (type === 'naver') {
    return {
      appScheme: isMobile ? `nmap://search?query=${encoded}` : undefined,
      webUrl: `https://map.naver.com/v5/search/${encoded}`,
    };
  }
  return {
    appScheme: isMobile ? `kakaomap://search?q=${encoded}` : undefined,
    webUrl: `https://map.kakao.com/link/search/${encoded}`,
  };
}

/** 모바일 판정 (navigator.userAgent 기반). 호출 측에서 한 번만 평가. */
export function detectMobile(userAgent: string): boolean {
  return /Android|iPhone|iPad/i.test(userAgent);
}
