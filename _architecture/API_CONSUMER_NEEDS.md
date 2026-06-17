# 소비자별 API 필요 목록

> 앱 경계: Guest Web = 비로그인 퍼널 입구, Dibang Wedding = 서비스 본체 (APP_SCOPE.md 참조)
> 접근 정책: public / authenticated / owner / host (API_CONVENTIONS.md §2 참조)

## Guest Web (비로그인 퍼널 입구)

Guest Web에서 호출하는 API는 전부 public이며, 로그인 없이 동작한다.

| Use Case | 접근 정책 | 읽기/쓰기 | 설명 |
|----------|-----------|-----------|------|
| 청첩장 보기 | public | Read | 공유 링크(slug)로 접근. visited_count 증가 |
| 청첩장 하트 | public | Write | heart_count 증가 |
| 방명록 조회 | public | Read | 라운지 방명록 목록 |
| 방명록 작성 | public | Write | guest_name + message. guest_id 없음 (비로그인) |

이 외의 행위(라운지 입장, 모이 조회, 이음 등)를 시도하면 Dibang Wedding으로 리다이렉트.

## Dibang Wedding (메인 앱, 로그인 필수 — Host + Guest)

### Host 전용

| Use Case | 접근 정책 | 읽기/쓰기 | 설명 |
|----------|-----------|-----------|------|
| 결혼식 만들기 | authenticated | Write | Wedding + Lounge + GatherPlace + Invitation 복합 생성 |
| 내 결혼식 목록 | owner | Read | 내가 Host인 결혼식 목록 |
| 결혼식 상세 조회 | authenticated | Read | WeddingInfo + 하위 리소스 ID |
| 결혼식 정보 수정 | host | Write | WeddingInfo 필드 수정 |
| 청첩장 수정 | host | Write | 디자인, 메시지, 갤러리, 커버 |
| 청첩장 공유 링크 | host | Read | slug 조회/생성 |
| 공지 발행 | host | Write | 라운지 공지사항 생성 |
| 공지 수정 | host | Write | 기존 공지 수정 |
| 인테리어 아이템 추가 | host | Write | 새 아이템 생성 |
| 인테리어 배치 | host | Write | position 설정 |
| 인테리어 배치 해제 | host | Write | position 제거 |

### Guest 전용 (로그인 상태)

| Use Case | 접근 정책 | 읽기/쓰기 | 설명 |
|----------|-----------|-----------|------|
| 라운지 입장 | authenticated | Write | LoungeCheckIn 생성 (QR 스캔 또는 링크 접속 후) |
| 방명록 작성 (로그인) | public | Write | guest_name + message + guest_id (로그인 상태) |

### 공통 (Host + Guest)

| Use Case | 접근 정책 | 읽기/쓰기 | 설명 |
|----------|-----------|-----------|------|
| 내 정보 조회 | owner | Read | JWT에서 user_id → 프로필 반환 |
| 프로필 수정 | owner | Write | name, phone, profile_image_url |
| 다른 사용자 조회 | authenticated | Read | 공개 프로필 (이름, 사진) |
| 라운지 정보 조회 | authenticated | Read | 라운지 + MoiGatherPlace |
| 방명록 조회 | public | Read | 라운지 방명록 목록 |
| 공지 목록 조회 | public | Read | 라운지 공지 목록 |
| GatherPlace 조회 | public | Read | 인테리어 + 방문 모이 렌더링 |
| 방문 모이 목록 | public | Read | 장소의 LoungeCheckIn 목록 |
| 인테리어 아이템 목록 | public | Read | 배치/미배치 아이템 |
| 특정 모이 조회 | public | Read | 다른 사람 모이 (라운지 내) |
| 내 모이 조회 | owner | Read | equipped_items 포함 |
| 모이 아이템 목록 | owner | Read | 내 아이템 전체 |
| 아이템 장착 | owner | Write | 슬롯에 장착 |
| 아이템 해제 | owner | Write | 슬롯에서 해제 |
| 아이템 선물 | owner | Write | 대상 moi에게 전달 |
| 이음 목록 | owner | Read | 내 이음(양방향) |
| 이음 생성 | authenticated | Write | to_user + type + label |
| 이음 삭제 | owner | Write | 이음 제거 |
