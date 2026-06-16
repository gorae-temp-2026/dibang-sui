/**
 * useSharedPhotoSignedUrls
 *
 * v3_shared_photos.storage_path 배열을 Supabase signed URL Map(path → url)으로
 * 변환해 반환한다. private 버킷(v3-uploads-private)이라 createSignedUrls 필요.
 *
 * 키 직렬화: paths.join('|')로 캐시 key 안정화. 빈 배열 → 빈 Map 즉시 반환.
 * 실패한 항목은 Map에서 제외돼 상위 컴포넌트는 단순히 미표시 처리.
 */

import { useEffect, useMemo, useState } from 'react';
import { listSharedPhotoSignedUrls } from '../../lib/sharedPhotoUrl';

const EMPTY_MAP: Record<string, string> = {};

export function useSharedPhotoSignedUrls(paths: string[]): Record<string, string> {
  const pathsKey = useMemo(() => paths.join('|'), [paths]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>(EMPTY_MAP);

  useEffect(() => {
    const list = pathsKey ? pathsKey.split('|') : [];
    let cancelled = false;
    if (list.length === 0) {
      // paths 가 비면 이전에 채워둔 signedMap 도 비워 동기화. 빈 객체끼리 재호출 방지 위해
      // 기존 Map 이 이미 비어 있으면 동일 참조 유지(setState noop). 이는 단순 리셋이라
      // "외부 시스템 동기화"로 보기 어려워 set-state-in-effect 룰을 disable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSignedMap((prev) => (Object.keys(prev).length === 0 ? prev : EMPTY_MAP));
      return;
    }
    listSharedPhotoSignedUrls(list).then((urls) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      list.forEach((path, i) => {
        const u = urls[i];
        if (u) map[path] = u;
      });
      setSignedMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  return signedMap;
}
