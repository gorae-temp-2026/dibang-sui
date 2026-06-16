/**
 * useMemoryBookPreload
 *
 * MemoryBookV2_4 Root의 사이드이펙트 분리(P3-10):
 *   - applyThumbUrls 로 v2 data → URL 변환 (현재 thumbUrl noop, 동등 shape 보존)
 *   - 모든 이미지(URL) preload (new Image(); img.src = u)
 *
 * scrollTo·전역 font·keyframes 주입은 본 훅의 책임이 아니다.
 */

import { useEffect, useMemo } from 'react';
import type { MemoryBookData } from '../../components/memorybook/MemoryBookV2_4Types';

// Supabase Storage image-transform 으로 사진 사이즈 축소.
// v3 dev Supabase는 image transformation endpoint(`/render/image/public/`)가
// 403을 반환한다 (활성화 안 됨). 원본 URL을 그대로 반환해 우회.
// size 인자는 호환을 위해 유지하나 사용하지 않는다.
function thumbUrl(url: string, _size = 800): string {
  void _size;
  return url;
}

function applyThumbUrls(data: MemoryBookData): MemoryBookData {
  if (!data) return data;
  return {
    ...data,
    couple: { ...data.couple, coverPhoto: thumbUrl(data.couple.coverPhoto, 1200) },
    guestPhotos: data.guestPhotos.map((p) => ({ ...p, url: thumbUrl(p.url) })),
    curatedPhotos: data.curatedPhotos.map((p) => ({ ...p, url: thumbUrl(p.url) })),
    displayPhotos: data.displayPhotos.map((p) => ({ ...p, url: thumbUrl(p.url) })),
  };
}

export function useMemoryBookPreload(rawData: MemoryBookData): MemoryBookData {
  const data = useMemo(() => applyThumbUrls(rawData), [rawData]);

  useEffect(() => {
    if (!data) return;
    const urls = new Set<string>();
    if (data.couple.coverPhoto) urls.add(data.couple.coverPhoto);
    data.guestPhotos.forEach((p) => urls.add(p.url));
    data.curatedPhotos.forEach((p) => urls.add(p.url));
    data.displayPhotos.forEach((p) => urls.add(p.url));
    const imgs: HTMLImageElement[] = [];
    urls.forEach((u) => {
      const img = new Image();
      img.src = u;
      imgs.push(img);
    });
    return () => {
      imgs.length = 0;
    };
  }, [data]);

  return data;
}
