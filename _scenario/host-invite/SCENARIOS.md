# 부모님 초대 플로우 시나리오

## 개요

신랑/신부가 결혼식을 만든 뒤, 양가 부모님을 Host 슬롯에 초대하는 플로우.
부모님은 초대 링크를 통해 로그인 후 수락하면 Host 권한(청첩장 수정 제외)을 갖는다.

## 초대 생성 + 공유

| # | Actor | Screen | Action | Result |
|---|-------|--------|--------|--------|
| S-01 | Host (신랑/신부) | My Wedding 카드 | 빈 부모님 슬롯의 "초대하기" 탭 | 초대 링크 생성, 공유 옵션 표시 |
| S-02 | Host | 공유 팝오버 | 카카오톡 공유 or 링크 복사 | 부모님에게 링크 전달 |

| # | Data Flow | State Change |
|---|-----------|--------------|
| S-01 | POST /weddings/{id}/host-invites {slot} → token | v3_host_invites row 생성 (status: pending) |
| S-02 | 클라이언트 share API or clipboard | 없음 |

| # | Edge Case | Permission |
|---|-----------|------------|
| S-01 | 같은 슬롯에 pending 있으면 → 기존 토큰 재사용 | Host(신랑/신부)만 |
| S-02 | 공유 실패 → 링크 복사 폴백 | Host만 |

## 초대 수락

| # | Actor | Screen | Action | Result |
|---|-------|--------|--------|--------|
| S-03 | 부모님 (비로그인) | /invite/{token} | 초대 링크 클릭 | 결혼식 정보 + 역할 표시 + 로그인 유도 |
| S-04 | 부모님 (로그인 후) | /invite/{token} | "수락하기" 탭 | 슬롯에 할당, My Wedding에 결혼식 추가 |

| # | Data Flow | State Change |
|---|-----------|--------------|
| S-03 | GET /host-invites/{token} → wedding 요약 + slot | 없음 |
| S-04 | POST /host-invites/{token}/accept | host 슬롯에 user_id 할당, status → accepted |

| # | Edge Case | Navigation |
|---|-----------|------------|
| S-03 | 만료 없음. 이미 수락 → "이미 수락된 초대입니다". 취소됨 → "취소된 초대입니다" | 미로그인 → 로그인 페이지 (token 유지) |
| S-04 | 다른 사람이 이미 슬롯 점유 → "이미 다른 분이 수락했습니다". 자기 wedding에 자기 수락 → 차단 | 수락 후 → /my-wedding |

## 부모님 Host 권한

| # | Actor | Screen | Action | Result | Permission |
|---|-------|--------|--------|--------|------------|
| S-05 | 부모님 | My Wedding 탭 | 진입 | 본인이 Host인 결혼식 보임 | Host |
| S-06 | 부모님 | My Wedding 카드 | 라운지, 웨딩리포트 접근 | 라운지 입장, 축의금 확인 가능 | Host 권한. 청첩장 수정만 제외 |

## 슬롯 상태 관리

| # | Actor | Screen | Action | Result | Edge Case |
|---|-------|--------|--------|--------|-----------|
| S-07 | Host (신랑/신부) | My Wedding 카드 | 슬롯 상태 확인 | 빈 상태 → "초대하기" / 대기중 → "대기중" / 수락됨 → 이름 표시 | - |
| S-08 | Host (신랑/신부) | My Wedding 카드 | 초대 취소 | 초대 무효화, 슬롯 비움 | 수락 전만 취소 가능. 수락 후에는 취소 불가 |

| # | Data Flow | State Change |
|---|-----------|--------------|
| S-07 | GET /users/me/weddings에 host 슬롯 상태 포함 | 없음 |
| S-08 | DELETE /host-invites/{inviteId} | status → cancelled |

## 역할 판별 + 권한 분기

| # | Actor | Screen | Action | Result | Permission |
|---|-------|--------|--------|--------|------------|
| S-09 | 모든 Host | My Wedding 탭 | 진입 | 응답에 my_role 필드 포함 (groom/bride/groom_father 등) | authenticated |
| S-10 | 부모님 Host | My Wedding 카드 | 커버 카드 확인 | "수정하기" 버튼 미노출. 공유 버튼은 노출. | Host(부모님) |
| S-11 | 부모님 Host | My Wedding 카드 | "청첩장 추가" 카드 | 미노출. 캐러셀에 기존 청첩장만 보임. | Host(부모님) |
| S-12 | 신랑/신부 Host | My Wedding 카드 | 커버 카드 확인 | "수정하기" 버튼 + 공유 버튼 + 청첩장 추가 모두 노출 | Host(신랑/신부) |

| # | Data Flow | State Change |
|---|-----------|--------------|
| S-09 | GET /users/me/weddings 응답의 WeddingSummary에 my_role: string 추가. 서버가 현재 user_id를 6개 슬롯과 매칭해서 결정 | 없음 |
| S-10 | 프론트에서 my_role이 groom/bride가 아니면 수정하기 숨김 | 없음 |
| S-11 | 프론트에서 my_role이 groom/bride가 아니면 "+" 카드 숨김 | 없음 |
| S-12 | 프론트에서 my_role이 groom/bride이면 전체 노출 | 없음 |

| # | Edge Case |
|---|-----------|
| S-09 | 한 사용자가 여러 슬롯에 있으면 → 가장 높은 권한 슬롯 우선 (groom > bride > 부모) |
| S-10 | 부모님이 URL 직접 입력으로 /invitation/edit 접근 시 → 서버에서 host 권한 체크 + 프론트에서 my_role 체크해서 리다이렉트 |

## DB 스키마 (예상)

```sql
CREATE TABLE v3_host_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id  UUID NOT NULL REFERENCES v3_weddings(id) ON DELETE CASCADE,
    slot        TEXT NOT NULL,  -- groom_father | groom_mother | bride_father | bride_mother
    token       TEXT NOT NULL UNIQUE,
    status      TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | cancelled
    invited_user_id UUID REFERENCES v3_users(id),  -- 수락 후 할당
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ
);
```

## API 엔드포인트 (예상)

| Method | Path | operationId | 접근 | 설명 |
|--------|------|-------------|------|------|
| POST | /weddings/{weddingId}/host-invites | createHostInvite | host(신랑/신부) | 초대 생성 (pending 있으면 재사용) |
| GET | /host-invites/{token} | getHostInvite | public | 초대 정보 조회 |
| POST | /host-invites/{token}/accept | acceptHostInvite | authenticated | 초대 수락 |
| DELETE | /host-invites/{inviteId} | cancelHostInvite | host(신랑/신부) | 초대 취소 (pending만) |

## 결정 사항

- 역할 선택: 신랑/신부만 (6개 → 2개)
- 부모님은 초대 링크로 가입+로그인 후 수락
- 초대 만료 없음
- 같은 슬롯에 pending 있으면 기존 토큰 재사용
- 수락된 초대는 취소 불가
- 부모님 Host 권한: 라운지/웨딩리포트 접근 가능, 청첩장 수정/추가만 불가
- WeddingSummary에 my_role 필드 추가로 프론트 권한 분기
