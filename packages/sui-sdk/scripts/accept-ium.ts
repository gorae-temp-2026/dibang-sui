/**
 * Wallet2(0xc8d5...)에 온 IumRequest를 찾아서 수락
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildAcceptIumTx, moveTarget,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

async function main() {
  const walletData = JSON.parse(readFileSync(join(here, '../../../_e2e/2026-06-22-results/e2e-wallets.json'), 'utf-8'));
  const w2 = walletData.wallets.find((w: any) => w.address.startsWith('0xc8d5'));
  const kp = Ed25519Keypair.fromSecretKey(w2.sk);
  console.log('Wallet2:', w2.address);

  // IumRequest 조회
  const owned = await client.getOwnedObjects({
    owner: w2.address,
    filter: { StructType: moveTarget('ium', 'IumRequest') },
    options: { showContent: true },
  });

  console.log(`IumRequest ${owned.data.length}개 발견`);

  for (const obj of owned.data) {
    const fields = (obj.data?.content as any)?.fields;
    const requestId = obj.data?.objectId;
    const eventId = fields?.event_id;
    const initiator = fields?.initiator;
    console.log(`  requestId: ${requestId}`);
    console.log(`  eventId: ${eventId}`);
    console.log(`  initiator: ${initiator}`);

    // 수락
    const res = await executeAndAssert(client, {
      transaction: buildAcceptIumTx({ eventId, requestId: requestId! }),
      signer: kp,
    });
    console.log(`  ✅ 수락 완료: ${res.digest}`);
  }

  if (owned.data.length === 0) {
    console.log('받은 이음 신청이 없습니다.');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
