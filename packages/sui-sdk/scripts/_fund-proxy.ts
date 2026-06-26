import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, executeAndAssert, configureSui } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

async function main() {
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const proxy = (data.wallets as Record<string, {address: string}>)['신솔현']!;

  console.log('funder 잔액:', (Number((await client.getBalance({ owner: funder.toSuiAddress() })).totalBalance) / 1e9).toFixed(3));

  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [3_000_000_000]);
  tx.transferObjects([coin], proxy.address);
  await executeAndAssert(client, { transaction: tx, signer: funder });

  const bal = await client.getBalance({ owner: proxy.address });
  console.log('대리 잔액:', (Number(bal.totalBalance) / 1e9).toFixed(3), 'SUI');
}
main();
