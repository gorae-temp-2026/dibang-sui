/**
 * trust_registry + 표준 매트릭스(EM-money, CS) 1회 부트스트랩(온체인 give/write/invite/gift 등의 선행).
 *
 * trust_registry::bootstrap() → TrustRegistry + EM/CS TrustMatrix 생성·공유. 이벤트(RegistryCreated, MatrixRegistered×2,
 * EM 먼저·CS 다음)에서 ID를 회수해 출력 → constants.ts(TESTNET_CONFIG)에 trustRegistryId·emMoneyMatrixId·csMatrixId 주입.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/bootstrap-trust.ts
 * (testnet faucet/자금지갑으로 펀딩. 키는 scripts/.shop-admin-key 재사용 — gitignore.)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { createJsonRpcClient, executeAndAssert, configureSui, buildBootstrapTrustTx } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
const client = createJsonRpcClient('testnet');
configureSui({ network: 'testnet', packageId: TESTNET_CONFIG.packageId });

function loadKey(name: string): Ed25519Keypair {
  const p = join(here, `.${name}-key`);
  if (existsSync(p)) return Ed25519Keypair.fromSecretKey(readFileSync(p, 'utf-8').trim());
  const kp = new Ed25519Keypair();
  writeFileSync(p, kp.getSecretKey(), 'utf-8');
  return kp;
}
async function bal(addr: string): Promise<bigint> {
  return BigInt((await client.getBalance({ owner: addr })).totalBalance);
}
async function faucet(addr: string) {
  if ((await bal(addr)) >= 200_000_000n) return;
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: addr });
  } catch (e) {
    console.error('faucet 실패(레이트리밋?):', (e as Error).message);
  }
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if ((await bal(addr)) >= 200_000_000n) return;
  }
}

async function main() {
  const admin = loadKey('shop-admin');
  const addr = admin.toSuiAddress();
  console.log('admin:', addr, '| package:', TESTNET_CONFIG.packageId);
  await faucet(addr);
  console.log('balance:', (await bal(addr)).toString());

  const res = await executeAndAssert(client, { transaction: buildBootstrapTrustTx(), signer: admin });
  console.log('bootstrap digest:', res.digest);

  // 이벤트에서 ID 회수(RegistryCreated, MatrixRegistered EM→CS 순).
  const txb = await client.getTransactionBlock({ digest: res.digest, options: { showEvents: true } });
  const events = txb.events ?? [];
  const reg = events.find((e) => e.type.endsWith('::RegistryCreated'));
  const matrixEvents = events.filter((e) => e.type.endsWith('::MatrixRegistered'));
  const registryId = (reg?.parsedJson as { registry_id?: string } | undefined)?.registry_id;
  const emMoneyMatrixId = (matrixEvents[0]?.parsedJson as { matrix_id?: string } | undefined)?.matrix_id;
  const csMatrixId = (matrixEvents[1]?.parsedJson as { matrix_id?: string } | undefined)?.matrix_id;
  if (!registryId || !emMoneyMatrixId || !csMatrixId) {
    throw new Error(`ID 회수 실패 — events=${JSON.stringify(events.map((e) => e.type))}`);
  }

  console.log('\n=== trust_matrix 부트스트랩 완료 — constants.ts(TESTNET_CONFIG)에 주입 ===');
  console.log('trustRegistryId =', registryId);
  console.log('emMoneyMatrixId =', emMoneyMatrixId);
  console.log('csMatrixId      =', csMatrixId);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
