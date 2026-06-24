import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useMachine } from '@xstate/react';
import { loungeCheckInGateMachine } from '../machines/loungeCheckInGate.machine';
import type { CreateLoungeCheckInRequest } from '../types/db-compat';
import { useAuth } from '../providers/AuthContext';
import { useGetMe } from '../queries/shared/useGetMe';
import { useCheckMyCheckIn } from '../queries/lounge-check-in-gate/useCheckMyCheckIn';
import { useCreateLoungeCheckIn } from '../queries/lounge-check-in-gate/useCreateLoungeCheckIn';
import { useUpdateMe } from '../queries/lounge-check-in-gate/useUpdateMe';
import { useOnchainCheckIn } from '../hooks/useOnchainCheckIn';

type RecipientSlot = NonNullable<CreateLoungeCheckInRequest['recipient_slot']>;
type RelationCategory = NonNullable<CreateLoungeCheckInRequest['relation_category']>;

const RECIPIENT_OPTIONS: { slot: RecipientSlot; label: string }[] = [
  { slot: 'groom', label: '신랑' },
  { slot: 'bride', label: '신부' },
  { slot: 'groom_father', label: '신랑 아버지' },
  { slot: 'groom_mother', label: '신랑 어머니' },
  { slot: 'bride_father', label: '신부 아버지' },
  { slot: 'bride_mother', label: '신부 어머니' },
];

const RELATION_CATEGORIES: RelationCategory[] = [
  '가족/친척', '친구/지인', '동문/동창', '직장동료', '스승/제자', '기타모임',
];

