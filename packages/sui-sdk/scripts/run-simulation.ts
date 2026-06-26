/**
 * 시뮬레이션 실행 — sim-100-events.json의 4,355건을 온체인 TX로 순서대로 실행.
 * 100명 지갑 재사용(.sim-100-result.json) 또는 신규 생성 → Moi 생성 → 이벤트 순서대로 TX.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/run-simulation.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateWeddingTx, buildCreateVaultTx, buildCreateMoiTx,
  buildParticipateTx, buildGiveTx, buildWriteTx, buildRequestIumTx,
  buildAcceptIumTx, buildInviteTx,
  getParticipationForEvent, getWedding, getOwnedIumRequests,
  requireMatrixId,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));

async function fund(from: Ed25519Keypair, to: string, amount: number) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await executeAndAssert(client, { transaction: tx, signer: from });
}

async function ensureParticipation(address: string, eventId: string, signer: Ed25519Keypair): Promise<string | null> {
  let part = await getParticipationForEvent(client, address, eventId);
  if (part) return part.id;
  await executeAndAssert(client, { transaction: buildParticipateTx({ eventId, roleId: 1 }), signer });
  part = await getParticipationForEvent(client, address, eventId);
  return part?.id ?? null;
}

async function main() {
  const simData = JSON.parse(readFileSync(join(here, '../../../_simulation/sim-100-events.json'), 'utf-8'));
  const persons: string[] = simData.persons;
  const events: { ts: string; event_id: string; type: string; from: string; to: string; action: string; size: number }[] = simData.events;

  console.log(`인물 ${persons.length}명 · 이벤트 ${events.length}건`);
  console.log(`packageId: ${TESTNET_CONFIG.packageId}`);

  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
  console.log('funder:', funder.toSuiAddress());

  // 1) 기존 지갑 재사용 또는 새로 생성
  const wallets = new Map<string, Ed25519Keypair>();
  const prevResultPath = join(here, '.sim-100-result.json');
  if (existsSync(prevResultPath)) {
    const prev = JSON.parse(readFileSync(prevResultPath, 'utf-8'));
    const prevWallets: Record<string, {name: string; address: string; sk: string}> = prev.wallets;
    for (const [key, w] of Object.entries(prevWallets)) {
      wallets.set(w.name, Ed25519Keypair.fromSecretKey(w.sk));
    }
    console.log(`기존 지갑 ${wallets.size}개 로드`);
  } else {
    for (const name of persons) wallets.set(name, new Ed25519Keypair());
    console.log('새 지갑 생성');
    // 펀딩
    const addrs = [...wallets.entries()];
    for (let i = 0; i < addrs.length; i += 5) {
      const batch = addrs.slice(i, i + 5);
      const tx = new Transaction();
      for (const [, kp] of batch) {
        const [coin] = tx.splitCoins(tx.gas, [300_000_000]);
        tx.transferObjects([coin], kp.toSuiAddress());
      }
      await executeAndAssert(client, { transaction: tx, signer: funder });
    }
    console.log('펀딩 완료');
  }

  // 2) Moi 생성 (없는 것만)
  console.log('\n--- Moi 생성 ---');
  const addrs = [...wallets.entries()];
  for (let i = 0; i < addrs.length; i += 5) {
    const batch = addrs.slice(i, i + 5);
    await Promise.all(batch.map(async ([name, kp]) => {
      try {
        await executeAndAssert(client, { transaction: buildCreateMoiTx({ recipient: kp.toSuiAddress() }), signer: kp });
      } catch { /* 이미 있으면 무시 */ }
    }));
    process.stdout.write(`  ${Math.min(i + 5, addrs.length)}/${addrs.length}\r`);
  }
  console.log('\nMoi 완료');

  // 3) 이벤트 순서대로 실행
  const weddingMap = new Map<string, { weddingId: string; eventId: string; vaultId: string; host: string; capId: string; hostPartId: string }>();
  const participatedSet = new Set<string>();
  const iumRequestedSet = new Set<string>();

  let success = 0, fail = 0, skip = 0;
  console.log('\n--- 이벤트 실행 ---');

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const fromKp = wallets.get(e.from);
    const toKp = wallets.get(e.to);
    if (!fromKp || !toKp) { skip++; continue; }

    try {
      // 결혼식 첫 등장 → createWedding + createVault
      if (e.type === '결혼식' && !weddingMap.has(e.event_id)) {
        const hostKp = toKp;
        const res = await executeAndAssert(client, { transaction: buildCreateWeddingTx({ owner: hostKp.toSuiAddress() }), signer: hostKp });
        const weddingId = find(res.objectChanges, '::wedding::Wedding')?.objectId;
        const eventId = find(res.objectChanges, '::event::Event')?.objectId;
        const capId = find(res.objectChanges, '::wedding::WeddingCap')?.objectId;
        if (weddingId && eventId && capId) {
          const v = await executeAndAssert(client, { transaction: buildCreateVaultTx({ weddingId, capId }), signer: hostKp });
          const vaultId = find(v.objectChanges, '::cash_gift::CashGiftVault')?.objectId ?? '';
          const hostPart = await getParticipationForEvent(client, hostKp.toSuiAddress(), eventId);
          weddingMap.set(e.event_id, { weddingId, eventId, vaultId, host: e.to, capId, hostPartId: hostPart?.id ?? '' });
          participatedSet.add(`${hostKp.toSuiAddress()}|${eventId}`);
        }
      }

      const wedding = weddingMap.get(e.event_id);

      if (e.action === '부조' && wedding && wedding.vaultId) {
        const partId = await ensureParticipation(fromKp.toSuiAddress(), wedding.eventId, fromKp);
        participatedSet.add(`${fromKp.toSuiAddress()}|${wedding.eventId}`);
        if (partId) {
          const amount = BigInt(Math.max(1, Math.floor(e.size))) * 1_000_000n;
          await executeAndAssert(client, { transaction: buildGiveTx({ vaultId: wedding.vaultId, weddingId: wedding.weddingId, participationId: partId, amount }), signer: fromKp });
          success++;
        } else skip++;

      } else if (e.action === '방명록' && wedding) {
        const partId = await ensureParticipation(fromKp.toSuiAddress(), wedding.eventId, fromKp);
        participatedSet.add(`${fromKp.toSuiAddress()}|${wedding.eventId}`);
        if (partId) {
          await executeAndAssert(client, { transaction: buildWriteTx({ weddingId: wedding.weddingId, participationId: partId }), signer: fromKp });
          success++;
        } else skip++;

      } else if (e.action === '이음') {
        const pairKey = [e.from, e.to].sort().join('|');
        if (!iumRequestedSet.has(pairKey)) {
          iumRequestedSet.add(pairKey);
          await executeAndAssert(client, { transaction: buildRequestIumTx({ toUser: toKp.toSuiAddress() }), signer: fromKp });
          success++;
        } else skip++;

      } else if (e.action === '이음승급') {
        // accept_ium — 수신자(to)가 받은 IumRequest 중 from의 것을 찾아 수락
        try {
          const requests = await getOwnedIumRequests(client, toKp.toSuiAddress());
          const req = requests.find(r => r.initiator === fromKp.toSuiAddress());
          if (req) {
            await executeAndAssert(client, { transaction: buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId }), signer: toKp });
            success++;
          } else skip++;
        } catch { skip++; }

      } else if (e.action === '답례' && wedding && wedding.vaultId) {
        // 답례 = 역방향 부조 (host→guest). host participate는 이미 완료.
        const hostKp = wallets.get(wedding.host);
        if (hostKp && wedding.hostPartId) {
          const amount = BigInt(Math.floor(e.size)) * 1_000_000n;
          try {
            await executeAndAssert(client, { transaction: buildGiveTx({ vaultId: wedding.vaultId, weddingId: wedding.weddingId, participationId: wedding.hostPartId, amount }), signer: hostKp });
            success++;
          } catch { skip++; }
        } else skip++;

      } else {
        skip++;
      }
    } catch (err) {
      fail++;
      if (fail <= 20) console.error(`  [${i}] ${e.action} ${e.from}→${e.to}: ${(err as Error).message?.slice(0, 80)}`);
    }

    if ((i + 1) % 200 === 0) {
      console.log(`  ${i + 1}/${events.length} (성공 ${success} / 실패 ${fail} / 건너뜀 ${skip})`);
    }
  }

  console.log(`\n✅ 시뮬레이션 완료: ${success} 성공 / ${fail} 실패 / ${skip} 건너뜀`);

  // 결과 저장
  const walletResult: Record<string, {name: string; address: string; sk: string}> = {};
  for (const [name, kp] of wallets) {
    walletResult[name] = { name, address: kp.toSuiAddress(), sk: kp.getSecretKey() };
  }
  const result = {
    wallets: walletResult,
    weddings: Object.fromEntries(weddingMap),
    stats: { success, fail, skip, total: events.length },
    packageId: TESTNET_CONFIG.packageId,
  };
  writeFileSync(join(here, '.sim-100-result.json'), JSON.stringify(result, null, 2));
  console.log('결과: .sim-100-result.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
