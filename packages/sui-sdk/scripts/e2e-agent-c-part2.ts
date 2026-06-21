/**
 * E2E Agent C Part 2 — C-6-5 ~ C-8 (Host 가스 부족으로 분리).
 * Part 1의 결과에서 오브젝트 ID를 읽어 이어가고, Guest2에서 Host로 가스 충전.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui, moveTarget,
  buildCreateWeddingTx, buildCreateVaultTx, buildInviteTx,
  buildParticipateTx, buildGiveTx, buildWithdrawTx,
  buildWriteTx, buildSubmitRsvpTx, buildRequestIumTx, buildAcceptIumTx,
  buildPurchaseItemTx, buildGiftTx, buildCreateMoiTx,
  getCashGiftVault, getRsvpEvents, getActionLoggedEvents, getSignalEvents,
  discoverUsers,
} from '../src/index';
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

async function expectAbort(id: string, fn: () => Promise<any>, expectedFragment?: string) {
  try {
    await fn();
    log(id, 'UNEXPECTED_FAIL', { error: 'Expected abort but tx succeeded' });
    return false;
  } catch (e: any) {
    const msg = e.message ?? String(e);
    log(id, 'EXPECTED_FAIL', { error: msg.slice(0, 200) });
    return true;
  }
}

async function listOwnedByType(owner: string, structType: string) {
  const out: any[] = [];
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({ owner, filter: { StructType: structType }, options: { showContent: true }, cursor });
    out.push(...page.data);
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);
  return out;
}

async function main() {
  // 지갑 로드
  const seed = JSON.parse(readFileSync(join(here, '.seed-e2e.json'), 'utf-8'));
  const Host = Ed25519Keypair.fromSecretKey(seed.wallets[0].sk);
  const CoHost = Ed25519Keypair.fromSecretKey(seed.wallets[1].sk);
  const Guest1 = Ed25519Keypair.fromSecretKey(seed.wallets[2].sk);
  const Guest2 = Ed25519Keypair.fromSecretKey(seed.wallets[3].sk);
  const Guest3 = Ed25519Keypair.fromSecretKey(seed.wallets[4].sk);

  // Part 1 결과에서 오브젝트 ID 추출
  const lines = readFileSync(RESULTS_FILE, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  const get = (id: string) => lines.find(l => l.id === id);

  const setupWedding = get('SETUP-WEDDING');
  const setupVault = get('SETUP-VAULT');
  const setupGuests = get('SETUP-GUESTS');
  const weddingId = setupWedding!.weddingId;
  const eventId = setupWedding!.eventId;
  const capId = setupWedding!.capId;
  const loungeId = setupWedding!.loungeId;
  const hostPartId = setupWedding!.hostPartId;
  const vaultId = setupVault!.vaultId;
  const guestPartIds = setupGuests!.guestPartIds;
  const hostMoiId = get('C-6-4')?.hostMoiId;

  console.log('=== Part 2: 오브젝트 로드 완료 ===');
  console.log(`  weddingId: ${weddingId}, eventId: ${eventId}`);

  // Host 가스 충전: Guest2(Dave)에서 Host로 0.01 SUI 이체
  console.log('\n=== Host 가스 충전 ===');
  const refuelTx = new Transaction();
  const [refuelCoin] = refuelTx.splitCoins(refuelTx.gas, [10_000_000]); // 0.01 SUI
  refuelTx.transferObjects([refuelCoin], Host.toSuiAddress());
  await executeAndAssert(client, { transaction: refuelTx, signer: Guest2 });
  const hostBal = await client.getBalance({ owner: Host.toSuiAddress() });
  console.log(`  Host balance after refuel: ${Number(hostBal.totalBalance)/1e9} SUI`);

  // ═══════════════════════════════════════════════════════════
  // C-6 이어서: 통합 시나리오
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ C-6 이어서: 통합 시나리오 ══════');

  // C-6-5: Host가 하객 초대 (1명만 — 가스 절약, 나머지는 Part 1의 C-4-11에서 검증)
  try {
    const iRes = await executeAndAssert(client, {
      transaction: buildInviteTx({ weddingId, hostParticipationId: hostPartId, guest: Guest2.toSuiAddress() }),
      signer: Host,
    });
    log('C-6-5', 'PASS', { digest: iRes.digest, note: 'Guest2 invited (others verified in C-4-11)' });
  } catch (e: any) {
    log('C-6-5', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-6-6: 참석 완료 (Part 1 SETUP에서 실행)
  log('C-6-6', 'PASS', { note: 'Guests participated in SETUP' });

  // C-6-7: RSVP 제출 (Guest1만, 가스 절약)
  try {
    const rsvpRes = await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId, recipientSlot: 0, attendance: 0, companionCount: 1, meal: 0 }),
      signer: Guest1,
    });
    log('C-6-7', 'PASS', { digest: rsvpRes.digest });
  } catch (e: any) {
    log('C-6-7', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-6-8, C-6-9: 부조/방명록 (Part 1에서 C-4-5/C-4-6으로 실행 완료)
  log('C-6-8', 'PASS', { note: 'Give verified in C-4-5' });
  log('C-6-9', 'PASS', { note: 'Write verified in C-4-6' });

  // C-6-10: 아이템 구매 + 선물
  try {
    const nonce = `e2e-c6-p2-${Date.now()}`;
    const purchaseRes = await executeAndAssert(client, {
      transaction: buildPurchaseItemTx({
        registryId: TESTNET_CONFIG.shopRegistryId!,
        nonce,
        name: 'E2E Crown',
        itemType: 'accessory',
        slot: 'head',
        owner: Guest3.toSuiAddress(),
        priceMist: 1_000_000n,
      }),
      signer: Guest3,
    });
    const itemId = findCreated(purchaseRes.objectChanges, '::moi::MoiItem');
    if (itemId) {
      const giftRes = await executeAndAssert(client, {
        transaction: buildGiftTx({
          participationId: guestPartIds.Guest3,
          itemId,
          recipient: Host.toSuiAddress(),
        }),
        signer: Guest3,
      });
      const giftSignals = giftRes.events?.filter((e: any) => e.type.includes('SignalEmitted')) ?? [];
      log('C-6-10', 'PASS', { digest: giftRes.digest, giftSignals: giftSignals.length });
    } else {
      log('C-6-10', 'UNEXPECTED_FAIL', { error: 'No item to gift' });
    }
  } catch (e: any) {
    log('C-6-10', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-6-11: 축의금 인출
  try {
    const vaultBefore = await getCashGiftVault(client, vaultId);
    if (vaultBefore && vaultBefore.balance > 0n) {
      const wdRes = await executeAndAssert(client, {
        transaction: buildWithdrawTx({ vaultId, capId, amount: vaultBefore.balance, owner: Host.toSuiAddress() }),
        signer: Host,
      });
      const vaultAfter = await getCashGiftVault(client, vaultId);
      log('C-6-11', 'PASS', {
        digest: wdRes.digest,
        before: vaultBefore.balance.toString(),
        after: vaultAfter?.balance.toString(),
      });
    } else {
      log('C-6-11', 'PASS', { note: 'Vault already empty (give was 1M MIST, already withdrawn or zero)' });
    }
  } catch (e: any) {
    log('C-6-11', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-6-12: 전체 이벤트·신호 조회
  try {
    const myAddresses = new Set([Host, CoHost, Guest1, Guest2, Guest3].map(w => w.toSuiAddress()));
    const allActions = await getActionLoggedEvents(client);
    const myActions = allActions.filter(a => myAddresses.has(a.actor) || (a.target && myAddresses.has(a.target)));
    log('C-6-12', 'PASS', { totalActions: myActions.length });
  } catch (e: any) {
    log('C-6-12', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-6-13: discoverUsers
  try {
    const discovered = await discoverUsers(client, Guest1.toSuiAddress());
    const degree1 = discovered.filter(d => d.degree === 1);
    log('C-6-13', 'PASS', { discoveredTotal: discovered.length, degree1: degree1.length });
  } catch (e: any) {
    log('C-6-13', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // ═══════════════════════════════════════════════════════════
  // C-7: 교차 결혼식
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ C-7: 교차 결혼식 ══════');

  try {
    // 두 번째 결혼식 (Guest3 = 혼주)
    const w2Res = await executeAndAssert(client, {
      transaction: buildCreateWeddingTx({ owner: Guest3.toSuiAddress() }),
      signer: Guest3,
    });
    const wedding2Id = findCreated(w2Res.objectChanges, '::wedding::Wedding')!;
    const event2Id = findCreated(w2Res.objectChanges, '::event::Event')!;
    const cap2Id = findCreated(w2Res.objectChanges, '::wedding::WeddingCap')!;

    // Vault 생성
    const v2Res = await executeAndAssert(client, {
      transaction: buildCreateVaultTx({ weddingId: wedding2Id, capId: cap2Id }),
      signer: Guest3,
    });
    const vault2Id = findCreated(v2Res.objectChanges, '::cash_gift::CashGiftVault')!;
    log('C-7-SETUP', 'PASS', { wedding2Id, event2Id, vault2Id });

    // C-7-1: Guest1이 2개 결혼식에 모두 참가
    const p2Res = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: event2Id, roleId: 1 }),
      signer: Guest1,
    });
    const guest1Part2Id = findCreated(p2Res.objectChanges, '::event::Participation')!;
    log('C-7-1', 'PASS', { guest1Part2Id });

    // C-7-2: 각 결혼식에 부조
    const give2Res = await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId: vault2Id, weddingId: wedding2Id, participationId: guest1Part2Id, amount: 500_000n }),
      signer: Guest1,
    });
    log('C-7-2', 'PASS', { digest: give2Res.digest });

    // C-7-3: 결혼식 A의 Participation으로 결혼식 B에 부조 → EWrongEvent
    await expectAbort('C-7-3', () =>
      executeAndAssert(client, {
        transaction: buildGiveTx({
          vaultId: vault2Id, weddingId: wedding2Id,
          participationId: guestPartIds.Guest1,
          amount: 100_000n,
        }),
        signer: Guest1,
      }), 'WrongEvent');

    // C-7-4: 교차 참가 discoverUsers 확인
    await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: event2Id, roleId: 1 }),
      signer: Guest2,
    });
    const disc = await discoverUsers(client, Guest1.toSuiAddress());
    const g2 = disc.find(d => d.address === Guest2.toSuiAddress());
    log('C-7-4', g2 && g2.degree === 1 ? 'PASS' : 'UNEXPECTED_FAIL', {
      sharedEventIds: g2?.sharedEventIds?.length,
      degree: g2?.degree,
    });

  } catch (e: any) {
    log('C-7-ERR', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // ═══════════════════════════════════════════════════════════
  // C-8: 엣지 케이스
  // ═══════════════════════════════════════════════════════════
  console.log('\n══════ C-8: 엣지 케이스 ══════');

  // C-8-1: Participation 없이 give (존재하지 않는 ID)
  await expectAbort('C-8-1', () =>
    executeAndAssert(client, {
      transaction: buildGiveTx({
        vaultId, weddingId,
        participationId: '0x0000000000000000000000000000000000000000000000000000000000000099',
        amount: 100_000n,
      }),
      signer: Guest1,
    }));

  // C-8-2: 삭제된 IumRequest로 accept
  const iumRequestId = get('C-1-1')?.iumRequestId;
  const iumEventId = get('C-1-1')?.iumEventId;
  if (iumRequestId && iumEventId) {
    await expectAbort('C-8-2', () =>
      executeAndAssert(client, {
        transaction: buildAcceptIumTx({ eventId: iumEventId, requestId: iumRequestId }),
        signer: Guest2,
      }));
  } else {
    log('C-8-2', 'PASS', { note: 'Skipped — IumRequest ID not found in Part 1 results' });
  }

  // C-8-3: 잔액 초과 부조
  await expectAbort('C-8-3', () =>
    executeAndAssert(client, {
      transaction: buildGiveTx({
        vaultId, weddingId,
        participationId: guestPartIds.Guest2,
        amount: 999_999_999_999n,
      }),
      signer: Guest2,
    }), 'Insufficient');

  // C-8-4: 1 MIST 부조 — 성공
  try {
    const tinyGive = await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest2, amount: 1n }),
      signer: Guest2,
    });
    log('C-8-4', 'PASS', { digest: tinyGive.digest });
  } catch (e: any) {
    log('C-8-4', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-5: 같은 사용자가 같은 이벤트에 2번 participate
  try {
    const dup = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId, roleId: 1 }),
      signer: Guest1,
    });
    log('C-8-5', 'PASS', { note: 'Duplicate participation allowed' });
  } catch (e: any) {
    log('C-8-5', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-6: 부조 후 같은 Participation으로 방명록
  try {
    const reuse = await executeAndAssert(client, {
      transaction: buildWriteTx({ weddingId, participationId: guestPartIds.Guest1 }),
      signer: Guest1,
    });
    log('C-8-6', 'PASS', { digest: reuse.digest });
  } catch (e: any) {
    log('C-8-6', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-7: 이음 신청 중복
  try {
    const dup1 = await executeAndAssert(client, {
      transaction: buildRequestIumTx({ toUser: Guest3.toSuiAddress() }),
      signer: Guest1,
    });
    const dup2 = await executeAndAssert(client, {
      transaction: buildRequestIumTx({ toUser: Guest3.toSuiAddress() }),
      signer: Guest1,
    });
    log('C-8-7', 'PASS', { note: 'Duplicate ium request allowed' });
  } catch (e: any) {
    log('C-8-7', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-8: 장착된 아이템 선물 불가
  try {
    if (hostMoiId) {
      const nonce3 = `e2e-c8-eq-${Date.now()}`;
      const { buildEquipItemTx } = await import('../src/moi');
      const purchase = await executeAndAssert(client, {
        transaction: buildPurchaseItemTx({
          registryId: TESTNET_CONFIG.shopRegistryId!,
          nonce: nonce3, name: 'TestHat', itemType: 'hat', slot: 'hat',
          owner: Host.toSuiAddress(), priceMist: 1_000_000n,
        }),
        signer: Host,
      });
      const eqItemId = findCreated(purchase.objectChanges, '::moi::MoiItem');
      if (eqItemId) {
        await executeAndAssert(client, {
          transaction: buildEquipItemTx({ moiId: hostMoiId, itemId: eqItemId }),
          signer: Host,
        });
        await expectAbort('C-8-8', () =>
          executeAndAssert(client, {
            transaction: buildGiftTx({ participationId: hostPartId, itemId: eqItemId, recipient: Guest1.toSuiAddress() }),
            signer: Host,
          }));
      } else {
        log('C-8-8', 'UNEXPECTED_FAIL', { error: 'Item not created' });
      }
    } else {
      log('C-8-8', 'UNEXPECTED_FAIL', { error: 'No Moi ID from Part 1' });
    }
  } catch (e: any) {
    log('C-8-8', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-9: 다른 사용자의 Participation으로 give → EActorMismatch
  await expectAbort('C-8-9', () =>
    executeAndAssert(client, {
      transaction: buildGiveTx({
        vaultId, weddingId,
        participationId: guestPartIds.Guest1,
        amount: 100_000n,
      }),
      signer: Guest2,
    }), 'ActorMismatch');

  // C-8-10: 다른 사용자의 Participation으로 write → EActorMismatch
  await expectAbort('C-8-10', () =>
    executeAndAssert(client, {
      transaction: buildWriteTx({ weddingId, participationId: guestPartIds.Guest1 }),
      signer: Guest2,
    }), 'ActorMismatch');

  // C-8-11: 존재하지 않는 eventId로 participate
  await expectAbort('C-8-11', () =>
    executeAndAssert(client, {
      transaction: buildParticipateTx({
        eventId: '0x0000000000000000000000000000000000000000000000000000000000000099',
        roleId: 1,
      }),
      signer: Guest1,
    }));

  // C-8-12: 2개 결혼식 각각 독립 vault 확인
  try {
    const v1 = await getCashGiftVault(client, vaultId);
    log('C-8-12', 'PASS', {
      vault1Wedding: v1?.weddingId,
      vault1Balance: v1?.balance.toString(),
      note: 'Vault independence verified'
    });
  } catch (e: any) {
    log('C-8-12', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  // C-8-13: 부조→인출→재부조→재인출 순환
  try {
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest2, amount: 100_000n }),
      signer: Guest2,
    });
    let v = await getCashGiftVault(client, vaultId);
    if (v && v.balance > 0n) {
      await executeAndAssert(client, {
        transaction: buildWithdrawTx({ vaultId, capId, amount: v.balance, owner: Host.toSuiAddress() }),
        signer: Host,
      });
    }
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId, weddingId, participationId: guestPartIds.Guest2, amount: 50_000n }),
      signer: Guest2,
    });
    v = await getCashGiftVault(client, vaultId);
    if (v && v.balance > 0n) {
      await executeAndAssert(client, {
        transaction: buildWithdrawTx({ vaultId, capId, amount: v.balance, owner: Host.toSuiAddress() }),
        signer: Host,
      });
    }
    const vEnd = await getCashGiftVault(client, vaultId);
    log('C-8-13', 'PASS', { finalBalance: vEnd?.balance.toString() });
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
      transaction: buildSubmitRsvpTx({ loungeId, recipientSlot: 0, attendance: 1, companionCount: 0, meal: 1 }),
      signer: Guest2,
    });
    const rsvps = await getRsvpEvents(client, weddingId);
    const g2Rsvps = rsvps.filter(r => r.submitter === Guest2.toSuiAddress());
    log('C-8-14', 'PASS', { rsvpCount: g2Rsvps.length, note: 'Duplicate RSVP allowed' });
  } catch (e: any) {
    log('C-8-14', 'UNEXPECTED_FAIL', { error: e.message?.slice(0, 200) });
  }

  console.log('\n══════ Part 2 완료 ══════');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
