/**
 * 테스트 전용 공용 헬퍼. 컴포넌트·hook 테스트가 React Query를 필요로 할 때 사용.
 *
 * createQueryWrapper(): QueryClient를 retry off / gcTime 0으로 생성하고
 *  QueryClientProvider로 래핑한 컴포넌트를 반환. renderHook의 `wrapper` 인자나
 *  render의 `wrapper`로 그대로 쓰면 됨.
 *
 * **테스트 코드에서만 import한다.** 본 코드에서 참조 금지.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function createQueryWrapper(client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}
