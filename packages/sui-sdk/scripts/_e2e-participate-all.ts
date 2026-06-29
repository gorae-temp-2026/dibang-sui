import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildParticipateTx, buildGiveTx, buildWriteTx, getParticipationForEvent } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const weddings = JSON.parse(readFileSync(join(here, '.e2e-weddings.json'), 'utf-8'));

// 이름 → 지갑 인덱스 매핑
const nameToIdx: Record<string, number> = {};
wallets.slice(0, 50).forEach((w, i) => { nameToIdx[w.name] = i; });

// 시나리오 매핑 (A1~A10 = idx 0~9, B1~B30 = idx 10~39)
// W1~W10 참석자 목록 (시나리오 E2E_SCENARIO_50.md 기준)
const participationMap: number[][] = [
  // W1: A1,A2,A4,A7,B1,B2,B4,B7,B11,B14,B18,B21,B24,B28
  [0,1,3,6,10,11,13,16,20,23,27,30,33,37],
  // W2: A2,A1,A5,A9,B1,B3,B6,B9,B13,B16,B19,B23,B26,B30
  [1,0,4,8,10,12,15,18,22,25,28,32,35,39],
  // W3: A3,A2,A6,A10,B2,B5,B8,B11,B15,B18,B22,B25,B28
  [2,1,5,9,11,14,17,20,24,27,31,34,37],
  // W4: A4,A3,A8,B3,B6,B10,B14,B17,B19,B23,B26,B29
  [3,2,7,12,15,19,23,26,28,32,35,38],
  // W5: A5,A1,A8,B2,B4,B8,B12,B15,B18,B21,B25,B28
  [4,0,7,11,13,17,21,24,27,30,34,37],
  // W6: A6,A4,A9,B3,B6,B9,B13,B17,B20,B23,B27
  [5,3,8,12,15,18,22,26,29,32,36],
  // W7: A7,A3,A10,B4,B7,B10,B14,B18,B21,B24,B28
  [6,2,9,13,16,19,23,27,30,33,37],
  // W8: A8,A5,B5,B6,B10,B13,B16,B19,B23,B27,B30
  [7,4,14,15,19,22,25,28,32,36,39],
  // W9: A9,A6,B4,B8,B12,B16,B22,B25,B29
  [8,5,13,17,21,25,31,34,38],
  // W10: A10,A7,B9,B11,B14,B17,B20,B23,B27,B30
  [9,6,18,20,23,26,29,32,36,39],
];

async function main() {
  let total = 0, success = 0, skip = 0, fail = 0;

  for (let wi = 0; wi < 10; wi++) {
    const w = weddings[wi];
    const participants = participationMap[wi];
    console.log(`\nW${wi+1} ${w.name} (event=${w.eventId.slice(0,12)}...) — ${participants.length}명 참석`);

    for (const pIdx of participants) {
      total++;
      const wallet = wallets[pIdx];
      const kp = Ed25519Keypair.fromSecretKey(wallet.sk);

      // 이미 참석했는지 확인
      const existing = await getParticipationForEvent(client, kp.toSuiAddress(), w.eventId);
      if (existing) {
        skip++;
        continue;
      }

      try {
        // participate
        const tx = buildParticipateTx({ eventId: w.eventId, roleId: 1 });
        await executeAndAssert(client, { transaction: tx, signer: kp });

        // give (부조 0.05 SUI)
        const part = await getParticipationForEvent(client, kp.toSuiAddress(), w.eventId);
        if (part && w.vaultId) {
          try {
            const giveTx = buildGiveTx({ vaultId: w.vaultId, weddingId: w.weddingId, participationId: part.id, amount: 50_000_000n });
            await executeAndAssert(client, { transaction: giveTx, signer: kp });
          } catch { /* give 실패는 무시 */ }

          // write (방명록)
          try {
            const writeTx = buildWriteTx({ weddingId: w.weddingId, participationId: part.id });
            await executeAndAssert(client, { transaction: writeTx, signer: kp });
          } catch { /* write 실패는 무시 */ }
        }

        success++;
        process.stdout.write(`  ${wallet.name} ✓ `);
      } catch (e) {
        fail++;
        process.stdout.write(`  ${wallet.name} ✗ `);
      }
    }
    console.log(`\n  → 성공:${success} 스킵:${skip} 실패:${fail}`);
  }

  console.log(`\n=== 전체 결과: 총 ${total}, 성공 ${success}, 스킵 ${skip}, 실패 ${fail} ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
