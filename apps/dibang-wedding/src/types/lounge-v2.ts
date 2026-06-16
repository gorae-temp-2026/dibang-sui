// 웨딩 라운지 V2 — 표현(presentational) 타입.
//
// 서버 타입(FeedItem 등)은 @gorae/contracts 생성 타입을 import해서만 사용한다
// (data-fetching.md: 타입 수동 선언 금지). 여기엔 V2 화면이 피드를
// 클라이언트에서 재가공한 결과 형태만 정의한다.

import type { FeedItem, FeedItemType } from '@gorae/contracts';

/** 모이는 중 로그 행의 활동 종류
 *  memory: Memory Domain Split 후 추가된 라운지 V2 "온기" 게시물 (text + 0/1 photo).
 *  feed:   레거시 GuestbookMessage(LIVE 축하메세지) — 현장 QR 전용으로 책임 환원. */
export type LogKind = 'checkin' | 'enter' | 'post' | 'feed' | 'memory';

/** feed type → 로그 종류 매핑 (핸드오프 §4-6 규칙) */
export const FEED_TYPE_TO_LOG: Record<FeedItemType, LogKind> = {
  guestbook_entry: 'checkin',
  lounge_check_in: 'enter',
  host_announcement: 'post',
  guestbook_message: 'feed',
  memory: 'memory',
};

/** 로그 종류별 표시 라벨 */
export const LOG_LABEL: Record<LogKind, string> = {
  checkin: 'Check-in',
  enter: 'Entry',
  post: 'Post',
  feed: 'Message',
  memory: 'Memory',
};

/** 온기(체온°) 계산 가중치 — 핸드오프 §3 공식 */
export const WARMTH_BASE = 36.5;
export const WARMTH_CAP = 100;
export const WARMTH_WEIGHT: Record<LogKind, number> = {
  checkin: 0.1,
  enter: 0.1,
  post: 0.3,
  feed: 0.4,
  memory: 0.4,
};

/** 모이는 중 로그 한 줄 */
export interface LogRow {
  id: string;
  kind: LogKind;
  label: string;
  actorName: string;
  relation: string;
  message: string;
  createdAt: string;
}

/** 온기 스토리 strip — 작성자별 글 묶음 */
export interface StoryGroup {
  authorKey: string;
  authorName: string;
  relation: string;
  /** 활성(메시지/피드 보유) 여부 — true면 회전 링 + 스토리, false면 비인터랙티브 */
  hasFeed: boolean;
  items: FeedItem[];
  /** 최신 활동 시각(입장 포함). 비활성끼리 정렬용 */
  latestAt: string;
  /** 활성 항목(메시지/피드)만의 최신 시각. 비활성이면 ''. 활성끼리 정렬용 */
  latestActiveAt: string;
}
