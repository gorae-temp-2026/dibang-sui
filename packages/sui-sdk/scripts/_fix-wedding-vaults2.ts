import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, getWedding, getWeddingCapForWedding, buildCreateVaultTx } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const hosts = wallets.slice(0, 10);

// Lounge ID → 온체인 조회로 확인한 진짜 Wedding ID
const loungeToWedding: Record<string, string> = {
  '0x6be2160acafe1f5a1bf3aa94f2b64e81ac84813899ae4744276916c4cdc19192': '', // W1 — 조회 필요
  '0x86e3cd8d55d95a9c8e57a21f19c95e9d41653dedf5ed0378f1f43b7fa31254db': '', // W2
  '0x348da6fcd951ced425dc5799fcd53b806311a536df09918113c7d0d3bb52027e': '', // W3
  '0x0c4e4338c1c6dfe27e635e5404f14b88b9e912f37d2f1ef30ca512edb9627c90': '', // W4
  '0x306ac559044e02847f106f1ab8d37172492e1cf5835dccd60c8b5c0d462ea1cc': '', // W6
  '0x318825b7116600742dc27693a4b9d46d89e65931b52494b3df54b8e57a93f700': '', // W7
  '0x2ec965279b3c2666f38db78b081ef0b305c5691f401cae6bf14b59c3742562fe': '', // W9
  '0x029332b847d8377623d8bdd26b06a6d1e890ee1919128b6f284a41ee7c4ea3b4': '', // W10
};

// W5, W8은 이미 Wedding ID로 잡힌 것들
const directWeddings = [
  { idx: 4, weddingId: '0x43d1df9c49227a75196c84508be43d35af5a9c6387ed49f7dc661ff4052b0a83' },
  { idx: 7, weddingId: '0x7f94cf919125038b4b3815fefdae084e5158e620f511fe8658c80cecb73f0062' },
];

async function main() {
  // Step 1: Lounge → Wedding ID 조회
  for (const loungeId of Object.keys(loungeToWedding)) {
    const obj = await client.getObject({ id: loungeId, options: { showContent: true } });
    const fields = (obj.data?.content as any)?.fields;
    loungeToWedding[loungeId] = fields?.wedding_id ?? '';
  }

  // Step 2: 10개 결혼식 매핑 구성
  const rawIds = [
    '0x6be2160acafe1f5a1bf3aa94f2b64e81ac84813899ae4744276916c4cdc19192',
    '0x86e3cd8d55d95a9c8e57a21f19c95e9d41653dedf5ed0378f1f43b7fa31254db',
    '0x348da6fcd951ced425dc5799fcd53b806311a536df09918113c7d0d3bb52027e',
    '0x0c4e4338c1c6dfe27e635e5404f14b88b9e912f37d2f1ef30ca512edb9627c90',
    '0x43d1df9c49227a75196c84508be43d35af5a9c6387ed49f7dc661ff4052b0a83',
    '0x306ac559044e02847f106f1ab8d37172492e1cf5835dccd60c8b5c0d462ea1cc',
    '0x318825b7116600742dc27693a4b9d46d89e65931b52494b3df54b8e57a93f700',
    '0x7f94cf919125038b4b3815fefdae084e5158e620f511fe8658c80cecb73f0062',
    '0x2ec965279b3c2666f38db78b081ef0b305c5691f401cae6bf14b59c3742562fe',
    '0x029332b847d8377623d8bdd26b06a6d1e890ee1919128b6f284a41ee7c4ea3b4',
  ];

  const result: { name: string; weddingId: string; eventId: string; loungeId: string; vaultId: string }[] = [];

  for (let i = 0; i < 10; i++) {
    const host = hosts[i];
    const kp = Ed25519Keypair.fromSecretKey(host.sk);
    const isDirectWedding = directWeddings.find(d => d.idx === i);
    const weddingId = isDirectWedding ? isDirectWedding.weddingId : (loungeToWedding[rawIds[i]] || rawIds[i]);
    const loungeId = isDirectWedding ? '' : rawIds[i];

    const wedding = await getWedding(client, weddingId);
    const eventId = wedding?.eventId ?? '';

    console.log(`W${i+1} ${host.name}: wedding=${weddingId.slice(0,15)}... event=${eventId.slice(0,15) || 'EMPTY'}...`);

    // Vault 확인
    if (wedding?.vaultId) {
      console.log(`  Vault exists: ${wedding.vaultId.slice(0,15)}...`);
      result.push({ name: host.name, weddingId, eventId, loungeId, vaultId: wedding.vaultId });
      continue;
    }

    // Cap 찾기 + Vault 생성
    const capId = await getWeddingCapForWedding(client, kp.toSuiAddress(), weddingId);
    if (!capId) {
      console.log(`  Cap not found — skip vault`);
      result.push({ name: host.name, weddingId, eventId, loungeId, vaultId: '' });
      continue;
    }
    console.log(`  Cap: ${capId.slice(0,15)}...`);

    try {
      const tx = buildCreateVaultTx({ weddingId, capId });
      const res = await executeAndAssert(client, { transaction: tx, signer: kp });
      const created = res.objectChanges?.filter((c: any) => c.type === 'created') ?? [];
      const vault = created.find((c: any) => c.objectType?.includes('CashGiftVault'));
      console.log(`  Vault created: ${vault?.objectId?.slice(0,15)}...`);
      result.push({ name: host.name, weddingId, eventId, loungeId, vaultId: vault?.objectId ?? '' });
    } catch (e) {
      console.error(`  Vault failed: ${(e as Error).message?.slice(0,80)}`);
      result.push({ name: host.name, weddingId, eventId, loungeId, vaultId: '' });
    }
  }

  console.log('\n=== 최종 매핑 ===');
  console.log(JSON.stringify(result, null, 2));
  writeFileSync(join(here, '.e2e-weddings.json'), JSON.stringify(result, null, 2));
  console.log('저장: .e2e-weddings.json');
}

main().catch(e => { console.error(e); process.exit(1); });
