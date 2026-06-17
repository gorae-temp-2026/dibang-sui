# 프론트엔드 테스트 컨벤션

프론트엔드 테스트의 디테일. 원칙·매트릭스·E2E·운영 방법론은 `TESTING.md` 참조.

## 도구 스택

| 영역 | 도구 | 출처 |
|------|------|------|
| 단위·통합 러너 | Vitest | `_architecture/tech-stack-map.html` |
| 컴포넌트·hook 렌더링 | `@testing-library/react` | tech-stack-map |
| 네트워크 모킹 | MSW 2.7 | tech-stack-map |
| E2E | Playwright 1.52 | tech-stack-map (TESTING.md § E2E 참조) |

## 파일 위치 — Co-located

테스트 파일은 대상 파일과 같은 폴더에 둔다.

```
src/
├── components/{page}/
│   ├── Button.tsx
│   └── Button.test.tsx
├── hooks/{page}/
│   ├── useCountdown.ts
│   └── useCountdown.test.ts
├── queries/{page}/
│   ├── useGetX.ts
│   └── useGetX.test.ts
└── machines/
    ├── foo.machine.ts
    └── foo.machine.test.ts
```

- E2E는 별개: `apps/guest-web/e2e/*.spec.ts`.
- MSW handlers·server: `apps/guest-web/src/mocks/`.

## TDD 강제 범위 (TESTING.md 결정-4)

| 대상 | 강제 여부 |
|------|----------|
| 비즈니스 hook (`hooks/`·`queries/`) | 강제 |
| xState machine (`*.machine.ts`) | machine 작성 시 강제 |
| 페이지 흐름 (`*Page.tsx` 통합) | 강제 |
| 단순 프레젠테이션 컴포넌트 | 권장 (강제 아님) |
| 유틸리티 함수 | 권장 |

## 레이어별 패턴

### 1. Custom hook 테스트

`renderHook` + `QueryClientProvider` wrapper + MSW.

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetInvitation } from './useGetInvitation';

function wrapper({ children }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('returns invitation data when slug exists', async () => {
  const { result } = renderHook(() => useGetInvitation('test-slug'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toMatchObject({ slug: 'test-slug' });
});
```

- `retry: false`: 테스트에서 빠른 실패. 프로덕션 동작과 분리.
- 네트워크는 MSW handler에서 stub.

### 2. xState v5 machine 테스트

`createActor` API. v5는 v4와 API가 다르다.

```ts
import { createActor } from 'xstate';
import { invitationCreateMachine } from './invitationCreate.machine';

test('transitions to saving on SAVE event', () => {
  const actor = createActor(invitationCreateMachine).start();
  expect(actor.getSnapshot().value).toBe('editing');
  actor.send({ type: 'SAVE' });
  expect(actor.getSnapshot().value).toBe('saving');
});
```

- guard·action을 mock으로 주입: `machine.provide({ actions: {...}, guards: {...} })`.
- context 검증: `actor.getSnapshot().context`.
- async invoke를 테스트할 땐 `setup({ actors: { fetchX: fromPromise(...) } })`로 actor 자체를 주입.

### 3. 컴포넌트 테스트

`render` + accessibility-first query.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('calls onSubmit when form is valid', async () => {
  const onSubmit = vi.fn();
  render(<RsvpForm onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText('이름'), '박태원');
  await userEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(onSubmit).toHaveBeenCalledWith({ name: '박태원' });
});
```

Selector 우선순위 (TESTING.md와 동일): `getByRole` > `getByLabel` > `data-testid` > 텍스트.

### 4. 페이지 흐름 통합 테스트

라우터 + QueryClient + MSW를 한 번에 wrap.

```tsx
function renderPage(ui, { route = '/' } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

- 페이지 진입부터 사용자 액션·서버 응답·UI 업데이트까지 한 번에 검증.
- E2E와 차이: 실제 서버·브라우저 없음. 빠르지만 RLS·실 네트워크 검증 불가.

## MSW 셋업

- 위치: `apps/guest-web/src/mocks/handlers.ts` (단일 소스).
- 페이지별 분리가 필요해지면: `src/mocks/handlers/{page}.ts` + `index.ts`에서 통합 export.
- 브라우저 worker(`mocks/browser.ts`)는 필요해질 때 추가 — 일단 테스트 전용.

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/me', () => HttpResponse.json({ id: 'u1', name: 'Test' })),
];

// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

`src/tests-setup.ts`에서 lifecycle hook 등록:

```ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'`: 정의 안 된 요청을 실패시켜 누락을 빠르게 발견.

## 금지 항목

- `fetch()` / axios 직접 mock — MSW만.
- Implementation detail 테스트 — 내부 state·private 함수 직접 검증 금지. 사용자 관점 행동만.
- Snapshot 테스트 — 의도가 흐려져 검증 가치 낮음.
- `waitForTimeout`, 임의 `setTimeout` — RTL의 `waitFor` / `findBy*` 사용.
- 테스트 간 전역 상태 공유 — 각 테스트는 독립적이어야 함.
- 컴포넌트 내부 함수를 export 해서 테스트 — 사용자 관점 경로로만 검증.

## 실행 명령

| 명령 | 용도 |
|------|------|
| `pnpm test` | watch 모드 |
| `pnpm test:run` | 1회 실행 (CI·검증 게이트) |
| `pnpm test:ui` | Vitest UI (사용자 동의 받고만 — TESTING.md § 운영) |
| `pnpm exec playwright test` | E2E (TESTING.md § E2E 참조) |
