import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, configureSui, executeAndAssert } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const funderSk = 'suiprivkey1qqrc2pqz7pu2m848n2uh2vtl62hu50jkczuxkh7rcfrs6n8lp06zqtg9er8';
const funder = Ed25519Keypair.fromSecretKey(funderSk);
const userAddr = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';

async function main() {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [500_000_000]);
  tx.transferObjects([coin], userAddr);
  const res = await executeAndAssert(client, { transaction: tx, signer: funder });
  console.log('충전 완료:', res.digest);
  const bal = await client.getBalance({ owner: userAddr });
  console.log('새 잔액:', (Number(bal.totalBalance) / 1e9).toFixed(3), 'SUI');
}
main();
