import { useMutation } from '@tanstack/react-query';
import { recordGuestbookMessageView } from '@gorae/contracts/sdk.gen';

// 라운지 V2 — guestbook_message 1회 조회 기록 mutation 래퍼.
// 본인(작성자) 제외는 서버가 판정(FEED-3). 단순 fire-and-forget 용도라
// onSuccess invalidate 없음 (조회수는 클라가 직접 fetch 트리거하지 않음).
// 컴포넌트는 이 훅만 호출, SDK 직접 의존 제거(W03 #4 C3).
export function useRecordGuestbookMessageView() {
  return useMutation({
    mutationFn: (messageId: string) =>
      recordGuestbookMessageView({ path: { messageId }, throwOnError: true }),
  });
}
