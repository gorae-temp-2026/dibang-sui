import { useEffect } from 'react';

/**
 * 마운트 동안 document.body의 특정 스타일 키를 강제 설정하고,
 * 언마운트 시 이전 값으로 복원하는 훅.
 *
 * Page가 전역 body 스타일을 직접 조작하는 패턴을 캡슐화 (UI/데이터 분리 1-D).
 *
 * 사용 예:
 *   useBodyStyleScope({ padding: '0', background: '#080808', alignItems: 'stretch' })
 */
type BodyStyleKey = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | number>;
type StyleMap = Partial<Record<BodyStyleKey, string>>;

export function useBodyStyleScope(styles: StyleMap): void {
  useEffect(() => {
    const body = document.body;
    const prev: StyleMap = {};
    const keys = Object.keys(styles) as BodyStyleKey[];
    for (const k of keys) {
      prev[k] = body.style[k as keyof CSSStyleDeclaration] as string;
      (body.style as unknown as Record<string, string>)[k as string] = styles[k] ?? '';
    }
    return () => {
      for (const k of keys) {
        (body.style as unknown as Record<string, string>)[k as string] = prev[k] ?? '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
