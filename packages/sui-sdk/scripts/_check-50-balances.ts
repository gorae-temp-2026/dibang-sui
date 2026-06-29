import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createJsonRpcClient, configureSui } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const first50 = wallets.slice(0, 50);

const FUNDER_SK = 'suiprivkey1qqrc2pqz7pu2m848n2uh2vtl62hu50jkczuxkh7rcfrs6n8lp06zqtg9er8';
const MIN_BALANCE = 1_000_000_000n; // 1 SUI
const TOP_UP = 1_500_000_000n; // 1.5 SUI

async function main() {
  const needFund: { name: string; address: string; bal: bigint }[] = [];

  for (let i = 0; i < first50.length; i += 10) {
    const batch = first50.slice(i, i + 10);
    const results = await Promise.all(
      batch.map((w) =>
        client.getBalance({ owner: w.address }).then((b) => ({
          name: w.name,
          address: w.address,
          bal: BigInt(b.totalBalance),
        }))
      )
    );
    for (const r of results) {
      if (r.bal < MIN_BALANCE) needFund.push(r);
    }
  }

  console.log(`50개 지갑 중 충전 필요: ${needFund.length}개 (< 1 SUI)`);

  if (needFund.length === 0) {
    console.log('모든 지갑 1 SUI 이상 보유. 충전 불필요.');
    return;
  }

  const funder = Ed25519Keypair.fromSecretKey(FUNDER_SK);
  const funderBal = await client.getBalance({ owner: funder.toSuiAddress() });
  console.log(`자금지갑 잔액: ${(Number(funderBal.totalBalance) / 1e9).toFixed(3)} SUI`);

  // 10개씩 배치로 충전
  for (let i = 0; i < needFund.length; i += 10) {
    const batch = needFund.slice(i, i + 10);
    const tx = new Transaction();
    for (const w of batch) {
      const amount = TOP_UP - w.bal;
      if (amount > 0) {
        const [coin] = tx.splitCoins(tx.gas, [Number(amount)]);
        tx.transferObjects([coin], w.address);
      }
    }
    const res = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: funder,
      options: { showEffects: true },
    });
    console.log(`  배치 ${Math.floor(i / 10) + 1}: ${batch.map((w) => w.name).join(', ')} → ${res.digest}`);
  }

  console.log('충전 완료.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
