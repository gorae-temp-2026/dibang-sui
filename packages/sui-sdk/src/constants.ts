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
}

/** testnet 배포 기본값 (2026-06-21 cutover — 신뢰그래프+신호 컨트랙트, digest 84fwKgkth...). 구 0x6bb8(구 API) 대체. */
export const TESTNET_CONFIG: SuiContractConfig = {
  network: 'testnet',
  packageId: '0x9c9b4bda0e4a548246ea67fbf129d80592f5c41e1ed8c6ff59c767bf5f96748e',
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

/** `${packageId}::${module}::${fn}` 형태의 moveCall target 문자열을 만든다. */
export function moveTarget(
  moduleName: string,
  fn: string,
): `${string}::${string}::${string}` {
  return `${activeConfig.packageId}::${moduleName}::${fn}`;
}