export function LoungeCheckInGatePage() {
  const { loungeId } = useParams<{ loungeId: string }>();
  const navigate = useNavigate();
  const { session, isReady } = useAuth();
  const [state, send] = useMachine(loungeCheckInGateMachine);
  const { data: me } = useGetMe();

  // C2: 비로그인 게스트가 입장 게이트 진입 시 me/check-in 401로 에러 페이지가 뜨던 문제 →
  // 미인증이면 로그인으로 보내고, 로그인 후 이 게이트(/lounge/:id/enter)로 복귀시킨다.
  useEffect(() => {
    if (isReady && !session && loungeId) {
      // enter URL의 쿼리스트링(guest-web에서 실어온 이름·수신인·관계)을 보존해야
      // 로그인 복귀 후 재입력 없이 자동 입장된다. path만 인코딩하면 정보가 유실됨.
      const returnTo = `/lounge/${loungeId}/enter${window.location.search}`;
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [isReady, session, loungeId, navigate]);

  // ---- 데이터 훅 ----
  // 미인증 상태에서는 check-in 조회를 막아 401을 피한다(로그인 후 session 생기면 재개).
  const checkQuery = useCheckMyCheckIn(loungeId, state.matches('checking') && !!session);
  const createEntry = useCreateLoungeCheckIn();
  const updateMe = useUpdateMe();
  // 온체인 참석 기록(participate) — DB 체크인 성공 후 best-effort 발행.
  const participateOnchain = useOnchainCheckIn();

  // ---- guest-web에서 실어온 하객 정보(enter URL 쿼리파라미터) 파싱 ----
  // guest-web GuestFlow가 이미 입력한 이름·수신인·관계를 받아 재입력을 없앤다.
  // 허용 enum 밖의 값은 무시(null)해 부정 입력을 막는다.
  const [searchParams] = useSearchParams();
  const qpName = searchParams.get('name')?.trim() || null;
  const qpRecipientRaw = searchParams.get('recipient_slot');
  const qpRelationRaw = searchParams.get('relation_category');
  const qpDetail = searchParams.get('relation_detail')?.trim() ?? '';
  const qpRecipient = RECIPIENT_OPTIONS.some((o) => o.slot === qpRecipientRaw)
    ? (qpRecipientRaw as RecipientSlot)
    : null;
  const qpRelation = (RELATION_CATEGORIES as string[]).includes(qpRelationRaw ?? '')
    ? (qpRelationRaw as RelationCategory)
    : null;
  // 수신인·관계가 모두 유효하게 실려오면 = guest-web 경유 입장 → 자동 입장 트리거 대상.
  const hasQueryPrefill = qpRecipient !== null && qpRelation !== null;

  // ---- 폼 상태 ----
  // displayName은 사용자가 입력하기 전엔 (쿼리파라미터 →) 계정 이름을 그대로 보여준다. 사용자가 한 번이라도
  // 타이핑하면 override가 set되어 그 값이 우선 — 빈 문자열로 지우는 것도 사용자 의도로 본다.
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(qpName);
  const displayName = displayNameOverride ?? me?.name ?? '';
  const [recipientSlot, setRecipientSlot] = useState<RecipientSlot | null>(qpRecipient);
  const [relationCategory, setRelationCategory] = useState<RelationCategory | null>(qpRelation);
  const [relationDetail, setRelationDetail] = useState(qpDetail);

  const isFormValid =
    displayName.trim().length > 0 && recipientSlot !== null && relationCategory !== null;

  // ---- LoungeCheckIn 존재 여부 확인: useCheckMyCheckIn 결과 → machine ----
  useEffect(() => {
    if (!state.matches('checking')) return;
    if (checkQuery.isSuccess) {
      const entry = checkQuery.data;
      if (entry) {
        send({ type: 'CHECK_SUCCESS', entryId: entry.id });
      } else {
        send({ type: 'CHECK_NOT_FOUND' });
      }
    } else if (checkQuery.isError) {
      send({ type: 'CHECK_ERROR', error: '확인 중 오류가 발생했습니다.' });
    }
    // send는 xstate actor가 보장하는 안정 참조. state(snapshot 전체)는 의존성에 넣으면
    // 매 micro-tick마다 effect 재실행되어 무한 fetch 위험 — state.value만으로 충분.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value, checkQuery.isSuccess, checkQuery.isError, checkQuery.data, send]);

  // ---- hasEntry / done → 라운지로 이동 ----
  useEffect(() => {
    if (!loungeId) return;
    if (state.matches('hasEntry') || state.matches('done')) {
      navigate(`/lounge/${loungeId}/v2`, { replace: true });
    }
    // state.value 변화만 보면 충분 — state 전체를 deps에 넣으면 무한 재실행.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value, loungeId, navigate]);

  // ---- 제출: (필요 시) 계정 이름 갱신 → createLoungeCheckIn ----
  const handleSubmit = async () => {
    if (!loungeId || !isFormValid || !recipientSlot || !relationCategory) return;

    send({ type: 'SUBMIT' });

    try {
      const trimmedName = displayName.trim();
      if (trimmedName && trimmedName !== me?.name) {
        try {
          await updateMe.mutateAsync({ name: trimmedName });
        } catch {
          send({ type: 'SUBMIT_ERROR', error: '이름 저장에 실패했습니다.' });
          return;
        }
      }

      const entry = await createEntry.mutateAsync({
        loungeId,
        body: {
          recipient_slot: recipientSlot,
          relation_category: relationCategory,
          relation_detail: relationDetail.trim() || undefined,
        },
      });
      // 온체인 참석 기록(participate) — 비차단 best-effort. 실패해도 DB 체크인·입장은 그대로 진행.
      void participateOnchain(loungeId);
      send({ type: 'SUBMIT_SUCCESS', entryId: entry.id });
    } catch {
      send({ type: 'SUBMIT_ERROR', error: '입장에 실패했습니다.' });
    }
  };

  // ---- 자동 입장: guest-web에서 정보가 실려왔고 폼이 유효하면 입력 화면 없이 1회 자동 제출 ----
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (!state.matches('form')) return;
    if (hasQueryPrefill && isFormValid) {
      autoSubmittedRef.current = true;
      void handleSubmit();
    }
    // handleSubmit은 매 렌더 재생성되나 ref 가드로 1회만 실행. state.value 변화만 추적.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value, hasQueryPrefill, isFormValid]);

  // 자동 입장 진행 중(쿼리 prefill 유효 + 폼/제출 단계)에는 입력 화면 대신 로딩만 보인다.
  const isAutoEntering =
    hasQueryPrefill && isFormValid && (state.matches('form') || state.matches('submitting'));

  // ---- 로딩 상태 ----
  if (state.matches('checking')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-base text-muted">확인 중...</p>
      </div>
    );
  }

  if (isAutoEntering) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-base text-muted">입장 중...</p>
      </div>
    );
  }

  // ---- 에러 상태 ----
  if (state.matches('error')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-4">
        <p className="text-base text-red-600">{state.context.error}</p>
        <button
          onClick={() => send({ type: 'RETRY' })}
          className="rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ---- 관계 정보 입력 폼 ----
  return (
    <div className="flex min-h-screen flex-col bg-white max-w-lg mx-auto">
      <div className="px-6 py-8">
        <h1 className="text-[24px] font-semibold text-navy mb-2">라운지 입장</h1>
        <p className="text-sm text-muted mb-8">웨딩 라운지에 입장하기 전에 본인 정보를 알려주세요.</p>

        {/* 이름 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-navy mb-2">이름</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayNameOverride(e.target.value)}
            maxLength={20}
            placeholder="이름을 입력해주세요"
            className="w-full rounded-xl border border-line px-4 py-3 text-base text-navy placeholder:text-muted focus:border-navy focus:outline-none"
          />
        </div>

        {/* 수신인 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-navy mb-3">누구 측 하객인가요?</label>
          <div className="grid grid-cols-2 gap-2">
            {RECIPIENT_OPTIONS.map(({ slot, label }) => (
              <button
                key={slot}
                onClick={() => setRecipientSlot(slot)}
                className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                  recipientSlot === slot
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-navy hover:border-soft-sky'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 관계 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-navy mb-3">관계</label>
          <div className="grid grid-cols-3 gap-2">
            {RELATION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setRelationCategory(cat)}
                className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  relationCategory === cat
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-navy hover:border-soft-sky'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 관계 상세 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-navy mb-2">관계 상세 (선택)</label>
          <input
            type="text"
            value={relationDetail}
            onChange={(e) => setRelationDetail(e.target.value)}
            maxLength={40}
            placeholder="예: 고등학교 동창, 회사 팀원"
            className="w-full rounded-xl border border-line px-4 py-3 text-sm text-navy placeholder:text-muted focus:border-navy focus:outline-none"
          />
        </div>

        {/* 에러 메시지 */}
        {state.context.error && (
          <p className="text-sm text-red-600 mb-4">{state.context.error}</p>
        )}

        {/* 제출 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || state.matches('submitting')}
          className={`w-full rounded-xl py-3.5 text-base font-semibold transition-colors ${
            isFormValid && !state.matches('submitting')
              ? 'bg-navy text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {state.matches('submitting') ? '입장 중...' : '라운지 입장하기'}
        </button>
      </div>
    </div>
  );
}
