// 웨딩 라운지 V2 — 표현(presentational) 타입.
//
// 서버 타입(FeedItem 등)은 @gorae/contracts 생성 타입을 import해서만 사용한다
// (data-fetching.md: 타입 수동 선언 금지). 여기엔 V2 화면이 피드를
// 클라이언트에서 재가공한 결과 형태만 정의한다.

import type { FeedItem, FeedItemType } from './db-compat';

/** 모이는 중 로그 행의 활동 종류
 *  memory: Memory Domain Split 후 추가된 라운지 V2 "온기" 게시물 (text + 0/1 photo).
 *  feed:   레거시 GuestbookMessage(LIVE 축하메세지) — 현장 QR 전용으로 책임 환원. */
export type LogKind = 'checkin' | 'enter' | 'post' | 'feed' | 'memory' | 'event';

/** feed type → 로그 종류 매핑 (핸드오프 §4-6 규칙).
 *  FeedItemType(서버 생성타입) 완전성 유지 + 'lounge_event'(클라 데모 알림: 들러리 선정·디방화환 선물)는
 *  contracts 무수정 원칙상 string 확장으로 허용한다(devFixtures가 as-cast로 주입). */
export const FEED_TYPE_TO_LOG: Record<FeedItemType, LogKind> & Record<string, LogKind> = {
  guestbook_entry: 'checkin',
  lounge_check_in: 'enter',
  host_announcement: 'post',
  guestbook_message: 'feed',
  memory: 'memory',
  lounge_event: 'event',
};

/** 로그 종류별 표시 라벨 */
export const LOG_LABEL: Record<LogKind, string> = {
  checkin: 'Check-in',
  enter: 'Entry',
  post: 'Post',
  feed: 'Message',
  memory: 'Memory',
  event: 'Event',
};

// 우리의 온기 = 이 라운지(이벤트) 내 기여 행동의 가중합(network contribution).
// Moi Credit과 1·2층 가중치 공유(개인=Moi Credit / 모임=우리의 온기). 행동 tier:
//   부조·들러리선물=큰 EM / 선물=중 / 방명록·축하메시지·메모리·체크인=CS / 이음·하트=소.
// 현재 피드 신호는 CS 계열(메시지·메모리·공지)+체크인만 도달 → 아래 가중치(시드 38.6° 유지).
export const WARMTH_BASE = 36.5;
export const WARMTH_CAP = 100;
export const WARMTH_WEIGHT: Record<LogKind, number> = {
  checkin: 0.1, // 체크인 = 소
  enter: 0.1, // 입장 = 소
  post: 0.3, // 공지 = CS
  feed: 0.4, // 축하메시지 = CS
  memory: 0.4, // 메모리 = CS
  event: 0, // 들러리 선정·선물 알림 = 피드 표기 전용(온기 가중은 EM 정식 연결 시 — 데모 38.6° 유지)
};
/** 단일축 단계식 — 온기를 N단계로(공간 링·밝기 반응). 정밀 °는 KPI 텍스트. */
export const WARMTH_STEPS = 5;

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
