import { useRef, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { heartInvitationMutation } from '@gorae/contracts/@tanstack/react-query.gen'

// 청첩장 하트 +1. 세션(컴포넌트 인스턴스) 단위로 1회만 서버에 보낸다.
// 정책: 성공하면 잠금, 실패하면 잠금 해제(재시도 가능). 사용자가 새로고침해야 새 세션이 시작.
// 사용자별 중복 방지는 별도 작업으로 미룸.
export function useHeartInvitationOnce(slug: string) {
  const locked = useRef(false)
  const [syncedCount, setSyncedCount] = useState<number | undefined>(undefined)

  const mutation = useMutation({
    ...heartInvitationMutation(),
    onSuccess: (data) => {
      setSyncedCount(data.heart_count)
    },
    onError: () => {
      locked.current = false
    },
  })

  const trigger = useCallback(() => {
    if (locked.current) return
    locked.current = true
    mutation.mutate({ path: { slug } })
  }, [slug, mutation])

  return {
    trigger,
    syncedCount,
    isError: mutation.isError,
  }
}
