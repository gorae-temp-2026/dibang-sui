/**
 * 시뮬 결혼식 3개에 사용자 초대 + 참석 + 부조 + 방명록.
 * F-5 + F-6 통합.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildParticipateTx, buildGiveTx, buildWriteTx, buildInviteTx,
  getParticipationForEvent, getWedding,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const USER_ADDRESS = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';
const USER_SK = 'suiprivkey1qpqhudd5vx2lfx4k6c6altav5wawyx6upqxnv48y7rz5shjgquj925xs5dm';

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const weddings: Record<string, { weddingId: string; eventId: string; vaultId: string; host: string; capId: string; hostPartId: string }> = data.weddings;
  const wallets: Record<string, { name: string; address: string; sk: string }> = data.wallets;
  const userKp = Ed25519Keypair.fromSecretKey(USER_SK);

  // 결혼식 3개 선택 (vaultId가 있는 것)
  const weddingEntries = Object.entries(weddings).filter(([, w]) => w.vaultId).slice(0, 3);
  console.log(`결혼식 ${weddingEntries.length}개 선택`);

  for (const [eid, wedding] of weddingEntries) {
    console.log(`\n--- ${eid} (host: ${wedding.host}) ---`);
    const hostWallet = wallets[wedding.host];
    if (!hostWallet) { console.log('  호스트 지갑 없음 — skip'); continue; }
    const hostKp = Ed25519Keypair.fromSecretKey(hostWallet.sk);

    // 1) 혼주가 사용자를 초대 (invite)
    try {
      const hostPart = await getParticipationForEvent(client, hostWallet.address, wedding.eventId);
      if (hostPart) {
        await executeAndAssert(client, {
          transaction: buildInviteTx({ weddingId: wedding.weddingId, hostParticipationId: hostPart.id, guest: USER_ADDRESS }),
          signer: hostKp,
        });
        console.log('  초대 완료');
      }
    } catch (e) { console.error('  초대 실패:', (e as Error).message?.slice(0, 60)); }

    // 2) 사용자가 참석 (participate)
    try {
      const existing = await getParticipationForEvent(client, USER_ADDRESS, wedding.eventId);
      if (!existing) {
        await executeAndAssert(client, {
          transaction: buildParticipateTx({ eventId: wedding.eventId, roleId: 1 }),
          signer: userKp,
        });
        console.log('  참석 완료');
      } else {
        console.log('  이미 참석');
      }
    } catch (e) { console.error('  참석 실패:', (e as Error).message?.slice(0, 60)); }

    // 3) 사용자가 부조 (give)
    try {
      const part = await getParticipationForEvent(client, USER_ADDRESS, wedding.eventId);
      if (part) {
        await executeAndAssert(client, {
          transaction: buildGiveTx({ vaultId: wedding.vaultId, weddingId: wedding.weddingId, participationId: part.id, amount: 50_000_000n }),
          signer: userKp,
        });
        console.log('  부조 완료 (0.05 SUI)');
      }
    } catch (e) { console.error('  부조 실패:', (e as Error).message?.slice(0, 60)); }

    // 4) 사용자가 방명록 (write)
    try {
      const part = await getParticipationForEvent(client, USER_ADDRESS, wedding.eventId);
      if (part) {
        await executeAndAssert(client, {
          transaction: buildWriteTx({ weddingId: wedding.weddingId, participationId: part.id }),
          signer: userKp,
        });
        console.log('  방명록 완료');
      }
    } catch (e) { console.error('  방명록 실패:', (e as Error).message?.slice(0, 60)); }
  }

  console.log('\n✅ 결혼식 상호작용 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
