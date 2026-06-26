import { useQuery } from '@tanstack/react-query';
import { getMeOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { useAuth } from '../../providers/AuthContext';
import { useZkLogin } from '../../providers/ZkLoginProvider';

// 로그인 유저 정보 (id, name, email, profile_image_url ...).
// 여러 페이지에서 공유 가능하므로 shared. data-fetching.md 컨벤션.
export function useGetMe() {
  const { session } = useAuth();
  const { isAuthenticated } = useZkLogin();
  return useQuery({
    ...getMeOptions(),
    staleTime: 5 * 60 * 1000,
    enabled: !!(session || isAuthenticated),
  });
}
