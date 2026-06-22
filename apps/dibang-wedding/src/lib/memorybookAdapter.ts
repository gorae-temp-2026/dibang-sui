/**
 * memorybookAdapter
 *
 * v3 contract MemoryBookData (snake_case, storage_path 기반) →
 * v2 MemoryBookData (camelCase, 직접 URL 기반) 순수 변환.
 *
 * - 서명 URL 조회는 호출처(useSharedPhotoSignedUrls)에서 담당. 본 모듈은
 *   path → url Map만 받아 동기적으로 shape만 바꾼다.
 * - couple.cover_photo_url, display_photos는 청첩장 public URL이라 그대로 사용.
 */

import type { MemoryBookData as V3MemoryBookData } from '../types/db-compat';
import type { MemoryBookData as V2MemoryBookData } from '../components/memorybook/MemoryBookV2_4Types';

export function formatHHmm(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function toV2MemoryBookData(
  data: V3MemoryBookData,
  signedMap: Record<string, string>,
): V2MemoryBookData {
  const curatedPhotos = data.curated_photos
    .map((p) => ({ id: p.id, url: signedMap[p.storage_path] ?? '', uploadedBy: '' }))
    .filter((p) => p.url);

  // display_photos = 청첩장 gallery URL 배열. id는 index 기반.
  const displayPhotos = (data.display_photos ?? []).map((url, i) => ({
    id: `gallery-${i}`,
    url,
    uploadedBy: '신랑·신부',
  }));

  // 커버 사진: 청첩장 cover_photo_url 우선, fallback curated/display 첫 장
  const coverPhoto =
    data.couple.cover_photo_url ||
    curatedPhotos.find((p) => p.url)?.url ||
    displayPhotos.find((p) => p.url)?.url ||
    '';

  const mecMessages = data.mec_messages.map((m) => ({
    id: m.id,
    guestName: m.guest_name ?? '',
    guestAffiliation: m.relation_label ?? '',
    message: m.message,
    timestamp: formatHHmm(m.created_at),
    isHeartOnly: m.is_heart,
  }));

  return {
    couple: {
      groomName: data.couple.groom_name,
      brideName: data.couple.bride_name,
      weddingDate: data.couple.wedding_date,
      time: data.couple.time ?? undefined,
      venue: data.couple.venue_name,
      coverPhoto,
    },
    mecMessages,
    // GuestPhotoSection은 guestPhotos 풀을 사용. v3에서는 curated_photos가 그 풀.
    guestPhotos: curatedPhotos,
    curatedPhotos,
    displayPhotos,
    stats: {
      totalGuests: data.stats.total_guests,
      totalMessages: data.stats.total_messages,
      photosUploaded: data.stats.photos_uploaded,
    },
  };
}
