/**
 * Testnet 통합 테스트 — SDK 빌더가 배포된 dibang_wedding 패키지에서 실제로 동작하는지 검증.
 *
 * 흐름: create_wedding → getWedding → create_vault → send_gift → getCashGiftVault
 *       → write_entry → getGuestbookFeed → submit_rsvp → getRsvpEvents
 *       → create_moi → mint_item → equip_item → create_ium → getOwnedIums
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-testnet.ts
 *
 * 참고: 프로덕션 실행 경로는 gRPC/dApp Kit이지만, 이 테스트는 결과(objectChanges) 파싱이
 * 쉬운 JSON-RPC로 실행한다. PTB 자체는 동일하므로 빌더 검증 목적에 충분하다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import type { SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import type { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient,
  getConfig,
  executeAndAssert,
  buildCreateWeddingTx,
  buildUpdateWeddingTx,
  buildAddHostTx,
  buildCreateVaultTx,
  buildSendGiftTx,
  buildWithdrawTx,
  buildWriteEntryTx,
  buildClaimEntryTx,
  buildSubmitRsvpTx,
  buildCreateMoiTx,
  buildMintItemTx,
  buildEquipItemTx,
  buildUnequipItemTx,
  buildCreateIumTx,
  buildRevokeIumTx,
  getWedding,
  getCashGiftVault,
  getGuestbookFeed,
  getRsvpEvents,
  getOwnedIums,
} from '../src/index';

const KEY_PATH = join(dirname(fileURLToPath(import.meta.url)), '.test-keypair');
const client = createJsonRpcClient('testnet');

function loadOrCreateKeypair(): Ed25519Keypair {
  if (existsSync(KEY_PATH)) {
    return Ed25519Keypair.fromSecretKey(readFileSync(KEY_PATH, 'utf-8').trim());
  }
  const kp = new Ed25519Keypair();
  writeFileSync(KEY_PATH, kp.getSecretKey(), 'utf-8');
  return kp;
}

async function ensureFunds(address: string): Promise<void> {
  const { totalBalance } = await client.getBalance({ owner: address });
  if (BigInt(totalBalance) >= 200_000_000n) return; // 0.2 SUI 이상이면 충분
  console.log('requesting faucet funds...');
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: address });
    // 인덱싱까지 잠시 대기
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { totalBalance: b } = await client.getBalance({ owner: address });
      if (BigInt(b) >= 200_000_000n) return;
    }
  } catch (e) {
    console.error('faucet failed (rate limit?). 잔액 부족 시 수동 충전 필요:', e);
  }
}

let keypair: Ed25519Keypair;

async function exec(label: string, tx: Transaction): Promise<SuiTransactionBlockResponse> {
  // SDK의 executeAndAssert 헬퍼를 그대로 사용(실행+성공검증). 실패 시 throw.
  const res = await executeAndAssert(client, { transaction: tx, signer: keypair });
  console.log(`  ✓ ${label}  (${res.digest})`);
  return res;
}

/** objectChanges에서 타입 접미사로 생성된 오브젝트 ID를 찾는다. */
function createdId(res: SuiTransactionBlockResponse, typeSuffix: string): string {
  const change = res.objectChanges?.find(
    (o) => o.type === 'created' && o.objectType.endsWith(typeSuffix),
  );
  if (!change || change.type !== 'created') {
    throw new Error(`created object ${typeSuffix} not found`);
  }
  return change.objectId;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ✓ assert: ${msg}`);
}

async function main() {
  keypair = loadOrCreateKeypair();
  const addr = keypair.toSuiAddress();
  console.log('test address:', addr);
  console.log('package:', getConfig().packageId);
  await ensureFunds(addr);

  // 1) 결혼식 생성
  console.log('\n[1] create_wedding');
  const rWedding = await exec(
    'create_wedding',
    buildCreateWeddingTx({
      owner: addr,
      groomName: 'TestGroom',
      brideName: 'TestBride',
      date: '2026-09-01',
      time: '13:00',
      venueName: 'Test Hall',
      venueAddress: 'Seoul',
      loungeName: 'Test Lounge',
      groomFatherName: 'GF',
    }),
  );
  const weddingId = createdId(rWedding, '::wedding::Wedding');
  const loungeId = createdId(rWedding, '::wedding::WeddingLounge');
  const capId = createdId(rWedding, '::wedding::WeddingCap');

  const wedding = await getWedding(client, weddingId);
  assert(wedding?.groomName === 'TestGroom', 'wedding.groomName == TestGroom');
  assert(wedding?.hosts.includes(addr) ?? false, 'wedding.hosts includes creator');

  // 2) 모금함 생성 + 축의금 송금
  console.log('\n[2] create_vault + send_gift');
  await exec('create_vault', buildCreateVaultTx({ weddingId, capId }));
  const afterVault = await getWedding(client, weddingId);
  const vaultId = afterVault?.vaultId;
  assert(!!vaultId, 'wedding.vaultId set after create_vault');

  await exec(
    'send_gift',
    buildSendGiftTx({
      vaultId: vaultId!,
      amount: 1000n,
      guestName: 'Giver',
      recipientSlot: 'groom',
      relationCategory: 'friend',
      owner: addr,
    }),
  );
  const vault = await getCashGiftVault(client, vaultId!);
  assert((vault?.balance ?? 0n) >= 1000n, 'vault.balance >= 1000 MIST');

  // 3) 방명록 작성 + 피드 조회
  console.log('\n[3] write_entry + getGuestbookFeed');
  const rEntry = await exec(
    'write_entry',
    buildWriteEntryTx({ loungeId, guestName: 'Visitor', message: 'Congrats 축하해요', owner: addr }),
  );
  const entryId = createdId(rEntry, '::guestbook::GuestbookEntry');
  const feed = await getGuestbookFeed(client, loungeId);
  assert(feed.some((f) => f.message.includes('Congrats')), 'guestbook feed has the message');

  // 4) RSVP 제출 + 이벤트 조회
  console.log('\n[4] submit_rsvp + getRsvpEvents');
  await exec(
    'submit_rsvp',
    buildSubmitRsvpTx({
      loungeId,
      recipientSlot: 'groom',
      guestName: 'Attendee',
      attendance: 'attending',
      companionCount: 2,
      meal: 'yes',
    }),
  );
  const rsvps = await getRsvpEvents(client, weddingId);
  assert(rsvps.some((r) => r.guestName === 'Attendee'), 'rsvp event recorded');

  // 5) Moi 생성 + 아이템 발행 + 장착
  console.log('\n[5] create_moi + mint_item + equip_item');
  const rMoi = await exec('create_moi', buildCreateMoiTx({ recipient: addr }));
  const moiId = createdId(rMoi, '::moi::Moi');
  const rItem = await exec(
    'mint_item',
    buildMintItemTx({ name: 'Crown', itemType: 'head', slot: 'head', owner: addr }),
  );
  const itemId = createdId(rItem, '::moi::MoiItem');
  await exec('equip_item', buildEquipItemTx({ moiId, itemId }));

  // 6) Ium 생성 + 조회
  console.log('\n[6] create_ium + getOwnedIums');
  const other = new Ed25519Keypair().toSuiAddress();
  const rIum = await exec(
    'create_ium',
    buildCreateIumTx({ toUser: other, relationType: 'friend', label: 'tester', owner: addr }),
  );
  const iumId = createdId(rIum, '::ium::Ium');
  const iums = await getOwnedIums(client, addr);
  assert(iums.some((i) => i.toUser === other), 'ium created and owned');

  // 7) mutation / cleanup 빌더 (나머지 전체 커버리지)
  console.log('\n[7] update_wedding + add_host + withdraw + unequip + claim + revoke');
  await exec(
    'add_host',
    buildAddHostTx({ weddingId, capId, newHost: new Ed25519Keypair().toSuiAddress() }),
  );
  await exec(
    'update_wedding',
    buildUpdateWeddingTx({
      weddingId,
      capId,
      groomName: 'UpdatedGroom',
      brideName: 'TestBride',
      date: '2026-09-02',
      time: '14:00',
      venueName: 'New Hall',
      venueAddress: 'Busan',
    }),
  );
  const updated = await getWedding(client, weddingId);
  assert(updated?.groomName === 'UpdatedGroom', 'wedding updated via update_wedding');

  await exec('withdraw', buildWithdrawTx({ vaultId: vaultId!, capId, amount: 500n, owner: addr }));
  const vaultAfter = await getCashGiftVault(client, vaultId!);
  assert((vaultAfter?.balance ?? 0n) < (vault?.balance ?? 0n), 'vault balance decreased after withdraw');

  await exec('unequip_item', buildUnequipItemTx({ moiId, slot: 'head', owner: addr }));
  await exec(
    'claim_entry',
    buildClaimEntryTx({ entryId, recipient: new Ed25519Keypair().toSuiAddress() }),
  );
  await exec('revoke_ium', buildRevokeIumTx({ iumId }));
  const iumsAfter = await getOwnedIums(client, addr);
  assert(!iumsAfter.some((i) => i.id === iumId), 'ium removed after revoke');

  console.log('\n=== ALL TESTNET INTEGRATION CHECKS PASSED ===');
}

main().catch((e) => {
  console.error('\nTESTNET TEST FAILED:', e);
  process.exit(1);
});
