import { useQuery } from '@tanstack/react-query';
import { getMyLoungeCheckIn } from '@gorae/contracts/sdk.gen';

/**
 * 로그인 유저의 LoungeCheckIn 존재 여부 확인.
 * - 200: 기존 entry 반환
 * - 404: null 반환 (entry 없음 — "아직 입장한 적 없음")
 * - 그 외: throw (page에서 error 처리)
 *
 * page는 query.isSuccess / query.isError 를 watch해서 machine으로 send 한다.
 *
 * 404 판별은 응답 객체의 response.status 로 한다. hey-api 클라이언트는 throwOnError
 * 미지정(false) 시 HTTP 에러를 throw하지 않고 { data, error, response } 를 resolve하며,
 * throwOnError:true 일 때는 응답 '본문'을 throw해 status가 없다 — 이전의 err.response.status
 * 분기는 그래서 절대 매치되지 않아 404가 에러로 새어나갔다(입장 게이트가 막힘, #52).
 */
export function useCheckMyCheckIn(loungeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['lounge-check-in', 'me', loungeId],
    queryFn: async () => {
      const res = await getMyLoungeCheckIn({ path: { loungeId: loungeId! } });
      if (res.response?.status === 404) {
        return null;
      }
      if (res.error || !res.response?.ok) {
        throw res.error ?? new Error('LoungeCheckIn 조회에 실패했습니다.');
      }
      return res.data ?? null;
    },
    enabled: !!loungeId && enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
