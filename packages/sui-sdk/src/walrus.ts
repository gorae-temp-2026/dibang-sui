/**
 * Walrus(분산 블롭 저장) 공유 클라이언트.
 *
 * 프로젝트 의도(PII 비온체인): 사진·사람 이름 등 민감/대용량 콘텐츠는 온체인 평문 금지 →
 * Walrus에 블롭으로 올리고 **온체인엔 blobId(참조)만** 남긴다. (온체인 연결의 실제 예: note::send_note(blob_id))
 *
 * 현재 testnet 공개 publisher/aggregator HTTP relay를 사용한다. 운영 시 자체 relay/SDK로 교체 가능.
 *
 * ⚠️ Seal 암호화는 아직 미적용(평문 블롭). 이름·채팅 같은 PII는 Seal 암호화 후 저장해야 안전하다.
 *    storePII()는 그 자리를 표시하는 래퍼다 — encryptFn을 주면 암호화 후 저장, 없으면 평문(경고) 저장.
 *
 * ⚠️ 내구성(epochs): blobId를 **온체인에 남기는** 블롭은 짧은 epoch로 저장하면 GC된 뒤
 *    온체인 참조가 dangling(404)된다. 그래서 기본 epochs를 testnet 상한({@link ONCHAIN_BLOB_EPOCHS}=53,
 *    ≈53일)으로 둬 "온체인 참조가 가리키는 블롭"이 기본적으로 오래 보존되게 한다. 운영(메인넷)에선
 *    epoch당 기간이 더 길고, 장기 보존은 만료 전 갱신(renew)으로 보장해야 한다.
 */

/**
 * 온체인에 blobId를 남기는 블롭의 보존 epoch 수(testnet PUT 허용 상한 = 53, 실측 2026-06-23).
 * 더 큰 값은 walrus::system_state_inner에서 컨트랙트 abort(HTTP 500). 짧은 epoch는 온체인 참조 dangling을 부른다.
 */
export const ONCHAIN_BLOB_EPOCHS = 53;

export interface WalrusConfig {
  publisher: string;
  aggregator: string;
  /** 저장 시 유지할 epoch 수. 길수록 오래 보존. 온체인 참조 블롭은 기본 {@link ONCHAIN_BLOB_EPOCHS}. */
  epochs?: number;
}

const DEFAULT_CONFIG: WalrusConfig = {
  publisher: 'https://publisher.walrus-testnet.walrus.space',
  aggregator: 'https://aggregator.walrus-testnet.walrus.space',
  // 온체인 참조 dangling 방지를 위해 기본을 testnet 상한으로(짧으면 blob GC 후 온체인 blobId가 404).
  epochs: ONCHAIN_BLOB_EPOCHS,
};

let activeConfig: WalrusConfig = { ...DEFAULT_CONFIG };

/** Walrus relay 설정 덮어쓰기(앱 시작 시 1회). */
export function configureWalrus(cfg: Partial<WalrusConfig>): void {
  activeConfig = { ...activeConfig, ...cfg };
}

export function getWalrusConfig(): WalrusConfig {
  return activeConfig;
}

/** 바이트를 Walrus에 저장하고 blobId를 반환. */
export async function walrusStore(data: Uint8Array, opts?: { epochs?: number }): Promise<string> {
  const cfg = activeConfig;
  const epochs = opts?.epochs ?? cfg.epochs ?? 1;
  const res = await fetch(`${cfg.publisher}/v1/blobs?epochs=${epochs}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: data as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Walrus 저장 실패 (HTTP ${res.status}). publisher=${cfg.publisher}, 데이터 크기=${data.length}B`);
  const json = (await res.json()) as Record<string, unknown>;
  const newlyCreated = json.newlyCreated as { blobObject?: { blobId?: string } } | undefined;
  const alreadyCertified = json.alreadyCertified as { blobId?: string } | undefined;
  const blobId = newlyCreated?.blobObject?.blobId ?? alreadyCertified?.blobId;
  if (!blobId) throw new Error(`Walrus 응답에 blobId 없음. 응답 키: ${Object.keys(json).join(', ')}`);
  return blobId;
}

/** blobId의 바이트를 Walrus에서 조회. */
export async function walrusFetch(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${activeConfig.aggregator}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus 조회 실패 (HTTP ${res.status}). blobId=${blobId}`);
  return new Uint8Array(await res.arrayBuffer());
}

// === 편의 헬퍼: 문자열 / JSON ===

const enc = new TextEncoder();
const dec = new TextDecoder();

/** UTF-8 문자열을 저장하고 blobId 반환. */
export async function walrusStoreString(text: string, opts?: { epochs?: number }): Promise<string> {
  return walrusStore(enc.encode(text), opts);
}

/** blobId의 내용을 UTF-8 문자열로 조회. */
export async function walrusFetchString(blobId: string): Promise<string> {
  return dec.decode(await walrusFetch(blobId));
}

/** JSON 직렬화 가능한 값을 저장하고 blobId 반환. */
export async function walrusStoreJson(value: unknown, opts?: { epochs?: number }): Promise<string> {
  return walrusStoreString(JSON.stringify(value), opts);
}

/** blobId의 내용을 JSON으로 파싱해 조회. */
export async function walrusFetchJson<T = unknown>(blobId: string): Promise<T> {
  return JSON.parse(await walrusFetchString(blobId)) as T;
}

// === PII 저장(이름·사진 등) — Seal 암호화 자리 표시 ===

export type EncryptFn = (plain: Uint8Array) => Promise<Uint8Array>;

/**
 * 민감 콘텐츠(이름·사진)를 Walrus에 저장하고 blobId 반환.
 * encrypt가 주어지면 암호화 후 저장(권장). 없으면 평문 저장 + 경고(보안 후속: Seal).
 */
export async function walrusStorePII(
  data: Uint8Array,
  opts?: { encrypt?: EncryptFn; epochs?: number },
): Promise<string> {
  if (opts?.encrypt) {
    return walrusStore(await opts.encrypt(data), { epochs: opts?.epochs });
  }
  // Seal 암호화 미적용 — 운영 전 encrypt 콜백 주입 필요
  return walrusStore(data, { epochs: opts?.epochs });
}

/**
 * 민감 문자열(사람 이름 등)을 Walrus에 저장하고 blobId 반환.
 * 이름은 온체인 평문 금지(VISION §7) → Walrus 블롭으로 올리고 온체인엔 이 blobId 참조만 남긴다
 * (guestbook::write_message의 guest_name 필드 등).
 *
 * ⚠️ **혼동 주의(기밀성 아님)**: encrypt가 없으면 {@link walrusStorePII}와 같이 평문 블롭으로 저장된다.
 *    이 blobId를 *공개* 체인에 남기면 누구나 공개 aggregator(GET /v1/blobs/{blobId})로 원본 이름을
 *    그대로 복원할 수 있다. 즉 이 함수는 **온체인 "필드"에서 평문을 빼낼 뿐, 이름을 기밀로 만들지는 않는다.**
 *    진짜 기밀성은 encrypt(예: Seal)로 암호화 후 저장해야 얻는다(메시지 본문과 동일한 전환기 posture — 후속 과제).
 */
export async function walrusStorePIIString(
  text: string,
  opts?: { encrypt?: EncryptFn; epochs?: number },
): Promise<string> {
  return walrusStorePII(enc.encode(text), opts);
}
