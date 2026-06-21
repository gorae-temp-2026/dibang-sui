/**
 * E2E 공용 지갑 5개 생성 + 0.5 SUI 충전 + 키 저장
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, executeAndAssert, configureSui } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const WALLET_FILE = join(here, '../../../_e2e/2026-06-22-results/e2e-wallets.json');
const FUND_EACH = 500_000_000; // 0.5 SUI
const NAMES = ['Wallet1', 'Wallet2', 'Wallet3', 'Wallet4', 'Wallet5'];

async function main() {
  const wallets = NAMES.map(name => {
    const kp = new Ed25519Keypair();
    return { name, address: kp.toSuiAddress(), sk: kp.getSecretKey(), kp };
  });

  console.log('=== E2E 공용 지갑 생성 ===\n');
  for (const w of wallets) {
    console.log(`${w.name}: ${w.address}`);
  }

  // sui cli로 전송 (test-sui-many에서)
  // 1 tx에 5개 전송
  const funderKey = readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim();
  const funder = Ed25519Keypair.fromSecretKey(funderKey);
  console.log(`\nFunder: ${funder.toSuiAddress()}`);

  const bal = await client.getBalance({ owner: funder.toSuiAddress(), coinType: '0x2::sui::SUI' });
  console.log(`Funder 잔액: ${Number(bal.totalBalance) / 1e9} SUI`);

  const needed = FUND_EACH * 5;
  if (BigInt(bal.totalBalance) < BigInt(needed + 50_000_000)) {
    console.log(`잔액 부족 (필요: ${needed / 1e9} SUI) — sui cli로 충전 필요`);
    console.log('sui cli 명령어:');
    console.log(`sui client switch --address test-sui-many`);
    for (const w of wallets) {
      console.log(`sui client transfer-sui --to ${w.address} --sui-coin-object-id <COIN_ID> --amount ${FUND_EACH} --gas-budget 10000000`);
    }

    // 키 정보는 일단 저장
    const data = {
      createdAt: new Date().toISOString(),
      funded: false,
      fundAmount: `${FUND_EACH} MIST (${FUND_EACH / 1e9} SUI)`,
      wallets: wallets.map(w => ({ name: w.name, address: w.address, sk: w.sk })),
    };
    writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2));
    console.log(`\n지갑 정보 저장: ${WALLET_FILE}`);
    return;
  }

  console.log(`\n--- 펀딩 (1 tx에 5개, 각 ${FUND_EACH / 1e9} SUI) ---`);
  const tx = new Transaction();
  for (const w of wallets) {
    const [coin] = tx.splitCoins(tx.gas, [FUND_EACH]);
    tx.transferObjects([coin], w.address);
  }
  const res = await executeAndAssert(client, { transaction: tx, signer: funder });
  console.log(`펀딩 완료: ${res.digest}`);

  const data = {
    createdAt: new Date().toISOString(),
    funded: true,
    fundAmount: `${FUND_EACH} MIST (${FUND_EACH / 1e9} SUI)`,
    fundDigest: res.digest,
    wallets: wallets.map(w => ({ name: w.name, address: w.address, sk: w.sk })),
  };
  writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2));
  console.log(`지갑 정보 저장: ${WALLET_FILE}`);

  // 검증
  for (const w of wallets) {
    const b = await client.getBalance({ owner: w.address, coinType: '0x2::sui::SUI' });
    console.log(`  ${w.name}: ${Number(b.totalBalance) / 1e9} SUI`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
