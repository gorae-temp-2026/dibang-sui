import { useCreateMemory } from '../../queries/lounge-v2/useCreateMemory';
import { useUploadMemoryPhoto } from '../../queries/lounge-v2/useUploadMemoryPhoto';
import { useOnchainMemory } from '../useOnchainMemory';

// 라운지 V2 — 온기 더하기 합성 훅.
// upload(선택) → createMemory 단일 흐름으로 묶어 모달은 onSubmit 콜백만 갖게 함.
// (W03 #3 C6: ComposeModal 에서 upload + mutation + state를 모달 본문이 직접 다루던 패턴 해소)
// 업로드는 presigned memory(lounge 스코프) 경유 — 레거시 POST /uploads 폐기 (STORAGE.md).
// ⚠️ 전환기 dual-write: DB(표시 캐시) 저장 후 사진·글을 Walrus+온체인 memory(SSOT)에도 best-effort 기록.
export function useComposeMemory(loungeId: string) {
  const createMemory = useCreateMemory(loungeId);
  const uploadPhoto = useUploadMemoryPhoto(loungeId);
  const recordOnchainMemory = useOnchainMemory(loungeId);
  const uploadError =
    uploadPhoto.error instanceof Error
      ? uploadPhoto.error.message
      : uploadPhoto.error
        ? '알 수 없는 오류'
        : null;

  // 모달은 (text, file?)만 넘기고 결과/에러는 isUploading·isPosting·*Error 로 표시.
  // 성공/실패에 따른 후속 동작(reset/close)은 호출처(LoungeV2Page)에서 처리.
  async function submit(text: string, file: File | null): Promise<{ ok: boolean }> {
    let photoUrl: string | undefined;
    if (file) {
      try {
        photoUrl = await uploadPhoto.mutateAsync(file);
      } catch {
        return { ok: false }; // 업로드 실패 — uploadError 표시
      }
    }
    try {
      await createMemory.mutateAsync({ text, asAnnounce: false, photoUrl });
      // 온체인 SSOT 기록(best-effort) — 사진·글을 Walrus blobId로 memory에 남긴다. 실패해도 DB 저장은 유지.
      void recordOnchainMemory({ text, file });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  return {
    submit,
    isUploading: uploadPhoto.isPending,
    isPosting: createMemory.isPending,
    uploadError,
    postError: createMemory.isError,
  };
}
