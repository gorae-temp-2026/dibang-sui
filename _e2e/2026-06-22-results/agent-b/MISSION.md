# Agent B 미션 — Moi · Gift · Guestbook · EdgeBalance · 쿼리

> 이 파일을 읽고 E2E 테스트를 실행하세요.

## 역할

너는 E2E 테스트 **Agent B**. 시나리오 B-1 ~ B-8을 실행한다.

## 필독 파일 (순서대로)

1. `_e2e/2026-06-22-results/E2E_RULES.md` — 실행 규칙, 환경 정보, 결과 기록 방식
2. `_e2e/2026-06-22.md` — 전체 시나리오. **에이전트 B 섹션만** 실행

## 시나리오 범위

- **B-1**: Moi 아바타 생성 (create_moi)
- **B-2**: MoiItem 구매 (purchase_item, Payment Kit 결제)
- **B-3**: 아이템 장착 (equip_item)
- **B-4**: 아이템 해제 (unequip_item)
- **B-5**: Gift 선물 (gift — MoiItem 이전 + GIFT 신호)
- **B-6**: 방명록 (guestbook::write)
- **B-7**: EdgeBalance (create_edge + record — 2층 fold + 3층 전파)
- **B-8**: 온체인 쿼리 검증 (discoverUsers 등)

## 지갑 구성

지갑 3개 생성 + 각각 0.1 SUI 펀딩:
- **User**: Moi 소유자 / giver / 방명록 작성자
- **Recipient**: 선물 수령자
- **Guest**: 추가 하객 (교차 검증용)

자금 지갑: `packages/sui-sdk/scripts/.shop-admin-key`

## 사전 셋업 (B-5, B-6, B-7 전에 필요)

B-5(Gift)와 B-6(Guestbook)은 Participation이 필요하므로:
1. User가 결혼식 생성 (create_wedding) → Wedding + Event + Cap 획득
2. User가 Vault 생성 (create_vault)
3. Guest가 이벤트에 GUEST로 참가 (participate) → Participation 획득
4. User의 HOST Participation도 확인

## 실행 방법

```bash
# SDK 스크립트 실행
cd packages/sui-sdk
pnpm tsx scripts/your-test-script.ts
```

또는 Node REPL에서 SDK 함수를 직접 호출해도 됨.

## 결과 기록

- 이 폴더(`_e2e/2026-06-22-results/agent-b/`)에 기록
- `results.jsonl`: 시나리오별 결과 (한 줄 JSON)
- 스크린샷: `{시나리오ID}_{설명}.png`
- 이슈: `issues.md`
- 완료 시: `SUMMARY.md`

## Playwright

스크린샷은 Playwright MCP로. 각 섹션 완료 시 Sui Explorer에서 트랜잭션 확인 스크린샷.

## 시작

이 파일을 다 읽었으면 바로 시작. 시나리오를 B-1부터 순서대로 실행.
