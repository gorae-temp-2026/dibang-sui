/**
 * 대리 지갑으로 사용자 역할 수행 — 이음 수락, 결혼식 참석/부조/방명록, DM.
 * zkLogin 주소는 스크립트로 서명 불가하므로 대리 지갑이 사용자를 대신한다.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildRequestIumTx, buildAcceptIumTx, buildParticipateTx,
  buildGiveTx, buildWriteTx, buildCreateNoteBoxTx, buildSendNoteTx,
  getOwnedIumRequests, getParticipationForEvent, getAnyParticipation,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

async function fund(from: Ed25519Keypair, to: string, amount: number) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await executeAndAssert(client, { transaction: tx, signer: from });
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const wallets: Record<string, { name: string; address: string; sk: string }> = data.wallets;
  const weddings: Record<string, { weddingId: string; eventId: string; vaultId: string; host: string; capId: string; hostPartId: string }> = data.weddings;
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());

  // 대리 지갑 = 신솔현
  const proxy = wallets['신솔현']!;
  const proxyKp = Ed25519Keypair.fromSecretKey(proxy.sk);
  console.log(`대리 지갑: ${proxy.name} (${proxy.address.slice(0, 10)}…)`);

  // 충전 (1 SUI)
  console.log('대리 지갑 충전...');
  await fund(funder, proxy.address, 1_000_000_000);
  const bal = await client.getBalance({ owner: proxy.address });
  console.log(`잔액: ${(Number(bal.totalBalance) / 1e9).toFixed(3)} SUI`);

  // === 1) 20명이 대리에게 이음 신청 + 대리가 수락 ===
  console.log('\n=== 이음 20건 ===');
  const iumPartners: Ed25519Keypair[] = [];
  const allWallets = Object.values(wallets);
  for (const w of allWallets) {
    if (iumPartners.length >= 20) break;
    if (w.address === proxy.address) continue;
    const b = await client.getBalance({ owner: w.address });
    if (BigInt(b.totalBalance) >= 30_000_000n) {
      iumPartners.push(Ed25519Keypair.fromSecretKey(w.sk));
    }
  }
  console.log(`이음 파트너 ${iumPartners.length}명 선택`);

  let reqOk = 0;
  for (const kp of iumPartners) {
    try {
      await executeAndAssert(client, { transaction: buildRequestIumTx({ toUser: proxy.address }), signer: kp });
      reqOk++;
    } catch { /* skip */ }
  }
  console.log(`이음 신청: ${reqOk}건`);

  // 대리가 수락
  const requests = await getOwnedIumRequests(client, proxy.address);
  console.log(`받은 요청: ${requests.length}개`);
  let accOk = 0;
  for (const req of requests) {
    try {
      await executeAndAssert(client, { transaction: buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId }), signer: proxyKp });
      accOk++;
      process.stdout.write(`  수락 ${accOk}/${requests.length}\r`);
    } catch (e) {
      console.error(`  수락 실패:`, (e as Error).message?.slice(0, 80));
    }
  }
  console.log(`\n이음 수락: ${accOk}건`);

  // === 2) 결혼식 3개에 참석 + 부조 + 방명록 ===
  console.log('\n=== 결혼식 3개 ===');
  const weddingEntries = Object.entries(weddings).filter(([, w]) => w.vaultId).slice(0, 3);
  for (const [eid, w] of weddingEntries) {
    console.log(`--- ${eid} ---`);
    // 혼주 충전
    const hostW = wallets[w.host];
    if (hostW) {
      try { await fund(funder, hostW.address, 200_000_000); } catch { /* skip */ }
      const hostKp = Ed25519Keypair.fromSecretKey(hostW.sk);
      // 혼주가 대리 초대
      try {
        const hostPart = await getParticipationForEvent(client, hostW.address, w.eventId);
        if (hostPart) {
          await executeAndAssert(client, { transaction: buildParticipateTx({ eventId: w.eventId, roleId: 1 }), signer: proxyKp });
          console.log('  참석 완료');
        }
      } catch (e) { console.error('  참석:', (e as Error).message?.slice(0, 60)); }
    }
    // 부조
    try {
      const part = await getParticipationForEvent(client, proxy.address, w.eventId);
      if (part) {
        await executeAndAssert(client, { transaction: buildGiveTx({ vaultId: w.vaultId, weddingId: w.weddingId, participationId: part.id, amount: 50_000_000n }), signer: proxyKp });
        console.log('  부조 완료');
      }
    } catch (e) { console.error('  부조:', (e as Error).message?.slice(0, 60)); }
    // 방명록
    try {
      const part = await getParticipationForEvent(client, proxy.address, w.eventId);
      if (part) {
        await executeAndAssert(client, { transaction: buildWriteTx({ weddingId: w.weddingId, participationId: part.id }), signer: proxyKp });
        console.log('  방명록 완료');
      }
    } catch (e) { console.error('  방명록:', (e as Error).message?.slice(0, 60)); }
  }

  // === 3) DM 5쌍 ===
  console.log('\n=== DM 5쌍 ===');
  const dmPartners = iumPartners.slice(0, 5);
  for (let i = 0; i < dmPartners.length; i++) {
    const partner = dmPartners[i];
    try {
      // NoteBox 생성 (대리 → 상대)
      await executeAndAssert(client, { transaction: buildCreateNoteBoxTx({ other: partner.toSuiAddress() }), signer: proxyKp });
      // 대리 → 상대 메시지
      const proxyPart = await getAnyParticipation(client, proxy.address);
      if (proxyPart) {
        const blob = new TextEncoder().encode(`안녕하세요! 대리 메시지 ${i + 1}`);
        const blobId = new TextEncoder().encode(`test-blob-${Date.now()}-${i}`);
        // send_note는 NoteBox ID가 필요 — 여기선 건너뜀 (NoteBox 조회 로직이 필요)
        console.log(`  DM ${i + 1}: NoteBox 생성 완료`);
      }
    } catch (e) { console.error(`  DM ${i + 1}:`, (e as Error).message?.slice(0, 60)); }
  }

  console.log('\n✅ 대리 상호작용 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
