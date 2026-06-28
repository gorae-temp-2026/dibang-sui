/**
 * dibang_wedding 온체인 패키지 설정.
 *
 * 패키지 ID·공유 오브젝트 ID는 배포 환경마다 다르므로, 라이브러리는 모듈 레벨 설정을
 * 두고 소비자(프론트엔드 / 스크립트)가 시작 시 {@link configureSui}로 주입한다.
 * 기본값은 testnet 배포(.env.testnet.sui)다.
 */

export type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';

export interface SuiContractConfig {
  network: SuiNetwork;
  /** dibang_wedding Move 패키지 ID — moveCall target(함수 호출)용. upgrade 시 최신 패키지 ID. */
  packageId: string;
  /** 원본 패키지 ID — 오브젝트 type prefix·이벤트 조회 필터용. upgrade 후에도 변하지 않는다. */
  originalPackageId?: string;
  /**
   * TrustRegistry shared object ID(bootstrap 후 주입). 신호→매트릭스 라우팅 색인.
   * 결정#42(온체인 레지스트리). PTB는 이 색인으로 매트릭스 ID를 얻어 tx 입력에 넣는다.
   */
  trustRegistryId?: string;
  /** EM-부조(돈) TrustMatrix shared object ID. give가 이 매트릭스를 갱신. */
  emMoneyMatrixId?: string;
  /** CS(유대) TrustMatrix shared object ID. write/invite/gift/participate/accept_ium이 갱신. */
  csMatrixId?: string;
  /**
   * dibang 샵 Payment Kit PaymentRegistry shared object ID(결제·중복방지·treasury 적립).
   * payment_kit 패키지(0x7e06…)에 1회 생성·설정(managed_funds=true)된 registry — dibang 패키지 재배포와 무관하게 유지.
   * buildPurchaseItemTx가 이 registry로 moi::purchase_item을 호출. 생성: scripts/create-shop-registry.ts.
   */
  shopRegistryId?: string;
}

/** testnet 배포 기본값 (2026-06-28 upgrade — 0xf33fba09 원본의 v2). */
export const TESTNET_CONFIG: SuiContractConfig = {
  network: 'testnet',
  packageId: '0xb529ddd02c6ef595331bd319c12ac0bb2d9d9cfdb51edd19cd1a5c26719df651',
  originalPackageId: '0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d',
  trustRegistryId: '0x20ff0c7f1bfd4812fc74bfafba49cb56b4e43404541fd44645ff8dbcb050a823',
  emMoneyMatrixId: '0x61000a070d0da5f2c4af60a761e39372c27e5246700ea7791b3874c06effb4d2',
  csMatrixId: '0xfa2466a926b8346e6f1fdcd143e2709020b0ad306d08df84d825d40e325e5328',
  shopRegistryId: '0x06cd52b59efdc3e0c4807204be0b3d449842dc591c57cf2cb6704a2b8c4d482c',
};

let activeConfig: SuiContractConfig = { ...TESTNET_CONFIG };

/**
 * 활성 설정을 덮어쓴다(부분 갱신).
 *
 * 빌더·쿼리는 호출 시점의 모듈 전역 설정을 읽으므로, 반드시 **앱 시작 시 1회** 호출하고
 * 트랜잭션 구성 도중에는 바꾸지 않는다. 런타임에 네트워크를 전환하는 멀티네트워크 앱이라면
 * 모듈 전역 대신 설정을 인자로 명시 전달하는 방식으로 바꿔야 한다.
 */
export function configureSui(config: Partial<SuiContractConfig>): void {
  activeConfig = { ...activeConfig, ...config };
}

/** 현재 활성 설정. */
export function getConfig(): SuiContractConfig {
  return activeConfig;
}

/**
 * 배선용 TrustMatrix 객체 ID를 꺼낸다. 미설정이면 명확히 실패한다 —
 * bootstrap(trust_registry::bootstrap) 후 그 ID들을 configureSui로 주입해야 한다.
 * `emMoney` = 부조(EM-money) 매트릭스, `cs` = 유대(CS) 매트릭스.
 */
export function requireMatrixId(which: 'emMoney' | 'cs'): string {
  const id = which === 'emMoney' ? activeConfig.emMoneyMatrixId : activeConfig.csMatrixId;
  if (!id) {
    const key = which === 'emMoney' ? 'emMoneyMatrixId' : 'csMatrixId';
    throw new Error(`TrustMatrix(${which}) 미설정 — bootstrap 후 configureSui({ ${key}: '0x…' }) 주입 필요`);
  }
  return id;
}

/** `${packageId}::${module}::${fn}` 형태의 moveCall target 문자열을 만든다. upgraded 패키지 ID 사용. */
export function moveTarget(
  moduleName: string,
  fn: string,
): `${string}::${string}::${string}` {
  return `${activeConfig.packageId}::${moduleName}::${fn}`;
}

/** `${originalPackageId}::${module}::${type}` — 이벤트·오브젝트 type 조회용. 원본 패키지 ID 사용. */
export function eventType(
  moduleName: string,
  typeName: string,
): string {
  const base = activeConfig.originalPackageId ?? activeConfig.packageId;
  return `${base}::${moduleName}::${typeName}`;
}
