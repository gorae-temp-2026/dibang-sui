// Daum Postcode 외부 스크립트(window.daum) 래퍼.
// 공식 타입 패키지가 없어 인라인 타입으로 선언한다.

export interface PostcodePickResult {
  roadAddress?: string;
  jibunAddress?: string;
}

interface DaumPostcodeWindow extends Window {
  daum?: {
    Postcode: new (opts: {
      oncomplete: (data: PostcodePickResult) => void;
    }) => { open: () => void };
  };
}

export function openDaumPostcode(onPick: (result: PostcodePickResult) => void): void {
  const daum = (window as unknown as DaumPostcodeWindow).daum;
  if (!daum?.Postcode) {
    throw new Error('Daum Postcode script not loaded');
  }
  new daum.Postcode({
    oncomplete: (data) => onPick(data),
  }).open();
}
