/**
 * E2E 기본 세팅 — 5개 지갑 로드 → 각각 Moi 생성
 * 결과를 e2e-base-setup.json에 저장
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateMoiTx, getOwnedMoiIds,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const WALLET_FILE = join(here, '../../../_e2e/2026-06-22-results/e2e-wallets.json');
const SETUP_FILE = join(here, '../../../_e2e/2026-06-22-results/e2e-base-setup.json');

const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));

async function main() {
  const walletData = JSON.parse(readFileSync(WALLET_FILE, 'utf-8'));
  const wallets = walletData.wallets.map((w: any) => ({
    name: w.name,
    address: w.address,
    kp: Ed25519Keypair.fromSecretKey(w.sk),
  }));

  console.log('=== E2E 기본 세팅 ===\n');
  for (const w of wallets) {
    console.log(`${w.name}: ${w.address}`);
  }

  const results: Record<string, any> = {};

  // 각 지갑에 Moi 생성 (이미 있으면 스킵)
  console.log('\n--- Moi 생성 ---');
  for (const w of wallets) {
    const existing = await getOwnedMoiIds(client, w.address);
    if (existing.length > 0) {
      console.log(`  ${w.name}: Moi 이미 있음 (${existing[0]})`);
      results[w.name] = { address: w.address, moiId: existing[0], skipped: true };
      continue;
    }

    try {
      const res = await executeAndAssert(client, {
        transaction: buildCreateMoiTx({ recipient: w.address }),
        signer: w.kp,
      });
      const moiId = find(res.objectChanges, '::moi::Moi')?.objectId;
      console.log(`  ${w.name}: Moi 생성 완료 → ${moiId}`);
      results[w.name] = { address: w.address, moiId, digest: res.digest };
    } catch (e: any) {
      console.log(`  ${w.name}: Moi 생성 실패 — ${e.message}`);
      results[w.name] = { address: w.address, moiId: null, error: e.message };
    }
  }

  // 결과 저장
  const setupData = {
    createdAt: new Date().toISOString(),
    wallets: results,
  };
  writeFileSync(SETUP_FILE, JSON.stringify(setupData, null, 2));
  console.log(`\n결과 저장: ${SETUP_FILE}`);

  // 검증
  console.log('\n--- 검증 ---');
  for (const w of wallets) {
    const mois = await getOwnedMoiIds(client, w.address);
    console.log(`  ${w.name}: Moi ${mois.length}개 — ${mois[0] || '없음'}`);
  }

  console.log('\n=== 기본 세팅 완료 ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
