/**
 * 온체인 연결 e2e 검증 — createWedding → participate → give → write 연쇄 실행.
 * testnet에서 dev 지갑으로 전체 흐름을 검증하고 각 단계 digest와 신호를 출력한다.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-onchain-flow.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient,
  executeAndAssert,
  configureSui,
  buildCreateWeddingTx,
  buildCreateVaultTx,
  buildParticipateTx,
  buildGiveTx,
  buildWriteTx,
  buildInviteTx,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
const client = createJsonRpcClient('testnet');
configureSui({
  network: 'testnet',
  packageId: TESTNET_CONFIG.packageId,
  emMoneyMatrixId: TESTNET_CONFIG.emMoneyMatrixId,
  csMatrixId: TESTNET_CONFIG.csMatrixId,
  trustRegistryId: TESTNET_CONFIG.trustRegistryId,
});

function loadKey(): Ed25519Keypair {
  const envPath = [
    join(here, '../../..', 'apps/dibang-wedding/.env.local'),
    join(here, '../../..', 'apps/dibang-wedding/.env.localhost'),
    join(here, '../../..', 'apps/dibang-wedding/.env'),
  ].find(p => existsSync(p));
  if (!envPath) throw new Error('No env file found with VITE_DEV_PRIVATE_KEY');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const sk = lines.find(l => l.startsWith('VITE_DEV_PRIVATE_KEY='))?.split('=')[1]?.trim();
  if (!sk) throw new Error('VITE_DEV_PRIVATE_KEY not found in .env.localhost');
  return Ed25519Keypair.fromSecretKey(sk);
}

async function extractCreated(digest: string, suffix: string): Promise<string> {
  const txb = await client.getTransactionBlock({ digest, options: { showObjectChanges: true } });
  const c = txb.objectChanges?.find(o => o.type === 'created' && o.objectType.endsWith(suffix));
  if (!c || !('objectId' in c)) throw new Error(`${suffix} not found in ${digest}`);
  return c.objectId;
}

async function main() {
  const signer = loadKey();
  const addr = signer.toSuiAddress();
  console.log('signer:', addr);
  const bal = await client.getBalance({ owner: addr });
  console.log('balance:', bal.totalBalance, 'MIST');

  // 1. createWedding
  console.log('\n=== 1. createWedding ===');
  const weddingTx = buildCreateWeddingTx({ owner: addr });
  const wRes = await executeAndAssert(client, { transaction: weddingTx, signer });
  console.log('digest:', wRes.digest);
  const weddingId = await extractCreated(wRes.digest, '::wedding::Wedding');
  const eventId = await extractCreated(wRes.digest, '::event::Event');
  const capId = await extractCreated(wRes.digest, '::wedding::WeddingCap');
  const loungeId = await extractCreated(wRes.digest, '::wedding::WeddingLounge');
  console.log('weddingId:', weddingId);
  console.log('eventId:', eventId);
  console.log('capId:', capId);
  console.log('loungeId:', loungeId);
  const hostParticipationId = await extractCreated(wRes.digest, '::event::Participation');
  console.log('hostParticipationId:', hostParticipationId);

  // 2. createVault
  console.log('\n=== 2. createVault ===');
  const vaultTx = buildCreateVaultTx({ weddingId, capId });
  const vRes = await executeAndAssert(client, { transaction: vaultTx, signer });
  console.log('digest:', vRes.digest);
  const vaultId = await extractCreated(vRes.digest, '::cash_gift::CashGiftVault');
  console.log('vaultId:', vaultId);

  // 3. participate (GUEST role=1)
  console.log('\n=== 3. participate (GUEST) ===');
  const pTx = buildParticipateTx({ eventId, roleId: 1 });
  const pRes = await executeAndAssert(client, { transaction: pTx, signer });
  console.log('digest:', pRes.digest);
  const participationId = await extractCreated(pRes.digest, '::event::Participation');
  console.log('participationId:', participationId);

  // 4. give (부조 — 0.001 SUI = 1_000_000 MIST)
  console.log('\n=== 4. give ===');
  const giveTx = buildGiveTx({ participationId, vaultId, weddingId, amount: 1_000_000n });
  const gRes = await executeAndAssert(client, { transaction: giveTx, signer });
  console.log('digest:', gRes.digest);

  // 5. write (방명록)
  console.log('\n=== 5. write ===');
  const writeTx = buildWriteTx({ participationId, weddingId });
  const wrRes = await executeAndAssert(client, { transaction: writeTx, signer });
  console.log('digest:', wrRes.digest);

  // 6. invite (혼주가 하객 초대 — createWedding 시 자동 발행된 HOST Participation 사용)
  console.log('\n=== 6. invite ===');
  const dummyGuest = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const invTx = buildInviteTx({ weddingId, hostParticipationId, guest: dummyGuest });
  const iRes = await executeAndAssert(client, { transaction: invTx, signer });
  console.log('digest:', iRes.digest);

  // 신호 확인
  console.log('\n=== 8. Signal check ===');
  const evts = await client.queryEvents({
    query: { MoveEventType: `${TESTNET_CONFIG.packageId}::signal::SignalEmitted` },
    order: 'descending',
    limit: 10,
  });
  const recent = evts.data.filter(e => {
    const p = e.parsedJson as Record<string, unknown>;
    return String(p.from) === addr || String(p.to) === addr;
  });
  console.log(`recent signals involving ${addr}: ${recent.length}`);
  for (const e of recent) {
    const p = e.parsedJson as Record<string, unknown>;
    console.log(`  kind=${p.kind} source=${p.source} from=${p.from} to=${p.to} mag=${p.magnitude}`);
  }

  console.log('\n✅ 전체 흐름 완료');
}
main().catch(e => { console.error(e); process.exit(1); });
