/**
 * E2E 시드 데이터 생성 — 지갑 5개 + 결혼식 2개 + 참석 + 부조 + 방명록 + 이음 신청.
 * testnet에서 SDK 빌더 + executeAndAssert로 실행.
 */
import { writeFileSync } from 'node:fs';
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
  // 0) 자금 지갑(shop-admin-key 재사용)
  const { readFileSync, existsSync } = await import('node:fs');
  const keyPath = join(here, '.shop-admin-key');
  if (!existsSync(keyPath)) throw new Error('.shop-admin-key 없음');
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(keyPath, 'utf-8').trim());
  console.log('funder:', funder.toSuiAddress());

  // 1) 지갑 5개 생성 + 펀딩
  const wallets: Ed25519Keypair[] = [];
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  for (let i = 0; i < 5; i++) {
    const kp = new Ed25519Keypair();
    wallets.push(kp);
    console.log(`${names[i]}: ${kp.toSuiAddress()}`);
  }

  console.log('\n--- 펀딩 ---');
  for (let i = 0; i < 5; i++) {
    await fund(funder, wallets[i].toSuiAddress(), 50_000_000); // 0.05 SUI each
    console.log(`  ${names[i]} 펀딩 완료`);
  }

  // 2) 각자 Moi 생성
  console.log('\n--- Moi 생성 ---');
  for (let i = 0; i < 5; i++) {
    const res = await executeAndAssert(client, {
      transaction: buildCreateMoiTx({ recipient: wallets[i].toSuiAddress() }),
      signer: wallets[i],
    });
    console.log(`  ${names[i]} Moi: ${res.digest}`);
  }

  // 3) Alice 결혼식 생성
  console.log('\n--- Alice 결혼식 ---');
  const w1 = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: wallets[0].toSuiAddress() }),
    signer: wallets[0],
  });
  const wedding1Id = find(w1.objectChanges, '::wedding::Wedding')?.objectId;
  const event1Id = find(w1.objectChanges, '::event::Event')?.objectId;
  const cap1Id = find(w1.objectChanges, '::wedding::WeddingCap')?.objectId;
  console.log(`  weddingId: ${wedding1Id} | eventId: ${event1Id}`);

  // 4) Alice vault 생성
  const v1 = await executeAndAssert(client, {
    transaction: buildCreateVaultTx({ weddingId: wedding1Id!, capId: cap1Id! }),
    signer: wallets[0],
  });
  const vault1Id = find(v1.objectChanges, '::cash_gift::CashGiftVault')?.objectId;
  console.log(`  vaultId: ${vault1Id}`);

  // 5) Bob 결혼식 생성
  console.log('\n--- Bob 결혼식 ---');
  const w2 = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: wallets[1].toSuiAddress() }),
    signer: wallets[1],
  });
  const wedding2Id = find(w2.objectChanges, '::wedding::Wedding')?.objectId;
  const event2Id = find(w2.objectChanges, '::event::Event')?.objectId;
  const cap2Id = find(w2.objectChanges, '::wedding::WeddingCap')?.objectId;
  console.log(`  weddingId: ${wedding2Id} | eventId: ${event2Id}`);

  const v2 = await executeAndAssert(client, {
    transaction: buildCreateVaultTx({ weddingId: wedding2Id!, capId: cap2Id! }),
    signer: wallets[1],
  });
  const vault2Id = find(v2.objectChanges, '::cash_gift::CashGiftVault')?.objectId;
  console.log(`  vaultId: ${vault2Id}`);

  // 6) Carol·Dave·Eve → Alice 결혼식 참석(GUEST=1)
  console.log('\n--- Alice 결혼식 참석 ---');
  const guestParts1: Record<string, string> = {};
  for (const i of [2, 3, 4]) {
    const res = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: event1Id!, roleId: 1 }),
      signer: wallets[i],
    });
    const partId = find(res.objectChanges, '::event::Participation')?.objectId;
    guestParts1[names[i]] = partId!;
    console.log(`  ${names[i]} participated: ${partId}`);
  }

  // 7) Carol·Dave → Bob 결혼식도 참석(Carol·Dave는 양쪽 결혼식에 공통 참가)
  console.log('\n--- Bob 결혼식 참석 ---');
  const guestParts2: Record<string, string> = {};
  for (const i of [2, 3]) {
    const res = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: event2Id!, roleId: 1 }),
      signer: wallets[i],
    });
    const partId = find(res.objectChanges, '::event::Participation')?.objectId;
    guestParts2[names[i]] = partId!;
    console.log(`  ${names[i]} participated: ${partId}`);
  }

  // 8) Carol → Alice 결혼식에 부조
  console.log('\n--- 부조 ---');
  const giveRes = await executeAndAssert(client, {
    transaction: buildGiveTx({
      vaultId: vault1Id!, weddingId: wedding1Id!,
      participationId: guestParts1['Carol']!, amount: 1_000_000n,
    }),
    signer: wallets[2],
  });
  console.log(`  Carol → Alice 부조: ${giveRes.digest}`);

  // 9) Dave → Alice 결혼식에 방명록
  console.log('\n--- 방명록 ---');
  const writeRes = await executeAndAssert(client, {
    transaction: buildWriteTx({ weddingId: wedding1Id!, participationId: guestParts1['Dave']! }),
    signer: wallets[3],
  });
  console.log(`  Dave → Alice 방명록: ${writeRes.digest}`);

  // 10) Eve → Carol에게 이음 신청
  console.log('\n--- 이음 신청 ---');
  const iumRes = await executeAndAssert(client, {
    transaction: buildRequestIumTx({ toUser: wallets[2].toSuiAddress() }),
    signer: wallets[4],
  });
  console.log(`  Eve → Carol 이음: ${iumRes.digest}`);

  // 시드 데이터 요약 저장
  const summary = {
    wallets: wallets.map((w, i) => ({ name: names[i], address: w.toSuiAddress(), sk: w.getSecretKey() })),
    weddings: [
      { host: 'Alice', weddingId: wedding1Id, eventId: event1Id, vaultId: vault1Id },
      { host: 'Bob', weddingId: wedding2Id, eventId: event2Id, vaultId: vault2Id },
    ],
    participations: { wedding1: guestParts1, wedding2: guestParts2 },
  };
  writeFileSync(join(here, '.seed-e2e.json'), JSON.stringify(summary, null, 2));
  console.log('\n✅ 시드 데이터 생성 완료 → .seed-e2e.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
