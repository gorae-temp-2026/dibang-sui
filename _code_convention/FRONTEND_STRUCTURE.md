# 프론트엔드 폴더 구조 컨벤션

## 원칙

같은 역할의 코드는 같은 타입 폴더에, 같은 페이지의 코드는 같은 페이지명 폴더에 둔다.

- 타입별 분리: components, hooks, queries, types, pages는 각각의 폴더에 둔다.
- 페이지별 분리: 각 타입 폴더 하위에는 페이지명(kebab-case) 폴더를 만들어 해당 페이지 전용 파일을 넣는다.
- 범용 파일: 2개 이상 페이지에서 공유하는 파일은 `shared/` 폴더에 넣는다.

## 폴더 구조

```
src/
├── pages/
│   └── {PageName}Page.tsx
├── components/
│   ├── {page-name}/
│   │   ├── {ComponentName}.tsx
│   │   └── ...
│   └── shared/
│       └── {ComponentName}.tsx
├── hooks/
│   ├── {page-name}/
│   │   └── use{HookName}.ts
│   └── shared/
│       └── use{HookName}.ts
├── queries/
│   ├── {page-name}/
│   │   └── use{Get|Create|Update|Delete}{Resource}.ts
│   └── shared/
│       └── use{Get|Create|Update|Delete}{Resource}.ts
└── types/
    └── {page-name}.ts
```

## 파일 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase.tsx | `Cover.tsx`, `RsvpModal.tsx` |
| hook | camelCase.ts (use 접두사) | `useCountdown.ts` |
| query hook | camelCase.ts (useGet/useCreate/useUpdate/useDelete 접두사) | `useGetInvitation.ts` |
| 유틸리티 | camelCase.ts | `formatDate.ts` |
| 타입 | camelCase.ts | `invitation.ts` |
| 페이지 | PascalCase.tsx (Page 접미사) | `InvitationPage.tsx` |
| 페이지명 폴더 | kebab-case | `invitation/`, `wedding-lounge/` |

## hooks vs queries 구분

| 폴더 | 역할 | 의존성 |
|------|------|--------|
| `hooks/` | 내부 state, UI 로직 | 없음 (순수 React) |
| `queries/` | 서버 데이터 fetching | API 클라이언트, TanStack Query 등 |

GET/POST/PATCH/DELETE 모두 같은 페이지명 폴더에 둔다. 이름 접두사(useGet, useCreate, useUpdate, useDelete)로 구분한다.

## 스타일

Tailwind CSS 4를 사용한다. 컴포넌트 내에서 Tailwind 유틸리티 클래스로 스타일링하며, 별도 CSS 파일을 만들지 않는다. Tailwind로 표현 불가능한 커스텀 애니메이션(@keyframes)은 글로벌 CSS(`app.css`)의 `@theme`에 등록한다.

## 린트 강제

`eslint-plugin-project-structure`로 폴더 구조를 린트 레벨에서 강제한다.

- 규칙 파일: 프로젝트 루트 `folderStructure.mjs`
- `components/`, `hooks/` 하위에 페이지명 폴더 없이 직접 파일 배치 시 lint error
- 적용 범위: monorepo 전체 프론트엔드 앱 (apps/guest-web, apps/dibang-wedding)
- apps/api (Go)는 제외

## 테스트 파일 위치 — Co-located

테스트 파일은 대상 파일과 **같은 폴더**에 둔다.

| 대상 | 테스트 파일 |
|------|------------|
| `components/{page}/Button.tsx` | `components/{page}/Button.test.tsx` |
| `hooks/{page}/useCountdown.ts` | `hooks/{page}/useCountdown.test.ts` |
| `queries/{page}/useGetX.ts` | `queries/{page}/useGetX.test.ts` |
| `machines/foo.machine.ts` | `machines/foo.machine.test.ts` |

E2E 테스트는 별개 — `apps/guest-web/e2e/*.spec.ts` (Playwright).

상세 테스트 컨벤션은 [FRONTEND_TESTING.md](./FRONTEND_TESTING.md) 참조.
