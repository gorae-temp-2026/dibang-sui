/**
 * Sui 클라이언트 팩토리.
 *
 * - 신규 코드 기본은 {@link SuiGrpcClient} (성능·타입 안정성) — 오브젝트 조회·트랜잭션 실행용.
 * - 이벤트 쿼리(queryEvents)는 gRPC Core API에 대응 메서드가 없어 JSON-RPC가 필요하다
 *   (FAQ: 트랜잭션/이벤트 쿼리는 GraphQL 또는 JSON-RPC). 그래서 두 팩토리를 모두 제공한다.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import type { SuiNetwork } from './constants';

const GRPC_BASE_URLS: Record<SuiNetwork, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
};

/** 오브젝트 조회·트랜잭션 실행용 gRPC 클라이언트. */
export function createSuiClient(network: SuiNetwork = 'testnet'): SuiGrpcClient {
  return new SuiGrpcClient({ network, baseUrl: GRPC_BASE_URLS[network] });
}

/** 이벤트 쿼리용 JSON-RPC 클라이언트 (gRPC에 queryEvents 대응이 없음). */
export function createJsonRpcClient(network: SuiNetwork = 'testnet'): SuiJsonRpcClient {
  return new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
}
