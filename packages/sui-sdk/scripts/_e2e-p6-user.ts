import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildParticipateTx, buildGiveTx, buildWriteTx, buildRequestIumTx, buildAcceptIumTx, getParticipationForEvent, getOwnedIumRequests, ephemeralKeypairFromSession, buildZkLoginSignature, type ZkLoginSession } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const weddings = JSON.parse(readFileSync(join(here, '.e2e-weddings.json'), 'utf-8'));
const session: ZkLoginSession = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui/983c790a-b074-496f-a409-cbe6dcbc10f8/scratchpad/zklogin-session.json', 'utf-8'));

const USER_ADDR = session.address;

async function zkExecute(tx: any): Promise<string> {
  const ephemeral = ephemeralKeypairFromSession(session);
  tx.setSender(USER_ADDR);
  const built = await tx.build({ client });
  const { signature: ephSig } = await ephemeral.signTransaction(built);
  const zkSig = buildZkLoginSignature({
    proofInputs: session.proofInputs!,
    maxEpoch: session.maxEpoch,
    userSignature: ephSig,
    salt: session.salt,
    jwt: session.jwt,
  });
  const res = await client.executeTransactionBlock({
    transactionBlock: built,
    signature: zkSig,
    options: { showEffects: true },
  });
  if (res.effects?.status?.status !== 'success') throw new Error(res.effects?.status?.error ?? 'tx failed');
  return res.digest;
}

async function main() {
  console.log('사용자:', USER_ADDR.slice(0, 12));

  // P6-1: W1, W4, W8 참여
  const targetWeddings = [0, 3, 7]; // W1=index0, W4=index3, W8=index7
  console.log('\n=== P6-1: 결혼식 참여 ===');
  for (const wi of targetWeddings) {
    const w = weddings[wi];
    console.log(`W${wi+1} ${w.name}...`);
    const existing = await getParticipationForEvent(client, USER_ADDR, w.eventId);
    if (existing) { console.log('  이미 참석'); continue; }
    try {
      const tx = buildParticipateTx({ eventId: w.eventId, roleId: 1 });
      const d = await zkExecute(tx);
      console.log('  participate:', d.slice(0, 15));

      const part = await getParticipationForEvent(client, USER_ADDR, w.eventId);
      if (part && w.vaultId) {
        try {
          const giveTx = buildGiveTx({ vaultId: w.vaultId, weddingId: w.weddingId, participationId: part.id, amount: 50_000_000n });
          await zkExecute(giveTx);
          console.log('  give ✓');
        } catch { console.log('  give ✗'); }
        try {
          const writeTx = buildWriteTx({ weddingId: w.weddingId, participationId: part.id });
          await zkExecute(writeTx);
          console.log('  write ✓');
        } catch { console.log('  write ✗'); }
      }
    } catch (e) { console.error('  실패:', (e as Error).message?.slice(0, 60)); }
  }

  // P6-2: 사용자 → 7명 이음 신청
  const iumTargets = [0, 3, 7, 10, 11, 13, 16]; // A1,A4,A8,B1,B2,B4,B7
  console.log('\n=== P6-2: 이음 신청 7건 ===');
  for (const idx of iumTargets) {
    const target = wallets[idx];
    try {
      const tx = buildRequestIumTx({ toUser: target.address });
      await zkExecute(tx);
      console.log(`  → ${target.name} ✓`);
    } catch (e) { console.error(`  → ${target.name} ✗ ${(e as Error).message?.slice(0, 50)}`); }
  }

  // P6-3: 7명이 사용자 이음 수락 (Ed25519로 직접)
  console.log('\n=== P6-3: 7명 수락 ===');
  for (const idx of iumTargets) {
    const acceptor = wallets[idx];
    const kp = Ed25519Keypair.fromSecretKey(acceptor.sk);
    try {
      const requests = await getOwnedIumRequests(client, kp.toSuiAddress());
      const req = requests.find(r => r.initiator === USER_ADDR);
      if (!req) { console.log(`  ${acceptor.name}: 요청 없음`); continue; }
      const tx = buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      console.log(`  ${acceptor.name} 수락 ✓`);
    } catch (e) { console.error(`  ${acceptor.name} ✗ ${(e as Error).message?.slice(0, 50)}`); }
  }

  // P6-4: 13명 → 사용자 이음 신청
  const iumFromOthers = [12, 14, 15, 19, 20, 23, 27, 28, 30, 32, 33, 37, 39];
  console.log('\n=== P6-4: 13명 이음 신청 ===');
  for (const idx of iumFromOthers) {
    const requester = wallets[idx];
    const kp = Ed25519Keypair.fromSecretKey(requester.sk);
    try {
      const tx = buildRequestIumTx({ toUser: USER_ADDR });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      console.log(`  ${requester.name} → 사용자 ✓`);
    } catch (e) { console.error(`  ${requester.name} ✗ ${(e as Error).message?.slice(0, 50)}`); }
  }

  // P6-5: 사용자가 13건 수락
  console.log('\n=== P6-5: 사용자 13건 수락 ===');
  const userRequests = await getOwnedIumRequests(client, USER_ADDR);
  console.log(`받은 요청: ${userRequests.length}건`);
  for (const req of userRequests) {
    try {
      const tx = buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId });
      await zkExecute(tx);
      console.log(`  수락 ✓ (from ${req.initiator.slice(0, 10)})`);
    } catch (e) { console.error(`  수락 ✗ ${(e as Error).message?.slice(0, 50)}`); }
  }

  console.log('\n=== P6 완료 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
