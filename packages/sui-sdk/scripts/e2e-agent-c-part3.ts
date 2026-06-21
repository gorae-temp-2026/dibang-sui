/**
 * E2E Agent C Part 3 — 가스 부족으로 미실행된 C-7 + C-8 나머지 재실행.
 * 공용 E2E 지갑(0.5 SUI each) 사용.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui, moveTarget,
  buildCreateWeddingTx, buildCreateVaultTx, buildParticipateTx,
  buildGiveTx, buildWithdrawTx, buildWriteTx, buildSubmitRsvpTx,
  buildRequestIumTx, buildAcceptIumTx, buildInviteTx,
  buildPurchaseItemTx, buildGiftTx, buildCreateMoiTx,
  getCashGiftVault, getRsvpEvents, discoverUsers,
} from '../src/index';
import { buildEquipItemTx } from '../src/moi';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, '../../../_e2e/2026-06-22-results/agent-c');
const RESULTS_FILE = join(RESULTS_DIR, 'results.jsonl');

configureSui({
  network: 'testnet',
  packageId: TESTNET_CONFIG.packageId,
  trustRegistryId: TESTNET_CONFIG.trustRegistryId,
  emMoneyMatrixId: TESTNET_CONFIG.emMoneyMatrixId,
  csMatrixId: TESTNET_CONFIG.csMatrixId,
  shopRegistryId: TESTNET_CONFIG.shopRegistryId,
});
const client = createJsonRpcClient('testnet');

function log(id: string, status: string, data?: Record<string, unknown>) {
  const entry = { id, status, ...data, ts: new Date().toISOString() };
  console.log(`[${status}] ${id}`, data ? JSON.stringify(data) : '');
  appendFileSync(RESULTS_FILE, JSON.stringify(entry) + '\n');
}

function findCreated(changes: any[] | undefined, suffix: string): string | undefined {
  return changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix))?.objectId;
}

async function expectAbort(id: string, fn: () => Promise<any>) {
  try {
    await fn();
    log(id, 'UNEXPECTED_FAIL', { error: 'Expected abort but tx succeeded' });
  } catch (e: any) {
    log(id, 'EXPECTED_FAIL', { error: (e.message ?? String(e)).slice(0, 200) });
  }
}

async function main() {
  // 공용 E2E 지갑 로드
  const walletFile = JSON.parse(readFileSync(join(here, '../../../_e2e/2026-06-22-results/e2e-wallets.json'), 'utf-8'));
  const Host = Ed25519Keypair.fromSecretKey(walletFile.wallets[0].sk);
  const CoHost = Ed25519Keypair.fromSecretKey(walletFile.wallets[1].sk);
  const Guest1 = Ed25519Keypair.fromSecretKey(walletFile.wallets[2].sk);
  const Guest2 = Ed25519Keypair.fromSecretKey(walletFile.wallets[3].sk);
  const Guest3 = Ed25519Keypair.fromSecretKey(walletFile.wallets[4].sk);

  console.log('=== Part 3: 공용 E2E 지갑 로드 ===');
  for (const [name, kp] of [['Host', Host], ['CoHost', CoHost], ['Guest1', Guest1], ['Guest2', Guest2], ['Guest3', Guest3]] as const) {
    const bal = await client.getBalance({ owner: kp.toSuiAddress() });
    console.log(`  ${name}: ${kp.toSuiAddress()} (${Number(bal.totalBalance)/1e9} SUI)`);
  }

  // ═══════════════════════════════════════════════════════════
  // 사전 셋업: 결혼식 A (Host 혼주) — C-7/C-8용
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ 사전 셋업: 결혼식 A ══════');
  const w1 = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: Host.toSuiAddress() }),
    signer: Host,
  });
  const weddingId = findCreated(w1.objectChanges, '::wedding::Wedding')!;
  const eventId = findCreated(w1.objectChanges, '::event::Event')!;
  const capId = findCreated(w1.objectChanges, '::wedding::WeddingCap')!;
  const loungeId = findCreated(w1.objectChanges, '::wedding::WeddingLounge')!;
  const hostPartId = findCreated(w1.objectChanges, '::event::Participation')!;
  console.log(`  weddingA: ${weddingId}`);

  const v1 = await executeAndAssert(client, {
    transaction: buildCreateVaultTx({ weddingId, capId }),
    signer: Host,
  });
  const vaultId = findCreated(v1.objectChanges, '::cash_gift::CashGiftVault')!;

  // Guest1~3 참가
  const guestPartIds: Record<string, string> = {};
  for (const [name, kp] of [['Guest1', Guest1], ['Guest2', Guest2], ['Guest3', Guest3]] as const) {
    const p = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId, roleId: 1 }),
      signer: kp,
    });
    guestPartIds[name] = findCreated(p.objectChanges, '::event::Participation')!;
  }
  log('P3-SETUP-A', 'PASS', { weddingId, eventId, vaultId, guestPartIds });

  // Host Moi 생성
  const moiRes = await executeAndAssert(client, {
    transaction: buildCreateMoiTx({ recipient: Host.toSuiAddress() }),
    signer: Host,
  });
  const hostMoiId = findCreated(moiRes.objectChanges, '::moi::Moi')!;

  // ═══════════════════════════════════════════════════════════
  // C-7: 교차 결혼식 시나리오
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ C-7: 교차 결혼식 ══════');

  // 결혼식 B (Guest3 혼주)
  const w2 = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: Guest3.toSuiAddress() }),
    signer: Guest3,
  });
  const wedding2Id = findCreated(w2.objectChanges, '::wedding::Wedding')!;
  const event2Id = findCreated(w2.objectChanges, '::event::Event')!;
  const cap2Id = findCreated(w2.objectChanges, '::wedding::WeddingCap')!;

  const v2 = await executeAndAssert(client, {
    transaction: buildCreateVaultTx({ weddingId: wedding2Id, capId: cap2Id }),
    signer: Guest3,
  });
  const vault2Id = findCreated(v2.objectChanges, '::cash_gift::CashGiftVault')!;
  console.log(`  weddingB: ${wedding2Id}`);

  // C-7-1: Guest1이 2개 결혼식에 모두 GUEST 참가
  const p2 = await executeAndAssert(client, {
    transaction: buildParticipateTx({ eventId: event2Id, roleId: 1 }),
    signer: Guest1,
  });
  const guest1Part2Id = findCreated(p2.objectChanges, '::event::Participation')!;
  log('C-7-1', 'PASS', { note: 'Guest1 participated in both weddings', guest1Part2Id });

  // C-7-2: 각 결혼식에 각각 부조
  const give1 = await executeAndAssert(client, {
    transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest1, amount: 1_000_000n }),
    signer: Guest1,
  });
  const give2 = await executeAndAssert(client, {
    transaction: buildGiveTx({ vaultId: vault2Id, weddingId: wedding2Id, participationId: guest1Part2Id, amount: 500_000n }),
    signer: Guest1,
  });
  log('C-7-2', 'PASS', { digest1: give1.digest, digest2: give2.digest });

  // C-7-3: 결혼식 A의 Participation으로 결혼식 B에 부조 → EWrongEvent
  await expectAbort('C-7-3', () =>
    executeAndAssert(client, {
      transaction: buildGiveTx({
        vaultId: vault2Id, weddingId: wedding2Id,
        participationId: guestPartIds.Guest1, // weddingA participation
        amount: 100_000n,
      }),
      signer: Guest1,
    }));

  // C-7-4: discoverUsers에서 교차 참가 반영
  await executeAndAssert(client, {
    transaction: buildParticipateTx({ eventId: event2Id, roleId: 1 }),
    signer: Guest2,
  });
  const disc = await discoverUsers(client, Guest1.toSuiAddress());
  const g2inDisc = disc.find(d => d.address === Guest2.toSuiAddress());
  log('C-7-4', g2inDisc && g2inDisc.sharedEventIds.length >= 2 ? 'PASS' : 'UNEXPECTED_FAIL', {
    sharedEventIds: g2inDisc?.sharedEventIds?.length,
    degree: g2inDisc?.degree,
  });

  // ═══════════════════════════════════════════════════════════
  // C-8: 엣지 케이스 (가스 부족으로 미실행된 것들)
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ C-8: 엣지 케이스 (미완분) ══════');

  // C-8-6: 부조 후 같은 Participation으로 방명록 — 성공 (ref 재사용)
  try {
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest1, amount: 100_000n }),
      signer: Guest1,
    });
    const reuse = await executeAndAssert(client, {
      transaction: buildWriteTx({ weddingId, participationId: guestPartIds.Guest1 }),
      signer: Guest1,
    });
    log('C-8-6', 'PASS', { digest: reuse.digest, note: 'Participation reuse (ref) OK after give' });
  } catch (e: any) {
    log('C-8-6', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-7: 이음 신청 후 수락 전에 또 이음 신청 (중복 허용 확인)
  try {
    const dup1 = await executeAndAssert(client, {
      transaction: buildRequestIumTx({ toUser: Guest3.toSuiAddress() }),
      signer: Guest1,
    });
    const dup2 = await executeAndAssert(client, {
      transaction: buildRequestIumTx({ toUser: Guest3.toSuiAddress() }),
      signer: Guest1,
    });
    log('C-8-7', 'PASS', { digest1: dup1.digest, digest2: dup2.digest, note: 'Duplicate ium request allowed' });
  } catch (e: any) {
    log('C-8-7', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-8: 장착된 아이템 선물 불가 확인
  try {
    const nonce = `e2e-c8-eq-${Date.now()}`;
    const purchase = await executeAndAssert(client, {
      transaction: buildPurchaseItemTx({
        registryId: TESTNET_CONFIG.shopRegistryId!,
        nonce, name: 'TestHat', itemType: 'hat', slot: 'hat',
        owner: Host.toSuiAddress(), priceMist: 1_000_000n,
      }),
      signer: Host,
    });
    const eqItemId = findCreated(purchase.objectChanges, '::moi::MoiItem')!;
    // 장착
    await executeAndAssert(client, {
      transaction: buildEquipItemTx({ moiId: hostMoiId, itemId: eqItemId }),
      signer: Host,
    });
    // 장착 상태에서 선물 시도 → 실패 (아이템이 DOF로 이동, owned 아님)
    await expectAbort('C-8-8', () =>
      executeAndAssert(client, {
        transaction: buildGiftTx({ participationId: hostPartId, itemId: eqItemId, recipient: Guest1.toSuiAddress() }),
        signer: Host,
      }));
  } catch (e: any) {
    log('C-8-8', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-12: 2개 결혼식 각각 vault — 독립 확인 (vault2Id 사용 가능)
  try {
    const v1Info = await getCashGiftVault(client, vaultId);
    const v2Info = await getCashGiftVault(client, vault2Id);
    if (v1Info && v2Info && v1Info.weddingId !== v2Info.weddingId) {
      log('C-8-12', 'PASS', {
        vault1Wedding: v1Info.weddingId, vault2Wedding: v2Info.weddingId,
        vault1Balance: v1Info.balance.toString(), vault2Balance: v2Info.balance.toString(),
      });
    } else {
      log('C-8-12', 'UNEXPECTED_FAIL', { error: 'Vaults not independent' });
    }
  } catch (e: any) {
    log('C-8-12', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-13: 부조→인출→재부조→재인출 순환
  try {
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest2, amount: 2_000_000n }),
      signer: Guest2,
    });
    let v = await getCashGiftVault(client, vaultId);
    const balAfterGive1 = v!.balance;

    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId, capId, amount: v!.balance, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    v = await getCashGiftVault(client, vaultId);
    const balAfterWithdraw1 = v!.balance;

    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest2, amount: 1_000_000n }),
      signer: Guest2,
    });
    v = await getCashGiftVault(client, vaultId);
    const balAfterGive2 = v!.balance;

    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId, capId, amount: v!.balance, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    v = await getCashGiftVault(client, vaultId);
    log('C-8-13', 'PASS', {
      balAfterGive1: balAfterGive1.toString(),
      balAfterWithdraw1: balAfterWithdraw1.toString(),
      balAfterGive2: balAfterGive2.toString(),
      finalBalance: v!.balance.toString(),
    });
  } catch (e: any) {
    log('C-8-13', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-14: 같은 하객이 같은 slot으로 RSVP 2번 제출
  try {
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId, recipientSlot: 0, attendance: 0, companionCount: 0, meal: 0 }),
      signer: Guest2,
    });
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId, recipientSlot: 0, attendance: 1, companionCount: 2, meal: 1 }),
      signer: Guest2,
    });
    const rsvps = await getRsvpEvents(client, weddingId);
    const g2Rsvps = rsvps.filter(r => r.submitter === Guest2.toSuiAddress());
    log('C-8-14', 'PASS', { rsvpCount: g2Rsvps.length, note: 'Duplicate RSVP allowed (no on-chain dedup)' });
  } catch (e: any) {
    log('C-8-14', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  console.log('\n══════ Part 3 완료 ══════');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
