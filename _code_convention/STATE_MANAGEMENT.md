# 상태 관리 컨벤션

## 원칙

페이지 또는 기능 단위에서 2개 이상의 비동기 분기(로딩/에러/재시도 등)가 존재하면 xState machine을 먼저 정의한다. machine 없이 useState로 flow를 관리하는 코드는 작성하지 않는다.

## 역할 분담

| 도구 | 담당 | 예시 |
|------|------|------|
| **xState** | 페이지/기능의 flow 제어 (어떤 상태에서 뭐가 가능한지) | idle → validating → saving → success/error |
| **zustand** | 폼 데이터 보관 (값 자체) | groomName, brideName, accounts[] |
| **TanStack Query** | 서버 상태 캐시 + fetch lifecycle | getInvitation, getMyWeddings |

- xState: "지금 저장 가능한 상태인가?"를 판단
- zustand: "저장할 데이터가 뭔가?"를 보관
- TanStack Query: "서버에 보내고 응답 받기"를 처리

## xState 도입 기준

**도입한다:**
- "이 상태에서 이 액션이 불가능해야 한다"는 제약이 있을 때
- 에러/재시도/분기가 2개 이상 존재할 때
- 병렬로 진행되는 비동기 작업이 서로 영향을 줄 때
- 페이지 진입부터 이탈까지의 lifecycle이 명확할 때

**도입하지 않는다:**
- 단순 UI 토글 (isOpen, mobileTab) → useState
- 서버 데이터 fetch 자체 → TanStack Query가 이미 상태 머신
- 폼 필드 값 보관 → zustand
- 한 번의 API 호출 후 결과 표시만 하는 경우

## 폴더 구조

```
src/
├── machines/
│   ├── {feature}.machine.ts       ← machine config (states, events, guards, actions)
│   ├── {feature}.types.ts         ← context/event 타입 (machine 파일이 커질 때 분리)
│   └── ...
├── pages/
│   └── {PageName}Page.tsx         ← useActor(machine)로 연결
└── ...
```

## 파일 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| machine config | camelCase.machine.ts | `invitationCreate.machine.ts` |
| machine 타입 | camelCase.types.ts | `invitationCreate.types.ts` |
| machine 폴더 | machines/ (앱 src 하위) | `apps/dibang-wedding/src/machines/` |

## machine 작성 규칙

1. **setup() 패턴 사용**: xState v5의 `setup()` → `.createMachine()` 패턴을 따른다.
2. **타입 안전**: context, events는 TypeScript 타입으로 정의한다.
3. **guard/action 분리**: inline 로직 대신 named guard/action으로 선언한다.
4. **서비스 호출**: TanStack Query mutation을 actor(invoke)로 연결하되, machine이 직접 fetch하지 않는다. 컴포넌트에서 send → machine이 상태 전환 → 컴포넌트가 Query 호출 → 결과를 send로 돌려줌.
5. **시각화 가능**: Stately Inspector 또는 xState visualizer로 열었을 때 의미 있는 state/event 이름을 사용한다.

## 컴포넌트 연결 패턴

```typescript
// Page.tsx
import { useMachine } from '@xstate/react';
import { invitationCreateMachine } from '../machines/invitationCreate.machine';

export function InvitationCreatePage() {
  const [state, send] = useMachine(invitationCreateMachine);

  // state.matches('editing') → 편집 UI
  // state.matches('saving') → 로딩 표시 + 버튼 비활성화
  // send({ type: 'SAVE' }) → 저장 시도
}
```

## zustand과의 연동

폼 데이터는 zustand store에 유지하고, machine의 context에는 flow 제어에 필요한 메타 정보만 둔다:

```typescript
// machine context (flow 메타)
context: {
  validationErrors: string[];
  saveAttempts: number;
  isDirty: boolean;
}

// zustand store (폼 값)
// groomName, brideName, date, venue, accounts...
```

machine이 'saving' 상태에 진입하면 컴포넌트가 zustand에서 값을 꺼내 API를 호출하고, 결과를 machine에 send한다.
