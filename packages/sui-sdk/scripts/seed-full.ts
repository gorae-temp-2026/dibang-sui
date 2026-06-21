/**
 * 풀 시드 데이터 — 지갑 10개 + Moi 10개 + 결혼식 3개 + 참석 + 이음 신청.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateWeddingTx, buildCreateVaultTx, buildCreateMoiTx,
  buildParticipateTx, buildRequestIumTx,
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
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
  console.log('funder:', funder.toSuiAddress());

  // 1) 지갑 10개 생성
  const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'];
  const wallets: Ed25519Keypair[] = [];
  for (let i = 0; i < 10; i++) {
    const kp = new Ed25519Keypair();
    wallets.push(kp);
    console.log(`${names[i]}: ${kp.toSuiAddress()}`);
  }

  // 2) 펀딩 0.5 SUI 각각
  console.log('\n--- 펀딩 ---');
  for (let i = 0; i < 10; i++) {
    await fund(funder, wallets[i].toSuiAddress(), 500_000_000);
    console.log(`  ${names[i]} 펀딩 완료`);
  }

  // 3) Moi 생성
  console.log('\n--- Moi 생성 ---');
  for (let i = 0; i < 10; i++) {
    const res = await executeAndAssert(client, {
      transaction: buildCreateMoiTx({ recipient: wallets[i].toSuiAddress() }),
      signer: wallets[i],
    });
    console.log(`  ${names[i]} Moi: ${res.digest}`);
  }

  // 4) 결혼식 3개 (Alpha, Bravo, Charlie가 호스트)
  console.log('\n--- 결혼식 생성 ---');
  const weddings: { host: string; weddingId: string; eventId: string; capId: string; vaultId: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const w = await executeAndAssert(client, {
      transaction: buildCreateWeddingTx({ owner: wallets[i].toSuiAddress() }),
      signer: wallets[i],
    });
    const weddingId = find(w.objectChanges, '::wedding::Wedding')?.objectId;
    const eventId = find(w.objectChanges, '::event::Event')?.objectId;
    const capId = find(w.objectChanges, '::wedding::WeddingCap')?.objectId;
    console.log(`  ${names[i]} 결혼식: ${weddingId}`);

    const v = await executeAndAssert(client, {
      transaction: buildCreateVaultTx({ weddingId: weddingId!, capId: capId! }),
      signer: wallets[i],
    });
    const vaultId = find(v.objectChanges, '::cash_gift::CashGiftVault')?.objectId;
    console.log(`  vault: ${vaultId}`);
    weddings.push({ host: names[i], weddingId: weddingId!, eventId: eventId!, capId: capId!, vaultId: vaultId! });
  }

  // 5) 참석 — 다양한 조합
  // Alpha 결혼식: Delta, Echo, Foxtrot, Golf 참석
  // Bravo 결혼식: Delta, Echo, Hotel, India 참석 (Delta, Echo는 양쪽)
  // Charlie 결혼식: Foxtrot, Golf, Hotel, India, Juliet 참석
  console.log('\n--- 참석 ---');
  const participations: Record<string, Record<string, string>> = {};
  const attendMap: [number, number[]][] = [
    [0, [3, 4, 5, 6]],       // Alpha 결혼식 ← Delta, Echo, Foxtrot, Golf
    [1, [3, 4, 7, 8]],       // Bravo 결혼식 ← Delta, Echo, Hotel, India
    [2, [5, 6, 7, 8, 9]],    // Charlie 결혼식 ← Foxtrot, Golf, Hotel, India, Juliet
  ];
  for (const [wIdx, guestIdxs] of attendMap) {
    participations[names[wIdx]] = {};
    for (const gIdx of guestIdxs) {
      const res = await executeAndAssert(client, {
        transaction: buildParticipateTx({ eventId: weddings[wIdx].eventId, roleId: 1 }),
        signer: wallets[gIdx],
      });
      const partId = find(res.objectChanges, '::event::Participation')?.objectId;
      participations[names[wIdx]][names[gIdx]] = partId!;
      console.log(`  ${names[gIdx]} → ${names[wIdx]} 결혼식 참석`);
    }
  }

  // 6) 이음 신청 — 5쌍
  // Delta → Echo, Foxtrot → Golf, Hotel → India, Juliet → Delta, Echo → Hotel
  console.log('\n--- 이음 신청 ---');
  const iumPairs: [number, number][] = [[3, 4], [5, 6], [7, 8], [9, 3], [4, 7]];
  for (const [from, to] of iumPairs) {
    const res = await executeAndAssert(client, {
      transaction: buildRequestIumTx({ toUser: wallets[to].toSuiAddress() }),
      signer: wallets[from],
    });
    console.log(`  ${names[from]} → ${names[to]} 이음 신청: ${res.digest}`);
  }

  // 결과 저장
  const summary = {
    createdAt: new Date().toISOString(),
    wallets: wallets.map((w, i) => ({ name: names[i], address: w.toSuiAddress(), sk: w.getSecretKey() })),
    weddings,
    participations,
    iumPairs: iumPairs.map(([f, t]) => ({ from: names[f], to: names[t] })),
  };
  writeFileSync(join(here, '.seed-full.json'), JSON.stringify(summary, null, 2));
  console.log('\n✅ 풀 시드 데이터 생성 완료 → .seed-full.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
