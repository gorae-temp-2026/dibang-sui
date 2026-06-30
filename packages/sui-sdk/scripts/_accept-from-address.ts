import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { createJsonRpcClient, configureSui, executeAndAssert, buildAcceptIumTx, getOwnedIumRequests } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);

const FROM = normalizeSuiAddress('0xd1fa1c7f7d06ad9d4129d063356fcf4afa88119c310c5f23b5cd70e276f9680b');

async function main() {
  console.log(`50개 계정에서 ${FROM.slice(0, 10)}… 로부터 온 이음 요청 검색 + 수락\n`);
  let found = 0, accepted = 0, failed = 0;

  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();

    const requests = await getOwnedIumRequests(client, addr);
    const fromTarget = requests.filter(r => normalizeSuiAddress(r.initiator) === FROM);

    if (fromTarget.length === 0) continue;

    found += fromTarget.length;
    console.log(`${w.name} (${addr.slice(0, 10)}): ${fromTarget.length}건 발견`);

    for (const req of fromTarget) {
      try {
        const tx = buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId });
        await executeAndAssert(client, { transaction: tx, signer: kp });
        accepted++;
        console.log(`  수락 ✓ (eventId: ${req.eventId.slice(0, 12)})`);
      } catch (e) {
        failed++;
        console.error(`  수락 ✗ ${(e as Error).message?.slice(0, 60)}`);
      }
    }
  }

  console.log(`\n완료: 발견 ${found}, 수락 ${accepted}, 실패 ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
