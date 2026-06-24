/**
 * invitation 모듈 PTB 빌더.
 *
 * create_invitation: 모바일 청첩장 콘텐츠를 온체인 Invitation(공유 오브젝트)으로 남긴다.
 *
 * **PII 비온체인 원칙(VISION §7)**: 사람 이름(신랑·신부)·사진(커버)은 온체인 평문 금지 →
 * Walrus에 블롭으로 올리고 온체인엔 **blobId(참조)만** 남긴다. 즉 groom/bride 이름은
 * `walrusStorePIIString(name)`의 blobId, 커버 사진은 `walrusStore(bytes)`의 blobId를 넣는다
 * (memory·write_message·announcement와 동일 패턴 — "이름·사진 → Walrus → Sui 연결").
 *
 * 날짜·시간·예식장(slug 포함)은 공개 청첩장 링크에 그대로 노출되는 **비민감 구조 정보**라 평문으로 싣는다.
 * 단 **인사말(greeting)은 이름이 섞일 수 있는 자유 텍스트(PII 가능)** 이므로 이름·사진과 같이 Walrus blobId 참조로 우회한다
 * (방명록 본문과 동일 원칙). 민감(이름·사진·인사말)만 Walrus, 비민감 구조정보(날짜·시간·예식장·slug)는 평문.
 *
 * invitation.move 시그니처:
 *   create_invitation(wedding_id: ID, slug, groom_name, bride_name, date, time,
 *                     venue_name, venue_hall, cover_photo_url, greeting, clock, ctx) -> ID
 *   update_invitation(&mut Invitation, groom_name, bride_name, date, time,
 *                     venue_name, venue_hall, cover_photo_url, greeting, ctx)   // 생성자만
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

export interface CreateInvitationParams {
  /** 청첩장이 속한 결혼식 Wedding 객체 ID(값으로 전달 — create_invitation이 ID by-value를 받음). */
  weddingId: string;
  /** 공유 링크 식별자(공개·비민감). */
  slug: string;
  /** 신랑 이름의 Walrus blobId 참조(평문 아님). walrusStorePIIString(groomName)의 결과. 없으면 ''. */
  groomNameBlobId: string;
  /** 신부 이름의 Walrus blobId 참조(평문 아님). walrusStorePIIString(brideName)의 결과. 없으면 ''. */
  brideNameBlobId: string;
  /** 예식 날짜(공개·비민감 평문). */
  date: string;
  /** 예식 시간(공개·비민감 평문). */
  time: string;
  /** 예식장 이름(공개·비민감 평문). */
  venueName: string;
  /** 예식장 홀(공개·비민감 평문). */
  venueHall: string;
  /** 커버 사진의 Walrus blobId 참조(평문 아님). walrusStore(coverBytes)의 결과. 없으면 ''. */
  coverPhotoBlobId: string;
  /** 인사말의 Walrus blobId 참조(평문 아님 — 이름 섞일 수 있는 자유 텍스트). walrusStoreString(greeting)의 결과. 없으면 ''. */
  greeting: string;
}

export interface UpdateInvitationParams {
  /** 수정할 온체인 Invitation 공유 오브젝트 ID. */
  invitationId: string;
  groomNameBlobId: string;
  brideNameBlobId: string;
  date: string;
  time: string;
  venueName: string;
  venueHall: string;
  coverPhotoBlobId: string;
  greeting: string;
}

/**
 * 청첩장 생성 — `create_invitation(wedding_id, slug, groom_name, bride_name, date, time,
 * venue_name, venue_hall, cover_photo_url, greeting, clock)`.
 * groom_name·bride_name·cover_photo_url 자리에 Walrus blobId를 넣어 이름·사진을 온체인 평문으로 올리지 않는다.
 * 누구나 호출 가능(creator = 서명자). 발행된 Invitation 객체 ID는 트잭 object change로 조회.
 */
export function buildCreateInvitationTx(params: CreateInvitationParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('invitation', 'create_invitation'),
    arguments: [
      // ID by-value: BCS상 address와 동일(32바이트) → tx.pure.address로 직렬화.
      tx.pure.address(params.weddingId),
      tx.pure.string(params.slug),
      tx.pure.string(params.groomNameBlobId),
      tx.pure.string(params.brideNameBlobId),
      tx.pure.string(params.date),
      tx.pure.string(params.time),
      tx.pure.string(params.venueName),
      tx.pure.string(params.venueHall),
      tx.pure.string(params.coverPhotoBlobId),
      tx.pure.string(params.greeting),
      tx.object.clock(),
    ],
  });
  return tx;
}

/**
 * 청첩장 수정 — `update_invitation(inv, groom_name, bride_name, date, time,
 * venue_name, venue_hall, cover_photo_url, greeting)`. 생성자(서명자)만 가능.
 * 이름·커버는 create와 동일하게 Walrus blobId 참조를 넣는다.
 */
export function buildUpdateInvitationTx(params: UpdateInvitationParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('invitation', 'update_invitation'),
    arguments: [
      tx.object(params.invitationId),
      tx.pure.string(params.groomNameBlobId),
      tx.pure.string(params.brideNameBlobId),
      tx.pure.string(params.date),
      tx.pure.string(params.time),
      tx.pure.string(params.venueName),
      tx.pure.string(params.venueHall),
      tx.pure.string(params.coverPhotoBlobId),
      tx.pure.string(params.greeting),
    ],
  });
  return tx;
}
