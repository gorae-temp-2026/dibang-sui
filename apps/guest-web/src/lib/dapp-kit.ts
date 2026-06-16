// Sui dApp Kit 인스턴스 (앱 전역 1개). gRPC 클라이언트로 testnet 연결.
// zkLogin을 주 인증 수단으로 쓰므로 지갑 연결 UI는 쓰지 않지만, dApp Kit의
// 클라이언트/네트워크 컨텍스트(useCurrentClient 등)를 재사용한다.

import { createDAppKit } from '@mysten/dapp-kit-react'
import { SuiGrpcClient } from '@mysten/sui/grpc'

const GRPC_URLS: Record<string, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
}

export const dAppKit = createDAppKit({
  networks: ['testnet', 'mainnet'] as const,
  defaultNetwork: 'testnet',
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }),
})

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit
  }
}
