import { getSupabaseClient } from './supabase';

// 청사진(faea79e) 2분리: share 카테고리는 v3-uploads-private 버킷.
const SHARED_BUCKET = 'v3-uploads-private';
const DEFAULT_TTL_SECONDS = 3600;

/**
 * shared_photos.storage_path 배열을 Supabase signed URL 배열로 변환.
 * 버킷은 private이라 직접 public URL을 만들 수 없으므로 createSignedUrls 사용.
 * 실패한 항목은 undefined로 채워 입력 순서·길이를 보존한다.
 */
export async function listSharedPhotoSignedUrls(
  storagePaths: string[],
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<Array<string | undefined>> {
  if (storagePaths.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .storage
    .from(SHARED_BUCKET)
    .createSignedUrls(storagePaths, ttlSeconds);
  if (error || !data) return storagePaths.map(() => undefined);
  return data.map((item) => item.signedUrl ?? undefined);
}
