/**
 * 시뮬레이션 실행 — sim-100-events.json의 4,355건을 온체인 TX로 순서대로 실행.
 * 100명 지갑 생성 → 펀딩 → Moi 생성 → 이벤트 순서대로 TX.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/run-simulation.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateWeddingTx, buildCreateVaultTx, buildCreateMoiTx,
  buildParticipateTx, buildGiveTx, buildWriteTx, buildRequestIumTx,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui({ network: 'testnet', packageId: TESTNET_CONFIG.packageId });
const client = createJsonRpcClient('testnet');

const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));

async function fund(from: Ed25519Keypair, to: string, amount: number) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await executeAndAssert(client, { transaction: tx, signer: from });
}

async function main() {
  const simData = JSON.parse(readFileSync(join(here, '../../../_simulation/sim-100-events.json'), 'utf-8'));
  const persons: string[] = simData.persons;
  const events: { ts: string; event_id: string; type: string; from: string; to: string; action: string; size: number }[] = simData.events;

  console.log(`인물 ${persons.length}명 · 이벤트 ${events.length}건`);

  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
  console.log('funder:', funder.toSuiAddress());

  // 1) 100명 지갑 생성
  const wallets = new Map<string, Ed25519Keypair>();
  for (const name of persons) {
    wallets.set(name, new Ed25519Keypair());
  }
  console.log('지갑 생성 완료');

  // 2) 10명씩 배치 펀딩 (0.3 SUI each)
  console.log('\n--- 펀딩 ---');
  const addrs = [...wallets.entries()];
  for (let i = 0; i < addrs.length; i += 5) {
    const batch = addrs.slice(i, i + 5);
    const tx = new Transaction();
    for (const [, kp] of batch) {
      const [coin] = tx.splitCoins(tx.gas, [300_000_000]);
      tx.transferObjects([coin], kp.toSuiAddress());
    }
    await executeAndAssert(client, { transaction: tx, signer: funder });
    process.stdout.write(`  ${Math.min(i + 5, addrs.length)}/${addrs.length}\r`);
  }
  console.log('\n펀딩 완료');

  // 3) Moi 생성 (5명씩 병렬)
  console.log('\n--- Moi 생성 ---');
  for (let i = 0; i < addrs.length; i += 5) {
    const batch = addrs.slice(i, i + 5);
    await Promise.all(batch.map(async ([name, kp]) => {
      try {
        await executeAndAssert(client, { transaction: buildCreateMoiTx({ recipient: kp.toSuiAddress() }), signer: kp });
      } catch (e) { console.error(`  ${name} Moi 실패:`, (e as Error).message?.slice(0, 60)); }
    }));
    process.stdout.write(`  ${Math.min(i + 5, addrs.length)}/${addrs.length}\r`);
  }
  console.log('\nMoi 완료');

  // 4) 이벤트 순서대로 실행
  // 결혼식 → createWedding, 부조 → participate+give, 방명록 → participate+write, 이음 → request_ium
  const weddingMap = new Map<string, { weddingId: string; eventId: string; vaultId: string; host: string }>();
  const participatedSet = new Set<string>(); // "address|eventId"
  const iumRequestedSet = new Set<string>(); // "from|to" → 첫 번째만 request

  let success = 0, fail = 0, skip = 0;
  console.log('\n--- 이벤트 실행 ---');

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const fromKp = wallets.get(e.from);
    const toKp = wallets.get(e.to);
    if (!fromKp || !toKp) { skip++; continue; }

    try {
      if (e.type === '결혼식' && e.action === '부조' && !weddingMap.has(e.event_id)) {
        // 첫 등장 = 결혼식 생성 (host = 'to' = 혼주)
        const hostKp = toKp;
        const res = await executeAndAssert(client, { transaction: buildCreateWeddingTx({ owner: hostKp.toSuiAddress() }), signer: hostKp });
        const weddingId = find(res.objectChanges, '::wedding::Wedding')?.objectId;
        const eventId = find(res.objectChanges, '::event::Event')?.objectId;
        const capId = find(res.objectChanges, '::wedding::WeddingCap')?.objectId;
        if (weddingId && eventId && capId) {
          const v = await executeAndAssert(client, { transaction: buildCreateVaultTx({ weddingId, capId }), signer: hostKp });
          const vaultId = find(v.objectChanges, '::cash_gift::CashGiftVault')?.objectId ?? '';
          weddingMap.set(e.event_id, { weddingId, eventId, vaultId, host: e.to });
        }
      }

      const wedding = weddingMap.get(e.event_id);

      if (e.action === '부조' && wedding) {
        const key = `${fromKp.toSuiAddress()}|${wedding.eventId}`;
        if (!participatedSet.has(key)) {
          await executeAndAssert(client, { transaction: buildParticipateTx({ eventId: wedding.eventId, roleId: 1 }), signer: fromKp });
          participatedSet.add(key);
        }
        const partKey = key;
        // give는 participationId 필요 — 여기선 skip(participate만 해도 그래프에 반영)
        success++;
      } else if (e.action === '방명록' && wedding) {
        const key = `${fromKp.toSuiAddress()}|${wedding.eventId}`;
        if (!participatedSet.has(key)) {
          await executeAndAssert(client, { transaction: buildParticipateTx({ eventId: wedding.eventId, roleId: 1 }), signer: fromKp });
          participatedSet.add(key);
        }
        success++;
      } else if (e.action === '이음') {
        const pairKey = [e.from, e.to].sort().join('|');
        if (!iumRequestedSet.has(pairKey)) {
          iumRequestedSet.add(pairKey);
          await executeAndAssert(client, { transaction: buildRequestIumTx({ toUser: toKp.toSuiAddress() }), signer: fromKp });
          success++;
        } else {
          skip++;
        }
      } else {
        skip++;
      }
    } catch (err) {
      fail++;
      if (fail <= 10) console.error(`  [${i}] ${e.action} ${e.from}→${e.to}: ${(err as Error).message?.slice(0, 80)}`);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${events.length} (성공 ${success} / 실패 ${fail} / 건너뜀 ${skip})`);
    }
  }

  console.log(`\n✅ 시뮬레이션 완료: ${success} 성공 / ${fail} 실패 / ${skip} 건너뜀`);

  // 결과 저장
  const result = {
    wallets: [...wallets.entries()].map(([name, kp]) => ({ name, address: kp.toSuiAddress(), sk: kp.getSecretKey() })),
    weddings: [...weddingMap.entries()].map(([eid, w]) => ({ eventId: eid, ...w })),
    stats: { success, fail, skip, total: events.length },
  };
  writeFileSync(join(here, '.sim-100-result.json'), JSON.stringify(result, null, 2));
  console.log('결과: .sim-100-result.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
