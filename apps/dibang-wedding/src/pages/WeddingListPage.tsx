import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMachine } from '@xstate/react';
import { weddingListMachine } from '../machines/weddingList.machine';
import { useQuery } from '@tanstack/react-query';
import { getMyParticipatedWeddingsOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import type { ParticipatedWedding } from '@gorae/contracts';
import { colors, fonts } from '../lib/theme';
import { useJoinWeddingFromParam } from '../queries/wedding-list/useJoinWeddingFromParam';

function formatDday(dateStr: string): string {
  const wedding = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function formatDateKorean(dateStr: string, time?: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];
  let result = `${year}년 ${month}월 ${day}일 (${dayName})`;
  if (time) {
    const [h, m] = time.split(':');
    const hour = Number(h);
    const ampm = hour < 12 ? '오전' : '오후';
    const h12 = hour % 12 || 12;
    result += ` ${ampm} ${h12}:${m}`;
  }
  return result;
}

function EventCard({ wedding, onClick }: { wedding: ParticipatedWedding; onClick: () => void }) {
  const d = new Date(wedding.date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = d < today;
  const dday = formatDday(wedding.date);
  const hasPhoto = !!wedding.cover_image;
  const headerBg = isPast ? '#2D2D3F' : colors.textPrimary;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(26,23,20,0.1)',
        cursor: 'pointer',
        marginBottom: 16,
      }}
    >
      {/* 상단: 사진 + 오버레이 텍스트 */}
      <div
        style={{
          position: 'relative',
          height: hasPhoto ? 384 : undefined,
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          ...(!hasPhoto ? { backgroundColor: headerBg, paddingLeft: 24, paddingRight: 24, paddingTop: 24, paddingBottom: 20 } : {}),
        }}
      >
        {/* 배경: 사진 */}
        {hasPhoto && (
          <>
            <img
              src={wedding.cover_image}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 20%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, transparent 35%, rgba(15,11,8,0.62) 100%)',
              }}
            />
          </>
        )}

        {/* 콘텐츠 */}
        <div
          style={{
            position: hasPhoto ? 'absolute' : 'relative',
            ...(hasPhoto ? { inset: 0, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', paddingLeft: 24, paddingRight: 24, paddingTop: 24, paddingBottom: 20 } : {}),
          }}
        >
          {/* D-day 배지 (지난 결혼식은 '완료' 태그를 표시하지 않음. wrapper는 유지하여 space-between 레이아웃 보존) */}
          <div style={{ marginBottom: hasPhoto ? 0 : 20 }}>
            {!isPast && (
              <span
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#1A1714',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: 1,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 4,
                  paddingBottom: 4,
                  borderRadius: 999,
                }}
              >
                {dday}
              </span>
            )}
          </div>

          {/* 하단: 커플 이름 + 날짜 */}
          <div>
            <div
              style={{
                fontSize: 28,
                fontFamily: fonts.serifSemiBold.family,
                fontWeight: fonts.serifSemiBold.weight,
                color: '#FFFFFF',
                lineHeight: '34px',
              }}
            >
              {wedding.groom_name} & {wedding.bride_name}
            </div>
            <div style={{ marginTop: 8, fontSize: 16, color: '#FFFFFF' }}>
              {formatDateKorean(wedding.date, wedding.time)}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 흰색 영역 */}
      <div
        style={{
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: colors.bgCard,
          borderRadius: '0 0 16px 16px',
          borderLeft: `1px solid ${colors.borderWarm}`,
          borderRight: `1px solid ${colors.borderWarm}`,
          borderBottom: `1px solid ${colors.borderWarm}`,
        }}
      >
        {wedding.venue_name && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {wedding.venue_name}{wedding.venue_hall ? ` ${wedding.venue_hall}` : ''}
          </div>
        )}
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '12px 0 0', textAlign: 'right' }}>
          웨딩라운지 바로가기 ›
        </p>
      </div>
    </div>
  );
}

