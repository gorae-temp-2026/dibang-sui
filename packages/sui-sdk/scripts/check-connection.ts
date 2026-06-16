/**
 * testnet 연결 확인 스크립트.
 * 배포된 dibang_wedding 패키지 오브젝트를 gRPC로 조회해 클라이언트 연결을 검증한다.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/check-connection.ts
 */
import { createSuiClient, getConfig } from '../src/index';

async function main() {
  const config = getConfig();
  const client = createSuiClient(config.network);

  const res = await client.core.getObject({ objectId: config.packageId });
  // 패키지 오브젝트가 조회되면 연결·배포 모두 정상.
  console.log('network:', config.network);
  console.log('packageId:', config.packageId);
  console.log('object kind:', res.object?.kind ?? '(none)');
  console.log('CONNECTION OK');
}

main().catch((e) => {
  console.error('CONNECTION FAILED:', e);
  process.exit(1);
});
