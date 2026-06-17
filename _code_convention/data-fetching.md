# 데이터 페칭 컨벤션

## 원칙

모든 API 호출은 `@gorae/contracts`에서 자동 생성된 코드를 사용한다. 앱에서 직접 fetch를 작성하지 않는다.

## 자동 생성 구조 (`packages/contracts/src/`)

| 파일 | 역할 | 생성 명령 |
|------|------|-----------|
| `types.gen.ts` | 요청/응답 TS 타입 | `pnpm generate:ts` |
| `sdk.gen.ts` | 타입-세이프 fetch 함수 | `pnpm generate:ts` |
| `zod.gen.ts` | 런타임 검증 스키마 | `pnpm generate:ts` |
| `@tanstack/react-query.gen.ts` | queryOptions, mutationOptions | `pnpm generate:ts` |

`api-contract.yaml` 수정 후 반드시 `pnpm generate:ts`를 실행하여 재생성한다.

## import 패턴

```ts
// 타입
import type { Wedding, CreateWeddingRequest } from '@gorae/contracts';

// React Query options (읽기)
import { getInvitationOptions, getMeOptions } from '@gorae/contracts/@tanstack/react-query.gen';

// React Query mutation (쓰기)
import { createWeddingMutation } from '@gorae/contracts/@tanstack/react-query.gen';

// Zod 스키마 (런타임 검증)
import { zInvitationPublic } from '@gorae/contracts/zod.gen';

// SDK 직접 사용 (React Query 밖에서 필요할 때)
import { getInvitation } from '@gorae/contracts/sdk.gen';
```

## 사용 패턴

### 읽기 (GET)

```ts
import { useQuery } from '@tanstack/react-query';
import { getInvitationOptions } from '@gorae/contracts/@tanstack/react-query.gen';

function useGetInvitation(slug: string) {
  return useQuery(getInvitationOptions({ path: { slug } }));
}
```

### 쓰기 (POST/PATCH/DELETE)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWeddingMutation } from '@gorae/contracts/@tanstack/react-query.gen';

function useCreateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createWeddingMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMyWeddings'] });
    },
  });
}
```

### Zod 검증

API 응답을 신뢰하지 않는 경계(네트워크)에서 Zod로 검증한다.

```ts
import { zInvitationPublic } from '@gorae/contracts/zod.gen';

const validated = zInvitationPublic.parse(response.data);
```

## queries/ 폴더 규칙

`FRONTEND_STRUCTURE.md`에 정의된 대로, 커스텀 query hook은 `src/queries/{page-name}/` 폴더에 둔다.

```
src/queries/
├── invitation/
│   └── useGetInvitation.ts      ← getInvitationOptions를 감싼 커스텀 hook
├── wedding-create/
│   └── useCreateWedding.ts      ← createWeddingMutation + 캐시 무효화 로직
└── shared/
    └── useGetMe.ts              ← 여러 페이지에서 공유
```

## 커스텀 hook을 만드는 경우

generated options를 직접 사용해도 되지만, 다음 경우에는 커스텀 hook으로 감싼다:

- 캐시 무효화 로직 추가 (mutation onSuccess에서 관련 query 갱신)
- 낙관적 업데이트 (onMutate에서 캐시 직접 수정)
- 여러 query 조합 (하나의 hook에서 복수 useQuery 호출)
- 응답 데이터 변환/필터링 (select 옵션)
- Zod 검증 삽입

## 금지 사항

| 금지 | 이유 |
|------|------|
| `fetch()` 직접 호출 | SDK가 타입 안전성 + 인증 헤더 + 에러 처리를 보장 |
| queryKey 직접 정의 | generated key와 충돌하여 캐시 무효화가 깨짐 |
| 타입 수동 선언 | spec 변경 시 drift 발생. generated 타입만 사용 |
| `@gorae/contracts/src/` 파일 직접 수정 | generate 시 덮어써짐 |
