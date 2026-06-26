# 100명 시뮬레이션 지갑 정보

> 비밀키는 `.sim-100-result.json`(gitignore)에만 보관. 이 문서는 주소만 포함.

## 배포 정보

- **패키지 ID**: `0x39ba6062335f2c8083577f07651b4da678d677ecdc26fe88ee38695a60caa66b`
- **TrustRegistry**: `0x20ff0c7f1bfd4812fc74bfafba49cb56b4e43404541fd44645ff8dbcb050a823`
- **EM Matrix**: `0x61000a070d0da5f2c4af60a761e39372c27e5246700ea7791b3874c06effb4d2`
- **CS Matrix**: `0xfa2466a926b8346e6f1fdcd143e2709020b0ad306d08df84d825d40e325e5328`
- **ShopRegistry**: `0x06cd52b59efdc3e0c4807204be0b3d449842dc591c57cf2cb6704a2b8c4d482c`

## 사용자 지갑

- **박태원 (zkLogin)**: `0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb`

## 대리 지갑

- **신솔현**: `0xd53a41a8e0e62a28113eaf7f1b89b0d2b2db3ccd5bc6e9c33a5c60edd42b1b80` — zkLogin 대리 역할 수행

## 시뮬레이션 결과

- 96개 결혼식 생성
- 100명 Moi 생성
- 198개 SignalEmitted (BUSU 54 + CS 144)
- 226개 Participated
- 65개 고유 주소 (그래프 노드)

## 지갑 목록 (비밀키 제외)

전체 목록은 `packages/sui-sdk/scripts/.sim-100-result.json`의 wallets 필드 참조.
주소만 필요하면 `_check-sim-balances.ts` 스크립트로 확인.

## 스크립트

| 스크립트 | 용도 |
|----------|------|
| `run-simulation.ts` | 100명 시뮬 실행 |
| `_setup-user.ts` | 사용자 지갑 충전 + Moi |
| `_ium-to-user.ts` | 이음 신청/수락 |
| `_proxy-interactions.ts` | 대리 지갑 통합 상호작용 |
| `_verify-trust.ts` | trust balance + connection web 검증 |
| `_check-sim-balances.ts` | 100개 지갑 잔액 확인 |
| `_fund-proxy.ts` | 대리 지갑 충전 |
