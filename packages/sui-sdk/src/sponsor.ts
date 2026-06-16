/**
 * Sponsored Transaction (가스 대납).
 *
 * zkLogin 하객은 SUI가 없으므로, sponsor(가스 스테이션)가 가스를 대신 낸다.
 * 서명 순서 문제상(사용자 서명은 가스까지 포함한 최종 bytes를 서명해야 함) 흐름은:
 *   1) 클라이언트: tx를 onlyTransactionKind로 빌드 → txKindBytes(base64)
 *   2) sponsor 서비스: kind 복원 → sender/gasOwner(sponsor)/budget 설정 → 허용 패키지 검증
 *      → 빌드 + sponsor 서명 → { sponsoredBytes, sponsorSignature } 반환
 *   3) 클라이언트: sponsoredBytes를 ephemeral/zkLogin 서명 → 두 서명으로 실행
 *
 * 보안: sponsor는 허용된 패키지의 moveCall만 대납한다(임의 트랜잭션 대납 거부).
 *
 * 참고: Sui 트랜잭션 서명/BCS는 @mysten/sui(TS)가 다루므로 sponsor는 Node 서비스로 운영한다
 * (Go에는 성숙한 Sui SDK가 없어 정석 도구인 TS를 사용 — scripts/sponsor-server.ts).
 */

