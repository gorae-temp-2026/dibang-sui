/**
 * 공유 사진 ZIP 다운로드 서비스 (UI/데이터 분리 3-I).
 *
 * 책임 분리:
 *   - fetchSharedPhotosZipBlob: supabase 세션 토큰 확보 + GET 호출 + blob 응답
 *   - triggerBlobDownload: blob을 임시 <a>로 다운로드 트리거하는 순수 DOM 헬퍼
 *   - downloadSharedPhotosZip: 위 두 함수를 조합한 호환 entry (기존 호출자 시그니처 유지)
 *
 * 실패는 throw로 표면화하며, 호출 측(mutation 훅)이 error state로 노출한다.
 * env 접근은 lib/api-base.ts의 getApiBaseUrl getter로 위임 (module top-level 참조 제거).
 */
import { getSupabaseClient } from './supabase';
import { getApiBaseUrl } from './api-base';

export interface DownloadSharedPhotosZipArgs {
  loungeId: string;
  guestUserId: string;
}

/**
 * supabase 세션 + GET → blob. 데이터 책임만 보유 (DOM 조작 없음).
 */
export async function fetchSharedPhotosZipBlob({
  loungeId,
  guestUserId,
}: DownloadSharedPhotosZipArgs): Promise<Blob> {
  const supabase = getSupabaseClient();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const baseUrl = getApiBaseUrl();

  const res = await fetch(
    `${baseUrl}/lounges/${loungeId}/shared-photos/zip?guest_user_id=${guestUserId}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    throw new Error(`ZIP 다운로드 실패: ${res.status}`);
  }
  return res.blob();
}

/**
 * blob을 임시 <a> 클릭으로 다운로드 트리거 (lib/csv-download · lib/download-canvas와 동급 DOM 헬퍼).
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 호환 entry — 두 함수 조합. 기존 호출자(useDownloadSharedPhotosZip) 시그니처 변경 없음.
 */
export async function downloadSharedPhotosZip(args: DownloadSharedPhotosZipArgs): Promise<void> {
  const blob = await fetchSharedPhotosZipBlob(args);
  triggerBlobDownload(blob, `shared-photos-${args.guestUserId}.zip`);
}
