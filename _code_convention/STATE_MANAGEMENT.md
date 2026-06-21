# 상태 관리 컨벤션

## 원칙

**(2026-06 전면 머신화 개정)** 모든 페이지·컴포넌트의 flow(상태 전이)는 xState machine으로 관리한다. `invitationCreate.machine.ts`가 기준 패턴이다. flow를 useState로 관리하는 코드는 작성하지 않는다.

- **db/sui를 건드리는 유저 플로우는 머신이 중심 state**이고, 서버 조회는 TanStack Query로 분리한다(머신은 결과를 받아 flow만 제어).
- **쪼개지지 않는 단순 흐름(상태 1~2개)도 머신으로 표현**한다 — 단일상태 reducer형 머신(events + `context.assign`으로 관리)을 허용한다.
- **목적**: 모든 화면을 Stately / `@xstate` inspect로 시각화해, 새 서비스를 추가할 때 state machine을 설계 기준으로 삼는다.

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

**머신 밖에 두는 것(예외 — 최소화):**
- 다른 상태(flow)와 무관한 순수 UI 표시 토글(`isOpen`/`mobileTab`/`focusedSection`/`animPlayKey` 등 — boolean에 한정하지 않고, flow 전이와 분리된 "표시 전용" 상태) → useState 허용
- 서버 데이터 fetch 자체 → TanStack Query(머신은 그 결과를 받아 flow만 제어)
- 폼 필드 값 보관 → zustand

> ※ (개정 전엔 "한 번의 API 호출 후 결과 표시만 하는 경우"도 머신 제외였으나, **전면 머신화 방침에 따라 이 경우도 단일상태 reducer형 머신으로 표현**한다. flow와 무관한 순수 UI 표시 토글(boolean 한정 아님)만 예외로 남긴다.)

> ※ **병렬 독립 항목 오케스트레이션**(여러 항목이 동시에 서로 다른 단계에 있는 경우 — 예: 파일별 이미지 업로드): 머신 '전체'를 단계 상태(idle/uploading/settling)로 나누지 않는다(항목별 독립성이 깨진다). 대신 **단일 상태 + items[] reducer**로, 진행 상태를 항목(item)별 `status`로 context에 보유하고 머신은 그 컬렉션을 관리하는 오케스트레이터로 둔다. 항목 1건의 내부 파이프라인을 더 펼쳐 시각화하려면 항목별 **서브머신을 actor로 invoke**한다(오케스트레이터+서브머신). 예: `invitationImageUpload.machine`(오케스트레이터) + `uploadItem.machine`(1건 파이프라인).

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
4. **서비스 호출 (두 패턴 허용 — 단 machine 정의가 React Query mutation·캐시 무효화 등 앱/서버 의존성을 직접 호출하는 것은 금지; 이런 의존성은 `input` 콜백으로 주입한다. 순수 헬퍼(업로드·포맷 등) import는 허용. 목적: 시각화·테스트 순수성)**:
   - **(a) 컴포넌트 회신형(기본)**: 컴포넌트가 send → machine 상태 전환 → 컴포넌트가 Query/mutation 호출 → 결과를 send로 회신. (예: `invitationCreate.machine`)
   - **(b) actor invoke형**: 비동기 작업을 `fromPromise`/`fromCallback` actor로 머신 내부에서 invoke한다. 단 **앱/서버 의존성(React Query mutation·캐시 무효화)은 머신 `input`으로 콜백을 주입**받아 actor가 호출한다(머신은 직접 호출 안 함). 순수 헬퍼 import는 허용. (예: `sharePhotoUpload.machine` — register는 `onRegister` 콜백 주입, presignedUpload 헬퍼는 직접 import)
5. **시각화 가능**: Stately Inspector 또는 xState visualizer로 열었을 때 의미 있는 state/event 이름을 사용한다.
6. **설계/시뮬 전용 머신 허용**: 프로덕션 머신(thin)과 별도로, 한 화면의 전체 flow를 한 장에 펼친 "설계/시뮬 SSOT" 머신(예: `invitationCreate.design.machine` + `uploadItem.machine`)을 둘 수 있다. Stately로 보고 시뮬하는 시각화 자산이며 프로덕션 미연결은 의도다(죽은코드 아님). 첫 줄 주석에 `[설계/시뮬 전용 — 프로덕션 미연결]`을 명시한다.

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
