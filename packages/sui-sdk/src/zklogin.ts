/**
 * 프론트엔드 zkLogin 유틸리티.
 *
 * zkLogin 흐름:
 *   1) ephemeral keypair + randomness 생성 → nonce 계산
 *   2) nonce를 담아 Google OAuth → id_token(JWT) 수신
 *   3) JWT를 Salt 서버로 보내 사용자별 salt 수신
 *   4) (JWT, salt)로 zkLogin Sui 주소 계산 (오프라인)
 *   5) ZK prover로 증명 요청
 *   6) ephemeral 서명 + 증명 + addressSeed로 zkLogin 서명 조합
 *
 * ephemeral keypair는 에포크 내에서 재사용하므로 세션 정보를 sessionStorage에 보관한다.
 * (이 모듈은 트랜잭션 서명에 쓸 zkLogin 서명을 만들고, 실제 실행/가스대납은 sponsor 모듈이 담당.)
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
  genAddressSeed,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  decodeJwt,
} from '@mysten/sui/zklogin';
import type { ZkLoginSignatureInputs } from '@mysten/sui/zklogin';
import type { PublicKey } from '@mysten/sui/cryptography';

/** prover가 돌려주는 증명 입력(addressSeed 제외 — addressSeed는 salt+JWT로 우리가 계산). */
export type ZkProofInputs = Omit<ZkLoginSignatureInputs, 'addressSeed'>;

export interface EphemeralKey {
  keypair: Ed25519Keypair;
  maxEpoch: number;
  randomness: string;
  nonce: string;
}

/**
 * ephemeral keypair + randomness + nonce를 생성한다.
 * maxEpoch = currentEpoch + epochValidity (이 에포크까지 ephemeral key 유효).
 */
export function generateEphemeralKey(currentEpoch: number, epochValidity = 2): EphemeralKey {
  const keypair = new Ed25519Keypair();
  const maxEpoch = currentEpoch + epochValidity;
  const randomness = generateRandomness();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);
  return { keypair, maxEpoch, randomness, nonce };
}

/** Google OpenID Connect implicit 플로우 URL (id_token 직접 수신). */
export function getGoogleOAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  nonce: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', params.nonce);
  return url.toString();
}

/** Salt 서버에서 사용자별 salt를 받아온다. */
export async function fetchSalt(jwt: string, saltServerUrl: string): Promise<string> {
  const res = await fetch(saltServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: jwt }),
  });
  if (!res.ok) throw new Error(`salt server error: ${res.status}`);
  const data = (await res.json()) as { salt: string };
  return data.salt;
}

/** (JWT, salt)로 zkLogin Sui 주소를 계산한다(오프라인, 결정적). */
export function zkLoginAddress(jwt: string, salt: string): string {
  return jwtToAddress(jwt, salt, false);
}

/** ZK prover에 증명을 요청한다. */
export async function fetchZkProof(params: {
  jwt: string;
  salt: string;
  ephemeralPublicKey: PublicKey;
  maxEpoch: number;
  randomness: string;
  proverUrl: string;
}): Promise<ZkProofInputs> {
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(params.ephemeralPublicKey);
  const res = await fetch(params.proverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jwt: params.jwt,
      extendedEphemeralPublicKey,
      maxEpoch: params.maxEpoch,
      jwtRandomness: params.randomness,
      salt: params.salt,
      keyClaimName: 'sub',
    }),
  });
  if (!res.ok) throw new Error(`prover error: ${res.status}`);
  return (await res.json()) as ZkProofInputs;
}

/** ephemeral 서명 + 증명 + addressSeed로 최종 zkLogin 서명을 조합한다. */
export function buildZkLoginSignature(params: {
  proofInputs: ZkProofInputs;
  maxEpoch: number;
  /** ephemeral keypair로 트랜잭션 bytes를 서명한 결과(base64). */
  userSignature: string;
  salt: string;
  jwt: string;
}): string {
  const claims = decodeJwt(params.jwt);
  const aud = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
  const addressSeed = genAddressSeed(BigInt(params.salt), 'sub', claims.sub, aud ?? '').toString();
  return getZkLoginSignature({
    inputs: { ...params.proofInputs, addressSeed },
    maxEpoch: params.maxEpoch,
    userSignature: params.userSignature,
  });
}

// === 세션 보관 (에포크 내 ephemeral key 재사용) ===

export interface ZkLoginSession {
  /** ephemeral keypair 비밀키(bech32 suiprivkey...). 복원 시 fromSecretKey. */
  ephemeralSecretKey: string;
  maxEpoch: number;
  randomness: string;
  jwt: string;
  salt: string;
  address: string;
  proofInputs?: ZkProofInputs;
}

const SESSION_KEY = 'dibang.zklogin.session';

function storageOrThrow(storage?: Storage): Storage {
  const s = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
  if (!s) throw new Error('no Storage available (pass one explicitly outside the browser)');
  return s;
}

export function saveSession(session: ZkLoginSession, storage?: Storage): void {
  storageOrThrow(storage).setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(storage?: Storage): ZkLoginSession | null {
  const raw = storageOrThrow(storage).getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as ZkLoginSession) : null;
}

export function clearSession(storage?: Storage): void {
  storageOrThrow(storage).removeItem(SESSION_KEY);
}

/** 세션의 ephemeral 비밀키로 keypair를 복원한다. */
export function ephemeralKeypairFromSession(session: ZkLoginSession): Ed25519Keypair {
  return Ed25519Keypair.fromSecretKey(session.ephemeralSecretKey);
}
