import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildCreateWeddingTx, buildCreateVaultTx, getWedding } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);

const hosts = wallets.slice(0, 10); // A1~A10

async function main() {
  const results: { name: string; weddingId: string; eventId: string; vaultId?: string }[] = [];

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    const kp = Ed25519Keypair.fromSecretKey(host.sk);
    console.log(`W${i + 1}: ${host.name} (${host.address.slice(0, 10)}...) 결혼식 생성...`);

    try {
      const tx = buildCreateWeddingTx({ owner: kp.toSuiAddress() });
      const res = await executeAndAssert(client, { transaction: tx, signer: kp });

      // 생성된 Wedding 오브젝트 ID 추출
      const created = res.objectChanges?.filter((c: any) => c.type === 'created') ?? [];
      const weddingObj = created.find((c: any) => c.objectType?.includes('::wedding::Wedding'));
      const capObj = created.find((c: any) => c.objectType?.includes('::wedding::WeddingCap'));

      if (weddingObj) {
        const wedding = await getWedding(client, weddingObj.objectId);
        console.log(`  Wedding: ${weddingObj.objectId.slice(0, 15)}...`);
        console.log(`  EventId: ${wedding?.eventId?.slice(0, 15)}...`);

        // Vault 생성
        if (capObj) {
          try {
            const vaultTx = buildCreateVaultTx({ weddingId: weddingObj.objectId, capId: capObj.objectId });
            const vaultRes = await executeAndAssert(client, { transaction: vaultTx, signer: kp });
            const vaultCreated = vaultRes.objectChanges?.filter((c: any) => c.type === 'created') ?? [];
            const vaultObj = vaultCreated.find((c: any) => c.objectType?.includes('::cash_gift::CashGiftVault'));
            console.log(`  Vault: ${vaultObj?.objectId?.slice(0, 15)}...`);
            results.push({ name: host.name, weddingId: weddingObj.objectId, eventId: wedding?.eventId ?? '', vaultId: vaultObj?.objectId });
          } catch (e) {
            console.error(`  Vault 생성 실패:`, (e as Error).message?.slice(0, 60));
            results.push({ name: host.name, weddingId: weddingObj.objectId, eventId: wedding?.eventId ?? '' });
          }
        }
      }
    } catch (e) {
      console.error(`  실패:`, (e as Error).message?.slice(0, 80));
    }
  }

  console.log('\n=== 결과 ===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
