/**
 * dibang 샵 Payment Kit PaymentRegistry 1회 생성(PK-7 선행).
 *
 * payment_kit::create_registry(namespace, "dibang-shop") → share(registry) + cap → 보유.
 * 이어서 set_config_registry_managed_funds(true) — 결제가 registry로 적립(treasury).
 * 결과 registryId·capId를 출력 → SDK config(constants)에 등록해 buildPurchaseItemTx가 사용.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/create-shop-registry.ts
 * (testnet faucet으로 자력 펀딩. 키는 scripts/.shop-admin-key에 보관 — 커밋 금지.)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, executeAndAssert } from '../src/index';

// Payment Kit testnet 내장 ID(@mysten/payment-kit constants).
const PK_PKG = '0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497';
const PK_NAMESPACE = '0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db';
const REGISTRY_NAME = 'dibang-shop';

const here = dirname(fileURLToPath(import.meta.url));
const client = createJsonRpcClient('testnet');

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
  console.log('admin:', addr);
  await faucet(addr);
  console.log('balance:', (await bal(addr)).toString());

  // 1) create_registry → share + cap 보유.
  const tx = new Transaction();
  const [registry, cap] = tx.moveCall({
    target: `${PK_PKG}::payment_kit::create_registry`,
    arguments: [tx.object(PK_NAMESPACE), tx.pure.string(REGISTRY_NAME)],
  });
  tx.moveCall({ target: `${PK_PKG}::payment_kit::share`, arguments: [registry] });
  tx.transferObjects([cap], addr);
  const res = await executeAndAssert(client, { transaction: tx, signer: admin });
  console.log('create digest:', res.digest);

  const reg = res.objectChanges?.find((o) => o.type === 'created' && o.objectType.includes('PaymentRegistry'));
  const capObj = res.objectChanges?.find((o) => o.type === 'created' && o.objectType.includes('RegistryAdminCap'));
  if (!reg || reg.type !== 'created' || !capObj || capObj.type !== 'created') {
    throw new Error('registry/cap 생성 확인 실패 — objectChanges 점검');
  }
  const registryId = reg.objectId;
  const capId = capObj.objectId;
  console.log('registryId:', registryId);
  console.log('capId:', capId);

  // 2) managed funds=true → 결제가 registry로 적립(treasury).
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PK_PKG}::payment_kit::set_config_registry_managed_funds`,
    arguments: [tx2.object(registryId), tx2.object(capId), tx2.pure.bool(true)],
  });
  const res2 = await executeAndAssert(client, { transaction: tx2, signer: admin });
  console.log('config digest:', res2.digest);

  console.log('\n=== dibang 샵 registry 준비 완료 ===');
  console.log('PAYMENT_REGISTRY_ID =', registryId);
  console.log('REGISTRY_ADMIN_CAP_ID =', capId);
  console.log('PAYMENT_KIT_PACKAGE =', PK_PKG);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
