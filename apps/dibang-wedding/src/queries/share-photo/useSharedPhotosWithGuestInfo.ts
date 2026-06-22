/**
 * SharePhotosTab 데이터 합성 훅 (UI/데이터 분리 P3-7).
 *
 * 책임:
 *   1) listSharedPhotos(loungeId)         — 라운지 사진 목록
 *   2) getLounge(loungeId).gather_place   — 라운지의 모임 장소 id
 *   3) listLoungeCheckIns(placeId)         — 입장자(이름·관계) 매핑용
 *   4) listSharedPhotoSignedUrls(paths)   — private 버킷 signed URL 매핑
 *
 * 반환:
 *   { groups, signedUrls, isLoading, error }
 *   groups: [guestUserId, { name, prefix, rows }][]  — 장수 내림차순
 *
 * UI는 위 4가지 호출의 존재 자체를 몰라야 한다. presentational 컴포넌트는
 * 이 훅이 반환한 단순 형태만 소비한다.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getLoungeOptions,
  listLoungeCheckInsOptions,
  listSharedPhotosOptions,
} from '@gorae/contracts/@tanstack/react-query.gen';
import type { SharedPhoto } from '../../types/db-compat';
import { listSharedPhotoSignedUrls } from '../../lib/sharedPhotoUrl';
import { formatGuestPrefix } from '../../lib/guestLabel';

const EMPTY_URLS: Record<string, string> = Object.freeze({}) as Record<string, string>;

export interface GuestPhotoGroup {
  guestUserId: string;
  name: string;
  prefix: string;
  rows: SharedPhoto[];
}

export interface UseSharedPhotosWithGuestInfoResult {
  groups: GuestPhotoGroup[];
  signedUrls: Record<string, string>;
  isLoading: boolean;
  error: Error | null;
}

export function useSharedPhotosWithGuestInfo(
  loungeId: string,
): UseSharedPhotosWithGuestInfoResult {
  // 1) 사진 목록
  const photosQuery = useQuery({
    ...listSharedPhotosOptions({ path: { loungeId } }),
    enabled: !!loungeId,
  });
  const photos: SharedPhoto[] = useMemo(
    () => (photosQuery.data?.data ?? []) as SharedPhoto[],
    [photosQuery.data],
  );

  // 2) 라운지 → gather_place.id
  const loungeQuery = useQuery({
    ...getLoungeOptions({ path: { loungeId } }),
    enabled: !!loungeId,
    staleTime: 5 * 60 * 1000,
  });
  const placeId = loungeQuery.data?.gather_place?.id;

  // 3) 입장자 목록
  const entriesQuery = useQuery({
    ...listLoungeCheckInsOptions({
      path: { placeId: placeId! },
      query: { limit: 100 },
    }),
    enabled: !!placeId,
    staleTime: 30 * 1000,
  });

  // 4) signed URL 매핑 — Supabase storage 호출은 react-query 밖, photos 변경 시점에만.
  //    빈 배열은 effect 진입 자체를 막아 setState 캐스케이드를 피한다.
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [signedUrlError, setSignedUrlError] = useState<Error | null>(null);

  useEffect(() => {
    if (photos.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const paths = photos.map((p) => p.storage_path);
        const urls = await listSharedPhotoSignedUrls(paths);
        if (cancelled) return;
        const map: Record<string, string> = {};
        photos.forEach((p, i) => {
          const u = urls[i];
          if (u) map[p.storage_path] = u;
        });
        setSignedUrls(map);
      } catch (e) {
        if (!cancelled) setSignedUrlError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  // photos가 비면 표시할 URL도 없다. 캐시된 이전 값은 사용처에서 group이 0이므로 무시됨.
  const effectiveSignedUrls = photos.length === 0 ? EMPTY_URLS : signedUrls;

  // 5) 그룹화 (장수 내림차순) + 게스트 정보 머지
  const groups: GuestPhotoGroup[] = useMemo(() => {
    const entries = entriesQuery.data?.data ?? [];
    const infoByUserId: Record<string, { name: string; prefix: string }> = {};
    for (const e of entries) {
      infoByUserId[e.user_id] = {
        name: e.visitor_name,
        prefix: formatGuestPrefix(e.recipient_slot, e.relation_category, e.relation_detail),
      };
    }

    const grouped = new Map<string, SharedPhoto[]>();
    for (const p of photos) {
      const arr = grouped.get(p.guest_user_id) ?? [];
      arr.push(p);
      grouped.set(p.guest_user_id, arr);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([guestUserId, rows]) => {
        const info = infoByUserId[guestUserId];
        return {
          guestUserId,
          name: info?.name ?? `하객 ${guestUserId.slice(0, 8)}…`,
          prefix: info?.prefix ?? '',
          rows,
        };
      });
  }, [photos, entriesQuery.data]);

  const isLoading =
    photosQuery.isLoading ||
    loungeQuery.isLoading ||
    (!!placeId && entriesQuery.isLoading);

  const error =
    (photosQuery.error as Error | null) ??
    (loungeQuery.error as Error | null) ??
    (entriesQuery.error as Error | null) ??
    signedUrlError;

  return { groups, signedUrls: effectiveSignedUrls, isLoading, error };
}
