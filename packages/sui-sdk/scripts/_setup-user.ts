/**
 * 사용자 지갑 초기 설정 — 충전 + Moi 생성.
 * 사용법: pnpm --filter @gorae/sui-sdk exec tsx scripts/_setup-user.ts
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateMoiTx, getOwnedMoiIds,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const USER_ADDRESS = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';
const FUND_AMOUNT = 500_000_000; // 0.5 SUI

async function main() {
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
  console.log('funder:', funder.toSuiAddress());

  // 1) 잔액 확인
  const bal = await client.getBalance({ owner: USER_ADDRESS });
  console.log('사용자 잔액:', (Number(bal.totalBalance) / 1e9).toFixed(3), 'SUI');

  // 2) 충전 (잔액이 0.3 SUI 미만이면)
  if (BigInt(bal.totalBalance) < 300_000_000n) {
    console.log('충전 중...');
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [FUND_AMOUNT]);
    tx.transferObjects([coin], USER_ADDRESS);
    await executeAndAssert(client, { transaction: tx, signer: funder });
    const newBal = await client.getBalance({ owner: USER_ADDRESS });
    console.log('충전 후 잔액:', (Number(newBal.totalBalance) / 1e9).toFixed(3), 'SUI');
  } else {
    console.log('충전 불필요 (0.3 SUI 이상)');
  }

  // 3) Moi 확인/생성
  const mois = await getOwnedMoiIds(client, USER_ADDRESS);
  if (mois.length > 0) {
    console.log('Moi 이미 존재:', mois[0]);
  } else {
    console.log('Moi 생성 중...');
    const res = await executeAndAssert(client, { transaction: buildCreateMoiTx({ recipient: USER_ADDRESS }), signer: funder });
    console.log('Moi 생성 완료:', res.digest);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
