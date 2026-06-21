/**
 * Sponsored Transaction E2E 테스트 (testnet).
 *
 * 핵심 증명: SUI가 한 푼도 없는 사용자가 sponsor 가스 대납으로 온체인 트랜잭션을 실행한다.
 * + 보안: sponsor는 허용된 패키지 외의 moveCall 대납을 거부한다.
 *
 * (zkLogin 서명 조립은 라이브 Google OAuth + ZK prover가 필요해 여기선 ephemeral keypair를
 *  "사용자"로 사용한다 — sponsor 메커니즘 자체는 서명 출처와 무관하게 동일하다.)
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-sponsor.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type { SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import {
  createJsonRpcClient,
  getConfig,
  executeAndAssert,
  createSponsoredTransaction,
  executeSponsored,
  buildCreateWeddingTx,
  buildSubmitRsvpTx,
  getRsvpEvents,
} from '../src/index';

const KEY_PATH = join(dirname(fileURLToPath(import.meta.url)), '.test-keypair');
const client = createJsonRpcClient('testnet');

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

function createdId(res: SuiTransactionBlockResponse, suffix: string): string {
  const c = res.objectChanges?.find((o) => o.type === 'created' && o.objectType.endsWith(suffix));
  if (!c || c.type !== 'created') throw new Error(`created ${suffix} not found`);
  return c.objectId;
}

async function main() {
  if (!existsSync(KEY_PATH)) {
    console.error('.test-keypair 없음 — 자금된 ed25519 키를 scripts/.test-keypair에 두세요(sponsor 가스 지불용).');
    process.exit(1);
  }
  const sponsor = Ed25519Keypair.fromSecretKey(readFileSync(KEY_PATH, 'utf-8').trim());
  const user = new Ed25519Keypair(); // 자금 없는 사용자(=zkLogin 게스트 대역)
  console.log('sponsor:', sponsor.toSuiAddress());
  console.log('user (unfunded):', user.toSuiAddress());

  // 사전: 사용자가 정말 자금이 없는지 확인.
  const { totalBalance } = await client.getBalance({ owner: user.toSuiAddress() });
  assert(BigInt(totalBalance) === 0n, '사용자 잔액 0 (가스 없음)');

  // 1) sponsor가 결혼식 생성(자기 가스로) → 라운지 확보
  console.log('\n[1] sponsor가 결혼식 생성');
  const rWedding = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: sponsor.toSuiAddress() }), // 익명 앵커(결정#2 — 표시정보 인자 없음)
    signer: sponsor,
  });
  const weddingId = createdId(rWedding, '::wedding::Wedding');
  const loungeId = createdId(rWedding, '::wedding::WeddingLounge');
  console.log(`  ✓ wedding ${weddingId.slice(0, 10)}…  lounge ${loungeId.slice(0, 10)}…`);

  // 2) 자금 없는 사용자가 sponsor 대납으로 RSVP 제출
  console.log('\n[2] 자금 없는 사용자가 sponsor 대납으로 RSVP 제출');
  const tx = buildSubmitRsvpTx({
    loungeId,
    recipientSlot: 0, // groom (§1-6 u8)
    attendance: 0, // attending
    companionCount: 1,
    meal: 0, // yes
  });
  const txKindBytes = toBase64(await tx.build({ client, onlyTransactionKind: true }));
  const { sponsoredBytes, sponsorSignature } = await createSponsoredTransaction({
    client,
    sponsorKeypair: sponsor,
    request: { senderAddress: user.toSuiAddress(), txKindBytes },
    allowedPackageId: getConfig().packageId,
    gasBudget: 30_000_000,
  });
  const { signature: userSignature } = await user.signTransaction(fromBase64(sponsoredBytes));
  const execRes = await executeSponsored(client, { sponsoredBytes, userSignature, sponsorSignature });
  console.log(`  ✓ sponsored tx 실행: ${execRes.digest}`);

  const rsvps = await getRsvpEvents(client, weddingId);
  assert(
    rsvps.some((r) => r.submitter === user.toSuiAddress()),
    '자금 없는 사용자의 RSVP가 sponsor 대납으로 기록됨',
  );

  // 3) 보안: sponsor는 허용 외 패키지 moveCall 대납을 거부
  console.log('\n[3] 보안: 허용 외 패키지 대납 거부');
  const evil = new Transaction();
  evil.moveCall({ target: '0x2::coin::zero', typeArguments: ['0x2::sui::SUI'] });
  const evilKind = toBase64(await evil.build({ client, onlyTransactionKind: true }));
  let refused = false;
  try {
    await createSponsoredTransaction({
      client,
      sponsorKeypair: sponsor,
      request: { senderAddress: user.toSuiAddress(), txKindBytes: evilKind },
      allowedPackageId: getConfig().packageId,
      gasBudget: 30_000_000,
    });
  } catch {
    refused = true;
  }
  assert(refused, 'sponsor가 허용 외 패키지(0x2) 대납을 거부');

  // 4) 보안(C1 회귀): MoveCall 없이 가스 코인을 분리·전송하는 탈취 시도를 거부
  console.log('\n[4] 보안: 가스 코인 탈취(splitCoins(gas)+transfer) 거부');
  const drain = new Transaction();
  const stolen = drain.splitCoins(drain.gas, [drain.pure.u64(1_000_000n)]);
  drain.transferObjects([stolen], user.toSuiAddress()); // 공격자에게 sponsor 가스 빼돌리기
  const drainKind = toBase64(await drain.build({ client, onlyTransactionKind: true }));
  let drainRefused = false;
  try {
    await createSponsoredTransaction({
      client,
      sponsorKeypair: sponsor,
      request: { senderAddress: user.toSuiAddress(), txKindBytes: drainKind },
      allowedPackageId: getConfig().packageId,
      gasBudget: 30_000_000,
    });
  } catch {
    drainRefused = true;
  }
  assert(drainRefused, 'sponsor가 가스 코인 탈취 트랜잭션을 거부 (MoveCall 없음 + gas 코인 사용)');

  console.log('\n=== SPONSOR E2E 검증 통과 (자금 없는 사용자 대납 실행 + allowlist + 가스탈취 방어) ===');
}

main().catch((e) => {
  console.error('\nSPONSOR TEST FAILED:', e);
  process.exit(1);
});