export function WeddingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const joinedRef = useRef(false);
  const joinWedding = useJoinWeddingFromParam();

  const weddingIdParam = searchParams.get('weddingId');
  const entryIdParam = searchParams.get('entryId');

  // weddingId param이 있으면 LoungeCheckIn 생성 + GuestbookEntry 연결
  useEffect(() => {
    if (!weddingIdParam || joinedRef.current) return;
    joinedRef.current = true;

    joinWedding.mutate(
      { weddingId: weddingIdParam, entryId: entryIdParam },
      {
        // success/error 무관: 원본은 try/catch로 에러 삼키고 항상 param 제거 → settled로 통일
        onSettled: () => {
          // URL에서 param 제거
          searchParams.delete('weddingId');
          searchParams.delete('entryId');
          setSearchParams(searchParams, { replace: true });
        },
      },
    );
  }, [weddingIdParam, entryIdParam, joinWedding, searchParams, setSearchParams]);

  const { data: weddings, isLoading: queryLoading } = useQuery({
    ...getMyParticipatedWeddingsOptions(),
  });
  // 페이지 로딩 flow는 머신(weddingList). 목록 분류(upcoming/past)는 파생 계산.
  const [state, send] = useMachine(weddingListMachine);
  useEffect(() => {
    if (!queryLoading) send({ type: 'LOAD_DONE' });
  }, [queryLoading, send]);
  const isLoading = state.matches('loading');

  const weddingList = Array.isArray(weddings) ? weddings : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = weddingList.filter((w) => new Date(w.date + 'T00:00:00') >= today);
  const past = weddingList.filter((w) => new Date(w.date + 'T00:00:00') < today);

  return (
    <div style={{ padding: '20px 24px' }}>
      <h1
        style={{
          fontSize: 28,
          fontFamily: fonts.serifSemiBold.family,
          fontWeight: fonts.serifSemiBold.weight,
          color: colors.textPrimary,
          margin: 0,
        }}
      >
        참여한 결혼식
      </h1>
      <div style={{ marginBottom: 24 }} />

      {/* 예정된 결혼식 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 2, color: colors.brand }}>
          예정된 결혼식
        </span>
        <span style={{ fontSize: 14, color: colors.textMuted }}>{isLoading ? '-' : upcoming.length}건</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textMuted }}>
          불러오는 중...
        </div>
      ) : upcoming.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 40,
            paddingBottom: 40,
            borderRadius: 16,
            border: `1.5px dashed ${colors.borderWarm}`,
          }}
        >
          <span style={{ fontSize: 16, color: colors.textMuted }}>예정된 결혼식이 없습니다</span>
        </div>
      ) : (
        upcoming.map((w) => (
          <EventCard key={w.id} wedding={w} onClick={() => navigate(`/lounge/${w.lounge_id}/v2`)} />
        ))
      )}

      {/* 구분선 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 36, marginBottom: 36 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: colors.borderWarm }} />
        <div style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.brand, opacity: 0.5 }} />
        <div style={{ width: 4, height: 4, borderRadius: 999, backgroundColor: colors.brand, opacity: 0.3 }} />
        <div style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.brand, opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, backgroundColor: colors.borderWarm }} />
      </div>

      {/* 지난 결혼식 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 2, color: colors.textSecondary }}>
          지난 결혼식
        </span>
        <span style={{ fontSize: 14, color: colors.textMuted }}>{isLoading ? '-' : past.length}건</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textMuted }}>
          불러오는 중...
        </div>
      ) : past.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 40,
            paddingBottom: 40,
            borderRadius: 16,
            border: `1.5px dashed ${colors.borderWarm}`,
          }}
        >
          <span style={{ fontSize: 16, color: colors.textMuted }}>지난 결혼식이 없습니다</span>
        </div>
      ) : (
        past.map((w) => (
          <EventCard key={w.id} wedding={w} onClick={() => navigate(`/lounge/${w.lounge_id}/v2`)} />
        ))
      )}
    </div>
  );
}
