import { getDibangUrl } from '../lib/config';

/**
 * guest-web에서 수집한 하객 정보. dibang 라운지 입장 게이트(LoungeCheckInGate)가
 * 같은 정보를 다시 입력받지 않도록 enter URL 쿼리파라미터로 전달한다.
 * 키 이름은 dibang 측 파싱과 SSOT로 일치시킨다(LoungeCheckInGatePage).
 */
export interface LoungeEnterInfo {
  name?: string;
  recipient_slot?: string;
  relation_category?: string;
  relation_detail?: string;
}

/**
 * Dibang Wedding(본체) 사이트로의 외부 도메인 이동을 전담하는 어댑터 훅.
 *
 * Page가 `window.location.href = ${getDibangUrl()}/...` 식으로 외부 nav를
 * 직접 조립하던 패턴을 캡슐화 (UI/데이터 분리 1-D).
 *
 * react-router로는 다룰 수 없는 외부 도메인 이동이라 어쩔 수 없이
 * window.location 을 쓰지만, env 결합과 url 조립은 본 어댑터 안에만 둔다.
 */
export function useDibangNavigator() {
  return {
    goToLoungeEnter: (loungeId: string, info?: LoungeEnterInfo) => {
      const base = `${getDibangUrl()}/lounge/${loungeId}/enter`;
      if (!info) {
        window.location.href = base;
        return;
      }
      const params = new URLSearchParams();
      if (info.name) params.set('name', info.name);
      if (info.recipient_slot) params.set('recipient_slot', info.recipient_slot);
      if (info.relation_category) params.set('relation_category', info.relation_category);
      if (info.relation_detail) params.set('relation_detail', info.relation_detail);
      const qs = params.toString();
      window.location.href = qs ? `${base}?${qs}` : base;
    },
    goToUrl: (url: string) => {
      window.location.href = url;
    },
  };
}
