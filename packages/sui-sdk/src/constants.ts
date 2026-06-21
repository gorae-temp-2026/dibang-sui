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
  /** dibang_wedding Move 패키지 ID */
  packageId: string;
  /**
   * TrustRegistry shared object ID(bootstrap 후 주입). 신호→매트릭스 라우팅 색인.
   * 결정#42(온체인 레지스트리). PTB는 이 색인으로 매트릭스 ID를 얻어 tx 입력에 넣는다.
   */
  trustRegistryId?: string;
  /** EM-부조(돈) TrustMatrix shared object ID. give가 이 매트릭스를 갱신. */
  emMoneyMatrixId?: string;
  /** CS(유대) TrustMatrix shared object ID. write/invite/gift/participate/accept_ium이 갱신. */
  csMatrixId?: string;
}

/** testnet 배포 기본값 (2026-06-21 cutover — 신뢰그래프+신호+add_host primary 게이트, digest CEhq5tz1...). 구 0x6bb8 대체. */
export const TESTNET_CONFIG: SuiContractConfig = {
  network: 'testnet',
  packageId: '0x258e9a29572e4a3729257299a85cda52f8415c25b92d7576b863fb3d9b0731ee',
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

/** `${packageId}::${module}::${fn}` 형태의 moveCall target 문자열을 만든다. */
export function moveTarget(
  moduleName: string,
  fn: string,
): `${string}::${string}::${string}` {
  return `${activeConfig.packageId}::${moduleName}::${fn}`;
}
