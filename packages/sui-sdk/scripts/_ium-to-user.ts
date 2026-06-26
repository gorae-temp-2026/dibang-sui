/**
 * 시뮬 지갑 20개 → 사용자에게 이음 신청 + 사용자가 수락.
 * F-2 + F-3 통합.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildRequestIumTx, buildAcceptIumTx,
  getOwnedIumRequests,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const USER_ADDRESS = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';
const USER_SK = 'suiprivkey1qpqhudd5vx2lfx4k6c6altav5wawyx6upqxnv48y7rz5shjgquj925xs5dm';

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
  const userKp = Ed25519Keypair.fromSecretKey(USER_SK);

  // 잔액 충분한 지갑 20개 선택
  const candidates: { name: string; kp: Ed25519Keypair }[] = [];
  for (const w of wallets) {
    if (candidates.length >= 20) break;
    try {
      const bal = await client.getBalance({ owner: w.address });
      if (BigInt(bal.totalBalance) >= 50_000_000n) {
        candidates.push({ name: w.name, kp: Ed25519Keypair.fromSecretKey(w.sk) });
      }
    } catch { /* skip */ }
  }
  console.log(`잔액 충분한 지갑 ${candidates.length}개 선택`);

  // F-2: 이음 신청 (시뮬 → 사용자)
  let requestCount = 0;
  for (const c of candidates) {
    try {
      await executeAndAssert(client, {
        transaction: buildRequestIumTx({ toUser: USER_ADDRESS }),
        signer: c.kp,
      });
      requestCount++;
      process.stdout.write(`  이음 신청 ${requestCount}/${candidates.length}\r`);
    } catch (e) {
      console.error(`  ${c.name} 신청 실패:`, (e as Error).message?.slice(0, 60));
    }
  }
  console.log(`\n이음 신청 완료: ${requestCount}건`);

  // F-3: 사용자가 수락 (accept_ium)
  console.log('\n사용자 이음 수락...');
  const requests = await getOwnedIumRequests(client, USER_ADDRESS);
  console.log(`받은 이음 요청: ${requests.length}개`);

  let acceptCount = 0;
  for (const req of requests) {
    try {
      await executeAndAssert(client, {
        transaction: buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId }),
        signer: userKp,
      });
      acceptCount++;
      process.stdout.write(`  이음 수락 ${acceptCount}/${requests.length}\r`);
    } catch (e) {
      console.error(`  수락 실패:`, (e as Error).message?.slice(0, 60));
    }
  }
  console.log(`\n이음 수락 완료: ${acceptCount}건`);
}

main().catch(e => { console.error(e); process.exit(1); });
