// 웨딩 라운지 V2 — 피드 순수 변환 로직.
//
// 서버 피드(FeedItem[])를 V2 화면용 형태로 재가공하는 순수 함수 모음.
// hook(useWarmth 등)은 이 함수들을 useMemo로 감싸기만 한다.
// 테스트·재사용을 위해 React 의존 없이 분리.

import type { FeedItem } from '@gorae/contracts';
import { env } from '../env';
import { SIDE_LABEL } from './guestLabel';
import {
  FEED_TYPE_TO_LOG,
  LOG_LABEL,
  WARMTH_BASE,
  WARMTH_CAP,
  WARMTH_WEIGHT,
  type LogRow,
  type StoryGroup,
} from '../types/lounge-v2';

type Data = Record<string, unknown>;

function data(item: FeedItem): Data {
  return (item.data ?? {}) as Data;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** 관계 텍스트 조합 — role(누구측) + category + detail 합성.
 *  형식: 소유격 "신랑의 친구/지인 · 대학교 동기"
 *  예: ("groom","친구/지인","대학교 동기") → "신랑의 친구/지인 · 대학교 동기"
 *      ("bride","가족/친척","언니") → "신부의 가족/친척 · 언니"
 *      ("groom",-,-) → "신랑"
 *      (-,"친구/지인","대학교 동기") → "친구/지인 · 대학교 동기" */
function relationText(d: Data): string {
  const rawRole = str(d.host_role) || str(d.recipient_slot);
  // host_role/recipient_slot은 'groom' 등 영문 코드 → 한글 라벨로 표시
  const role = rawRole ? (SIDE_LABEL[rawRole] ?? rawRole) : '';
  const category = str(d.relation_category);
  const detail = str(d.relation_detail);
  const parts: string[] = [];
  if (role && category) parts.push(`${role}의 ${category}`);
  else if (role) parts.push(role);
  else if (category) parts.push(category);
  if (detail) parts.push(detail);
  return parts.join(' · ');
}

/** 피드 아이템의 행위자 이름 (타입별 필드가 달라 통합 추출) */
export function feedActorName(item: FeedItem): string {
  const d = data(item);
  return (
    str(d.guest_name) ||
    str(d.visitor_name) ||
    str(d.author_name) ||
    '익명'
  );
}

/** 작성자 그룹 키 (이름 기반 — 사진/ID 없는 MVP) */
function authorKey(item: FeedItem): string {
  return feedActorName(item) + '|' + relationText(data(item));
}

const ACTION_PHRASE: Record<string, string> = {
  checkin: '현장에 참석했어요',
  enter: '라운지에 입장했어요',
  post: '글을 올렸어요',
  feed: '축하메세지를 남겼어요',
  memory: '메모리를 올렸어요',
};

/** FeedItem → 모이는 중 로그 한 줄 */
export function toLogRow(item: FeedItem): LogRow {
  const kind = FEED_TYPE_TO_LOG[item.type];
  const d = data(item);
  return {
    id: item.id,
    kind,
    label: LOG_LABEL[kind],
    actorName: feedActorName(item),
    relation: relationText(d),
    message: ACTION_PHRASE[kind],
    createdAt: item.created_at,
  };
}

/** 활동량 → 체온°(36.5 base, 100 cap). 핸드오프 §3 공식 */
export function computeWarmth(items: FeedItem[]): number {
  let t = WARMTH_BASE;
  for (const item of items) {
    const kind = FEED_TYPE_TO_LOG[item.type];
    t += WARMTH_WEIGHT[kind];
  }
  return Math.min(WARMTH_CAP, Math.round(t * 10) / 10);
}

/** 스토리 뷰어/피드 카드 본문 텍스트 추출.
 *  Memory: data.text 우선(domain split 후 신규 도메인) / LIVE 축하메세지: data.message / Announcement: data.message.
 *  하트 전용 __HEART__는 표시 안 함. */
export function liveMessageText(item: FeedItem): string {
  const d = data(item);
  const msg = str(d.text) || str(d.message);
  return msg === '__HEART__' ? '' : msg;
}

/** 피드 글 첨부 사진 URL (없으면 '').
 *  DB는 object key를 저장하고 서버가 조회 시 URL로 조립한다(STORAGE.md).
 *  여기의 조립은 방어선 — 서버 조립을 우회한 raw key가 도달해도(예: 향후
 *  Realtime payload 직사용) 이미지가 깨지지 않게 같은 규칙을 적용한다.
 *  절대 URL(서버 조립·레거시 행)은 그대로 통과.
 *  버킷명 하드코딩은 sharedPhotoUrl.ts 선례를 따름. */
export function feedPhotoUrl(item: FeedItem): string {
  const ref = str(data(item).photo_url);
  if (!ref || ref.includes('://')) return ref;
  return `${env.VITE_SUPABASE_URL}/storage/v1/object/public/v3-uploads-public/${ref}`;
}

/** 피드 글 조회수 (서버 집계, 없으면 0). */
export function feedViewCount(item: FeedItem): number {
  const v = data(item).view_count;
  return typeof v === 'number' ? v : 0;
}

/** 작성자별 스토리 그룹.
 *  hasFeed=true 조건 = "온기" 카드(동그라미)로 띄울 가치 있는 글 보유.
 *  Memory Domain Split 확정: "온기" = Memory + host_announcement만.
 *  LIVE 축하메세지(guestbook_message)는 하단 LiveCelebration 영역 단독으로 분리. */
export function buildStoryGroups(items: FeedItem[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const item of items) {
    const isFeedPost =
      item.type === 'memory' || item.type === 'host_announcement';
    const key = authorKey(item);
    const existing = map.get(key);
    if (existing) {
      if (isFeedPost) {
        existing.hasFeed = true;
        existing.items.push(item);
        if (item.created_at > existing.latestActiveAt) {
          existing.latestActiveAt = item.created_at;
        }
      }
      if (item.created_at > existing.latestAt) existing.latestAt = item.created_at;
    } else {
      map.set(key, {
        authorKey: key,
        authorName: feedActorName(item),
        relation: relationText(data(item)),
        hasFeed: isFeedPost,
        items: isFeedPost ? [item] : [],
        latestAt: item.created_at,
        latestActiveAt: isFeedPost ? item.created_at : '',
      });
    }
  }
  // 프로필 내 글은 created_at 오름차순(오래된→최신) — 인스타 스토리식 진행.
  for (const g of map.values()) {
    g.items.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }
  // 인스타 스토리식 정렬: 활성(메시지/피드 보유) 우선 → 활성끼리 메시지/피드
  // 최신순(입장 시각 무관) → 비활성(입장만)은 뒤, 그들끼리 최신 활동순.
  return [...map.values()].sort((a, b) => {
    if (a.hasFeed !== b.hasFeed) return a.hasFeed ? -1 : 1;
    if (a.hasFeed) return a.latestActiveAt < b.latestActiveAt ? 1 : -1;
    return a.latestAt < b.latestAt ? 1 : -1;
  });
}

/** ISO 시각 → "방금 전 / 12분 전 / 3시간 전 / 어제 / 5일 전" */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, (Date.now() - then) / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  return `${day}일 전`;
}
