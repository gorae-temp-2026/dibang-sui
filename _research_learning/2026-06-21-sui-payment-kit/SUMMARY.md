# Sui Payment Kit 정독 (PK-1/PK-2) — 검증 결과

> `@mysten/payment-kit@0.2.1` + GitHub `MystenLabs/sui-payment-kit` Move 소스 정독. 모든 항목 증거 기반(추측 아님).
> 배경: 오너 요구 "구매로직 in sdk"(L77/L80) = **Payment Kit**. 제 #14 hand-roll(purchase_item+treasury+splitCoins(gas))은 재발명 + sponsor 거부 버그였음.

## 1. 핵심 사실 (검증됨)

| 항목 | 사실 | 근거 |
|---|---|---|
| **sponsor-safe** | 코인 소싱이 `coinWithBalance`(gas 분리 X) | `dist/calls.mjs:16` `coin: sourceCoin ?? coinWithBalance({type,…})` |
| **합성(composable)** | `call.processRegistryPayment(opts)` → `(tx)=>TransactionResult` — 내 tx에 `tx.add`로 붙이고 결과 전달 | `dist/calls.d.mts` |
| **testnet 배포** | 패키지 `0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497`, SDK 내장 | `dist/constants.mjs` |
| **Move 함수** | `process_registry_payment<T>(registry: &mut PaymentRegistry, nonce: String, amount: u64, coin: Coin<T>, receiver: Option<address>, clock, ctx): PaymentReceipt` — coin by-value 소비 | GitHub `sources/payment_kit.move:184` |
| **PaymentReceipt** | `has copy, drop, store`(key 아님·hot-potato 아님), {payment_type, nonce, payment_amount, receiver, coin_type, timestamp_ms}, **getter 없음** | `payment_kit.move:84` |
| **treasury** | registry-managed funds=true면 funds가 registry에 적립 → `withdraw_from_registry`(admin) | docs/README |
| **중복방지** | registry는 `PaymentRecord`(복합키 nonce·amount·coinType·receiver)로 1회성 보장 | docs/payment-processing.md |
| **Move 패키지명** | `payment_kit`(edition 2024) — Move.toml git 의존성으로 추가 | GitHub `Move.toml` |

## 2. SDK API
- 셋업: `new SuiGrpcClient({...}).$extend(paymentKit())`.
- 고수준: `client.paymentKit.tx.processRegistryPayment({nonce, amount, receiver, coinType, sender, registryName})` → Transaction.
- 저수준(합성): `tx.add(client.paymentKit.call.processRegistryPayment({...}))` → `TransactionResult`.
- 기타: `processEphemeralPayment`, `createRegistry`, `setConfigRegistryManagedFunds`, `withdrawFromRegistry`. `DEFAULT_REGISTRY_NAME="default-payment-registry"`.

## 3. 설계 함의 (PK-3 입력)
- **시빌 게이트는 receipt 검증 불가**(getter 없음·drop이라 강제 소비 안 됨) → **moi::purchase_item이 `coin.value() ≥ ITEM_PRICE` 체크(=#14 유지) 후 `payment_kit::process_registry_payment`로 코인 전달**하는 Move-레벨 통합이 정석.
- 그러려면 **moi.move가 `payment_kit` Move를 의존**(Move.toml). mint_item public(package) 봉인 유지.
- **treasury = registry-managed funds**(사용자 결정 "온체인 레지스트리/공유객체"와 정합). dibang 자체 registry 생성 권장.
- SDK 결제 코인 = `coinWithBalance`(sponsor-safe) → 제 #14 `splitCoins(tx.gas)` 폐기.

## 4. 버릴 것 / 남길 것 (제 #14 대비)
- **버림**: `purchase_item(treasury: address)` + `transfer::public_transfer(payment, treasury)`(hand-roll treasury), SDK `splitCoins(tx.gas)`.
- **남김**: `coin.value() ≥ ITEM_PRICE` 게이트, `mint_item` public(package) 봉인.
