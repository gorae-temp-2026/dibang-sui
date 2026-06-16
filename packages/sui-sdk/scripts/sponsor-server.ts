/**
 * Sponsored Transaction 서비스 (standalone Node HTTP 서버).
 *
 * POST /sponsor — body: { senderAddress, txKindBytes(base64) }
 *   → { sponsoredBytes(base64), sponsorSignature }
 *
 * 허용된 패키지의 moveCall만 대납한다(임의 트랜잭션 거부). sponsor 키는 env로만 주입.
 *
 * 실행:
 *   SPONSOR_PRIVATE_KEY=suiprivkey... SUI_PACKAGE_ID=0x... \
 *   pnpm --filter @gorae/sui-sdk exec tsx scripts/sponsor-server.ts
 */
import { createServer } from 'node:http';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, getConfig, createSponsoredTransaction } from '../src/index';
import type { SponsorRequest } from '../src/index';

const PORT = Number(process.env.SPONSOR_PORT ?? 8090);
const secretKey = process.env.SPONSOR_PRIVATE_KEY;
if (!secretKey) {
  console.error('SPONSOR_PRIVATE_KEY 환경변수가 필요합니다 (sponsor 키페어 bech32).');
  process.exit(1);
}
const gasBudget = Number(process.env.SPONSOR_GAS_BUDGET ?? 30_000_000);
const allowedPackageId = process.env.SUI_PACKAGE_ID ?? getConfig().packageId;
const sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
const client = createJsonRpcClient('testnet');

const server = createServer((req, res) => {
  if (req.method !== 'POST' || !req.url?.startsWith('/sponsor')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  // 본문 크기 제한(메모리 보호). 정상 요청(주소 + kind bytes)은 작다.
  // (프로덕션 추가 필요: 인증 토큰·sender당 rate limit — 무인증 대납은 가스 고갈 DoS 위험.)
  const MAX_BODY = 256 * 1024;
  let body = '';
  let tooLarge = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) {
      tooLarge = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'request too large' }));
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (tooLarge) return;
    try {
      const request = JSON.parse(body) as SponsorRequest;
      const result = await createSponsoredTransaction({
        client,
        sponsorKeypair,
        request,
        allowedPackageId,
        gasBudget,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      // 대납 거부(허용 외 패키지)·파싱 실패 등은 400.
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`sponsor service listening on :${PORT}`);
  console.log(`  sponsor address: ${sponsorKeypair.toSuiAddress()}`);
  console.log(`  allowed package: ${allowedPackageId}`);
});
