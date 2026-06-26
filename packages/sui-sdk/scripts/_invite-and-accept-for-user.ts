/**
 * G-2: 시뮬 결혼식 5개에서 혼주가 사용자 초대
 * G-3: 사용자가 보낸 이음 신청을 시뮬 지갑이 수락
 * 통합 스크립트.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildInviteTx, buildAcceptIumTx,
  getParticipationForEvent, getIumRequestedEvents, getOwnedIumRequests,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const USER_ADDRESS = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';

async function fund(from: Ed25519Keypair, to: string, amount: number) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await executeAndAssert(client, { transaction: tx, signer: from });
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const wallets: Record<string, { name: string; address: string; sk: string }> = data.wallets;
  const weddings: Record<string, { weddingId: string; eventId: string; vaultId: string; host: string; hostPartId: string }> = data.weddings;
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());

  // === G-2: 결혼식 5개에서 혼주가 사용자 초대 ===
  console.log('=== G-2: 결혼식 초대 ===');
  const weddingEntries = Object.entries(weddings).filter(([, w]) => w.vaultId && w.hostPartId).slice(0, 5);
  let inviteOk = 0;
  for (const [eid, w] of weddingEntries) {
    const hostW = wallets[w.host];
    if (!hostW) continue;
    try {
      await fund(funder, hostW.address, 200_000_000);
      const hostKp = Ed25519Keypair.fromSecretKey(hostW.sk);
      const hostPart = await getParticipationForEvent(client, hostW.address, w.eventId);
      if (hostPart) {
        await executeAndAssert(client, {
          transaction: buildInviteTx({ weddingId: w.weddingId, hostParticipationId: hostPart.id, guest: USER_ADDRESS }),
          signer: hostKp,
        });
        inviteOk++;
        console.log(`  ${eid} (${w.host}) 초대 완료`);
      }
    } catch (e) {
      console.error(`  ${eid} 초대 실패:`, (e as Error).message?.slice(0, 60));
    }
  }
  console.log(`초대 완료: ${inviteOk}건\n`);

  // === G-3: 사용자가 보낸 이음 → 상대가 수락 ===
  console.log('=== G-3: 사용자 이음 신청 수락 ===');
  const iumEvents = await getIumRequestedEvents(client);
  const userSent = iumEvents.filter((e) => e.initiator === USER_ADDRESS);
  console.log(`사용자가 보낸 이음 신청: ${userSent.length}건`);

  let acceptOk = 0;
  for (const req of userSent) {
    const recipientW = Object.values(wallets).find((w) => w.address === req.toUser);
    if (!recipientW) { console.log(`  ${req.toUser.slice(0, 10)}… 지갑 없음`); continue; }
    try {
      await fund(funder, recipientW.address, 500_000_000);
      const recipientKp = Ed25519Keypair.fromSecretKey(recipientW.sk);
      const ownedReqs = await getOwnedIumRequests(client, recipientW.address);
      const myReq = ownedReqs.find((r) => r.eventId === req.eventId);
      if (!myReq) { console.log(`  ${recipientW.name}: IumRequest 없음`); continue; }
      await executeAndAssert(client, {
        transaction: buildAcceptIumTx({ eventId: myReq.eventId, requestId: myReq.requestId }),
        signer: recipientKp,
      });
      acceptOk++;
      console.log(`  ${recipientW.name} 수락 완료`);
    } catch (e) {
      console.error(`  ${recipientW.name} 수락 실패:`, (e as Error).message?.slice(0, 60));
    }
  }
  console.log(`수락 완료: ${acceptOk}건`);
}

main().catch((e) => { console.error(e); process.exit(1); });