import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import type { SuiJsonRpcClient, SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import type { Signer } from '@mysten/sui/cryptography';

export interface SponsorRequest {
  /** 트랜잭션 sender(=zkLogin 사용자) 주소. */
  senderAddress: string;
  /** onlyTransactionKind 로 빌드한 bytes(base64). */
  txKindBytes: string;
}

export interface SponsorResponse {
  /** 가스까지 포함된 최종 트랜잭션 bytes(base64) — 사용자가 이걸 서명한다. */
  sponsoredBytes: string;
  /** sponsor의 서명. */
  sponsorSignature: string;
}

/** 인자가 가스 코인(tx.gas)을 가리키는지. */
function isGasCoin(arg: { $kind?: string }): boolean {
  return arg?.$kind === 'GasCoin';
}

/**
 * 대납 가능한 트랜잭션인지 검증한다(위반 시 throw).
 *
 * MoveCall만 검사하던 초기 구현은 치명적 결함이었다: 가스 소유자가 sponsor이므로,
 * MoveCall 없이 `splitCoins(tx.gas, …)` + `transferObjects(…, attacker)` 만으로 sponsor의
 * 가스 코인을 탈취할 수 있다. 그래서 **모든 커맨드를 화이트리스트**로 검사한다:
 *   - MoveCall: 허용 패키지만 (그리고 최소 1개 존재해야 함 — 순수 송금 tx 대납 금지)
 *   - SplitCoins/MergeCoins/TransferObjects/MakeMoveVec: 가스 코인을 인자로 쓰면 거부
 *   - Publish/Upgrade/$Intent/미지 커맨드: 일괄 거부
 */
function assertSponsorable(tx: Transaction, allowedPackageId: string): void {
  const allowed = normalizeSuiAddress(allowedPackageId);
  let moveCallsToAllowed = 0;

  for (const cmd of tx.getData().commands) {
    switch (cmd.$kind) {
      case 'MoveCall': {
        const pkg = normalizeSuiAddress(cmd.MoveCall.package);
        if (pkg !== allowed) {
          throw new Error(`sponsor refuses: moveCall to package ${pkg} (allowed: ${allowed})`);
        }
        moveCallsToAllowed += 1;
        break;
      }
      case 'SplitCoins':
        if (isGasCoin(cmd.SplitCoins.coin)) {
          throw new Error('sponsor refuses: SplitCoins off the gas coin');
        }
        break;
      case 'MergeCoins':
        if (isGasCoin(cmd.MergeCoins.destination) || cmd.MergeCoins.sources.some(isGasCoin)) {
          throw new Error('sponsor refuses: MergeCoins involving the gas coin');
        }
        break;
      case 'TransferObjects':
        if (cmd.TransferObjects.objects.some(isGasCoin)) {
          throw new Error('sponsor refuses: TransferObjects of the gas coin');
        }
        break;
      case 'MakeMoveVec':
        if (cmd.MakeMoveVec.elements.some(isGasCoin)) {
          throw new Error('sponsor refuses: gas coin inside MakeMoveVec');
        }
        break;
      default:
        // Publish, Upgrade, $Intent, 기타 미지 커맨드 → 대납 거부.
        throw new Error(`sponsor refuses: command kind ${cmd.$kind} not allowed`);
    }
  }

  if (moveCallsToAllowed === 0) {
    throw new Error('sponsor refuses: no moveCall to the allowed package');
  }
}

// === 서버 측 (sponsor 서비스에서 사용) ===

/**
 * 사용자가 보낸 txKind를 받아 가스를 붙이고 sponsor 서명을 만든다.
 * 허용 패키지 검증을 통과한 트랜잭션만 처리한다.
 */
export async function createSponsoredTransaction(opts: {
  client: SuiJsonRpcClient;
  sponsorKeypair: Signer;
  request: SponsorRequest;
  allowedPackageId: string;
  gasBudget: number;
}): Promise<SponsorResponse> {
  const tx = Transaction.fromKind(fromBase64(opts.request.txKindBytes));
  tx.setSender(opts.request.senderAddress);
  tx.setGasOwner(opts.sponsorKeypair.toSuiAddress());
  tx.setGasBudget(opts.gasBudget);

  assertSponsorable(tx, opts.allowedPackageId);

  const { bytes, signature } = await tx.sign({ client: opts.client, signer: opts.sponsorKeypair });
  return { sponsoredBytes: bytes, sponsorSignature: signature };
}

// === 클라이언트 측 ===

/** sponsor 서비스에 가스 대납을 요청한다. */
export async function requestSponsorship(
  sponsorUrl: string,
  request: SponsorRequest,
): Promise<SponsorResponse> {
  const res = await fetch(sponsorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`sponsor service error: ${res.status}`);
  return (await res.json()) as SponsorResponse;
}

/** 사용자 서명 + sponsor 서명으로 sponsored 트랜잭션을 실행하고 성공을 검증한다. */
export async function executeSponsored(
  client: SuiJsonRpcClient,
  params: { sponsoredBytes: string; userSignature: string; sponsorSignature: string },
): Promise<SuiTransactionBlockResponse> {
  const res = await client.executeTransactionBlock({
    transactionBlock: params.sponsoredBytes,
    signature: [params.userSignature, params.sponsorSignature],
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
  await client.waitForTransaction({ digest: res.digest });
  const status = res.effects?.status?.status;
  if (status !== 'success') {
    throw new Error(`sponsored tx failed (${res.effects?.status?.error ?? 'unknown'}) — digest ${res.digest}`);
  }
  return res;
}

/**
 * 편의: 빌더 tx를 sponsor 서비스로 대납받아 실행한다(빌드→요청→서명→실행 일괄).
 *
 * 서명 전략은 콜백으로 주입한다 — sponsor 로직을 zkLogin에 결합시키지 않기 위함:
 *   - ephemeral keypair:  `async (b) => (await keypair.signTransaction(b)).signature`
 *   - zkLogin:           ephemeral로 서명 후 buildZkLoginSignature(zklogin.ts)로 감싼 값 반환
 */
export async function sponsoredExecute(opts: {
  client: SuiJsonRpcClient;
  transaction: Transaction;
  senderAddress: string;
  sponsorUrl: string;
  signUserTransaction: (sponsoredBytes: Uint8Array) => Promise<string>;
}): Promise<SuiTransactionBlockResponse> {
  // 1) 가스 없는 tx kind 빌드
  const txKindBytes = toBase64(
    await opts.transaction.build({ client: opts.client, onlyTransactionKind: true }),
  );
  // 2) sponsor 서비스에 대납 요청
  const { sponsoredBytes, sponsorSignature } = await requestSponsorship(opts.sponsorUrl, {
    senderAddress: opts.senderAddress,
    txKindBytes,
  });
  // 3) 사용자가 가스 포함 최종 bytes에 서명
  const userSignature = await opts.signUserTransaction(fromBase64(sponsoredBytes));
  // 4) 두 서명으로 실행
  return executeSponsored(opts.client, { sponsoredBytes, userSignature, sponsorSignature });
}
