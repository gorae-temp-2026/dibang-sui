/**
 * Seal 암호화/복호화 헬퍼 — NoteBox 기반 1:1 쪽지 E2E 암호화.
 *
 * 흐름:
 *   암호화: sealEncrypt(noteBoxId, plaintext) → Uint8Array(암호문)
 *   복호화: sealDecrypt(encryptedData, noteBoxId, signer) → Uint8Array(평문)
 *
 * Seal key server = testnet decentralized aggregator.
 * packageId = note.move가 배포된 dibang_wedding 패키지.
 */
import { SealClient, SessionKey } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import type { Keypair } from '@mysten/sui/cryptography';
import { getConfig, moveTarget } from './constants';
import { createJsonRpcClient } from './client';

const TESTNET_KEY_SERVERS = [
  { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
  { objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', weight: 1 },
];

let _sealClient: SealClient | null = null;

function getSealClient(): SealClient {
  if (_sealClient) return _sealClient;
  const suiClient = createJsonRpcClient(getConfig().network);
  _sealClient = new SealClient({
    suiClient: suiClient as any,
    serverConfigs: TESTNET_KEY_SERVERS,
    verifyKeyServers: false,
  });
  return _sealClient;
}

/**
 * seal_approve의 id 인자 = encryptedObject.id (hex → bytes).
 * Seal key server가 PTB를 실행할 때 이 id로 Move의 is_prefix 검증을 수행.
 */
function sealIdBytes(noteBoxId: string): number[] {
  return Array.from(fromHex(noteBoxId));
}

/**
 * 쪽지 본문을 Seal 암호화.
 * @param noteBoxId - NoteBox 공유 오브젝트 ID (Seal allowlist 역할)
 * @param plaintext - 암호화할 데이터
 * @returns 암호화된 바이트 (Walrus에 저장할 blob)
 */
export async function sealEncryptNote(
  noteBoxId: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const seal = getSealClient();
  const packageId = getConfig().packageId;
  const { encryptedObject } = await seal.encrypt({
    threshold: 2,
    packageId,
    id: noteBoxId,
    data: plaintext,
  });
  return encryptedObject;
}

/**
 * Seal 암호화된 쪽지 본문을 복호화.
 * @param encryptedData - Walrus에서 가져온 암호화된 blob
 * @param noteBoxId - NoteBox 공유 오브젝트 ID
 * @param signer - 복호화 요청자의 keypair (SessionKey 생성용)
 * @returns 복호화된 평문 바이트
 */
export async function sealDecryptNote(
  encryptedData: Uint8Array,
  noteBoxId: string,
  signer: Keypair,
): Promise<Uint8Array> {
  const seal = getSealClient();
  const suiClient = createJsonRpcClient(getConfig().network);
  const packageId = getConfig().packageId;

  const sessionKey = await SessionKey.create({
    address: signer.toSuiAddress(),
    packageId,
    ttlMin: 10,
    signer,
    suiClient: suiClient as any,
  });

  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  tx.moveCall({
    target: moveTarget('note', 'seal_approve'),
    arguments: [
      tx.pure.vector('u8', sealIdBytes(noteBoxId)),
      tx.object(noteBoxId),
    ],
  });
  const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });

  const decrypted = await seal.decrypt({
    data: encryptedData,
    sessionKey,
    txBytes,
    checkLEEncoding: true,
  });
  return decrypted;
}

/**
 * zkLogin 세션 기반 Seal 복호화 (프론트엔드용).
 * SessionKey 대신 zkLogin 서명을 사용 — Seal SDK가 personalMessage 서명을 지원하면 사용.
 * 현재는 dev keypair 전용(zkLogin SessionKey 생성은 Seal SDK 제한으로 미지원).
 */
export async function sealDecryptNoteWithSession(
  encryptedData: Uint8Array,
  noteBoxId: string,
  address: string,
  signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>,
): Promise<Uint8Array> {
  const seal = getSealClient();
  const suiClient = createJsonRpcClient(getConfig().network);
  const packageId = getConfig().packageId;

  const sessionKey = await SessionKey.create({
    address,
    packageId,
    ttlMin: 10,
    signer: { signPersonalMessage } as any,
    suiClient: suiClient as any,
  });

  const tx = new Transaction();
  tx.setSender(address);
  tx.moveCall({
    target: moveTarget('note', 'seal_approve'),
    arguments: [
      tx.pure.vector('u8', sealIdBytes(noteBoxId)),
      tx.object(noteBoxId),
    ],
  });
  const txBytes = await tx.build({ client: suiClient as any });

  return seal.decrypt({ data: encryptedData, sessionKey, txBytes });
}
