/**
 * Sui 클라이언트 팩토리.
 *
 * JSON-RPC: fullnode.testnet.sui.io는 브라우저 CORS를 차단하므로
 * publicnode.com의 CORS 지원 RPC를 사용한다.
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import type { SuiNetwork } from './constants';

const RPC_URLS: Record<SuiNetwork, string> = {
  testnet: 'https://sui-testnet-rpc.publicnode.com',
  mainnet: 'https://sui-mainnet-rpc.publicnode.com',
  devnet: 'https://sui-devnet-rpc.publicnode.com',
};

export function createJsonRpcClient(network: SuiNetwork = 'testnet'): SuiJsonRpcClient {
  return new SuiJsonRpcClient({ url: RPC_URLS[network], network });
}

export type { SuiJsonRpcClient };
