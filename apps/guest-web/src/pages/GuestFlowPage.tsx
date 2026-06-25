import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useMachine } from '@xstate/react';
import { AnimatePresence, motion } from 'framer-motion';
import { getWeddingOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { guestFlowMachine } from '../machines/guestFlow.machine';
import type { RecipientSlot, RelationCategory, PayMethod } from '../machines/guestFlow.machine';
import type { Account } from '@gorae/contracts';
import { StepRecipient } from '../components/guest-flow/StepRecipient';
import { StepNameRelation } from '../components/guest-flow/StepNameRelation';
import { StepAmount } from '../components/guest-flow/StepAmount';
import { StepTransfer } from '../components/guest-flow/StepTransfer';
import { StepMessage } from '../components/guest-flow/StepMessage';
import { StepDoneV2 } from '../components/guest-flow/StepDoneV2';
import { StepIndicator } from '../components/guest-flow/StepIndicator';
import { EnvelopeSendingOverlay } from '../components/guest-flow/EnvelopeSendingOverlay';
import { useGuestFlowSubmitter } from '../hooks/guestFlow/useGuestFlowSubmitter';
import { useBodyStyleScope } from '../hooks/useBodyStyleScope';
import { useDibangNavigator } from '../hooks/useDibangNavigator';
import { useZkLogin } from '../providers/ZkLoginProvider';
import { stepEnter, serif, colors } from '../styles/tokens';
import { trackEvent } from '../lib/analytics';
import { useT } from '../lib/i18n';


type IndicatorStep = 'recipient' | 'name' | 'amount' | 'transfer' | 'message' | 'done';

function getIndicatorStep(stateValue: string): IndicatorStep {
  if (stateValue === 'recipient') return 'recipient';
  if (stateValue === 'name' || stateValue === 'creating') return 'name';
  if (stateValue === 'amount') return 'amount';
  if (stateValue === 'transfer' || stateValue === 'transferring') return 'transfer';
  if (stateValue === 'message' || stateValue === 'sendingMessage') return 'message';
  return 'done';
}

function getStepKey(stateValue: string): string {
  if (stateValue === 'recipient') return 'recipient';
  if (stateValue === 'name' || stateValue === 'creating') return 'name';
  if (stateValue === 'amount') return 'amount';
  if (stateValue === 'transfer' || stateValue === 'transferring') return 'transfer';
  if (stateValue === 'message' || stateValue === 'sendingMessage') return 'message';
  if (stateValue === 'done') return 'done';
  return 'unknown';
}

export function GuestFlowPage() {
  // body의 청첩장 전용 스타일을 게스트 플로우에서는 제거.
  // (UI/데이터 분리 1-D: useBodyStyleScope 훅으로 캡슐화, DisplayPage와 동형 패턴)
  useBodyStyleScope({
    padding: '0',
    alignItems: 'stretch',
    background: colors.bgWarm,
  });

  const navigator = useDibangNavigator();
  const zk = useZkLogin();
  const t = useT();

  const [searchParams] = useSearchParams();
  const weddingId = searchParams.get('weddingId');

  const {
    data: wedding,
    isLoading,
    isError,
  } = useQuery({
    ...getWeddingOptions({ path: { weddingId: weddingId! } }),
    enabled: !!weddingId,
  });

  const [state, send] = useMachine(guestFlowMachine, {
    input: { weddingId: weddingId ?? '' },
  });

  // 머신 상태 진입 → mutation 자동 발사 + send 이벤트 (StrictMode 가드 포함)
  // 데이터 책임(SDK 호출 + send 이벤트 합성)은 훅 안에 캡슐화. page는 렌더에만 집중.
  useGuestFlowSubmitter(state, send, wedding);

  // A/B 종료(v2 승격) 분석: done 화면 노출 1회 수집 — variant 태깅은 유지
  const isDone = state.matches('done');
  useEffect(() => {
    if (isDone) trackEvent('guest_done_view', { variant: 'v2', wedding_id: weddingId ?? undefined });
  }, [isDone, weddingId]);

  // --- weddingId 없음 ---
  if (!weddingId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: 16, color: '#E8465A' }}>
          {t('guestFlow.page.badAccess')}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: 16, color: colors.textMuted }}>{t('guestFlow.page.loading')}</p>
      </div>
    );
  }

  if (isError || !wedding) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: 16, color: '#E8465A' }}>
          {t('guestFlow.page.notFound')}
        </p>
      </div>
    );
  }

  const loungeId = wedding.lounge.id;

  // --- SUBMIT_NAME → 머신 creating 진입 → 위 effect가 POST /guestbook 1회 발사 ---
  const handleSubmitName = (name: string, category: RelationCategory, detail: string) => {
    send({ type: 'SUBMIT_NAME', name, category, detail });
  };

  // --- CONFIRM_TRANSFER → 머신 transferring 진입 → 위 effect가 POST /cash-gifts 1회 발사 ---
  const handleConfirmTransfer = (payMethod: PayMethod) => {
    send({ type: 'CONFIRM_TRANSFER', payMethod });
  };

  // --- SEND_MESSAGE → 머신 sendingMessage 진입 → 위 effect가 POST .../message 1회 발사 ---
  const handleSendMessage = (message: string) => {
    send({ type: 'SEND_MESSAGE', message });
  };

  // --- SEND_HEART → 머신 sendingMessage 진입(pendingMessage='__HEART__') → effect 1회 발사 ---
  const handleSendHeart = () => {
    send({ type: 'SEND_HEART' });
  };

  const stateValue = state.value as string;
  const indicatorStep = getIndicatorStep(stateValue);
  const stepKey = getStepKey(stateValue);
  const showIndicator = !state.matches('recipient');

  // --- 스텝 렌더링 ---
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {!zk.isAuthenticated && (
        <div style={{ padding: '12px 16px', background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...serif, fontSize: 13, color: '#fff' }}>{t('guestFlow.loginNeededForSui')}</span>
          <button
            type="button"
            onClick={() => zk.login(window.location.href)}
            style={{ background: '#F8C57A', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#5a3a12', cursor: 'pointer' }}
          >
            {t('guestFlow.page.googleLogin')}
          </button>
        </div>
      )}
      {showIndicator && (
        <StepIndicator
          step={indicatorStep}
          onBack={() => send({ type: 'BACK' })}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div key={stepKey} {...stepEnter} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {state.matches('recipient') && (
            <StepRecipient
              wedding={wedding}
              onSelect={(slot: RecipientSlot, label: string) =>
                send({ type: 'SELECT_RECIPIENT', slot, label })
              }
            />
          )}

          {(state.matches('name') || state.matches('creating')) && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepNameRelation
                hostLabel={state.context.hostLabel}
                onSubmit={handleSubmitName}
                isSubmitting={state.matches('creating')}
              />
              {state.matches('creating') && (
                <div style={{ padding: '0 24px', textAlign: 'center' }}>
                  <p style={{ ...serif, fontSize: 14, color: colors.textSubtle }}>{t('guestFlow.page.recordingAttendance')}</p>
                </div>
              )}
              {state.context.error && state.matches('name') && (
                <div style={{ padding: '0 24px' }}>
                  <p style={{ ...serif, fontSize: 14, color: '#E8465A' }}>{state.context.error}</p>
                </div>
              )}
            </div>
          )}

          {state.matches('amount') && (() => {
            const ACCOUNT_KEYS: Record<RecipientSlot, keyof typeof wedding.info> = {
              groom: 'groom_account', bride: 'bride_account',
              groom_father: 'groom_father_account', groom_mother: 'groom_mother_account',
              bride_father: 'bride_father_account', bride_mother: 'bride_mother_account',
            };
            const slot = state.context.recipientSlot!;
            const account = wedding.info[ACCOUNT_KEYS[slot]] as Account | undefined;
            const hasAccount = !!(account?.bank && account?.address);
            return (
              <StepAmount
                onSelectAmount={(amount: number) => send({ type: 'SELECT_AMOUNT', amount })}
                onAlreadyPaid={() => send({ type: 'ALREADY_PAID' })}
                onSkip={() => send({ type: 'SKIP_AMOUNT' })}
                hasAccount={hasAccount}
                hostLabel={state.context.hostLabel}
              />
            );
          })()}

          {(state.matches('transfer') || state.matches('transferring')) && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepTransfer
                wedding={wedding}
                recipientSlot={state.context.recipientSlot!}
                amount={state.context.amount}
                onConfirm={handleConfirmTransfer}
                onDeepLinkNavigate={navigator.goToUrl}
                isSubmitting={state.matches('transferring')}
              />
              {state.matches('transferring') && (
                <div style={{ padding: '0 24px', textAlign: 'center' }}>
                  <p style={{ ...serif, fontSize: 14, color: colors.textSubtle }}>{t('guestFlow.page.recordingGift')}</p>
                </div>
              )}
              {state.context.error && (
                <div style={{ padding: '0 24px' }}>
                  <p style={{ ...serif, fontSize: 14, color: '#E8465A' }}>{state.context.error}</p>
                </div>
              )}
            </div>
          )}

          {(state.matches('message') || state.matches('sendingMessage')) && (
            <StepMessage
              onSendMessage={handleSendMessage}
              onSendHeart={handleSendHeart}
              error={state.context.error}
              isSubmitting={state.matches('sendingMessage')}
            />
          )}

          {state.matches('done') && (
            <StepDoneV2
              groomSideCount={wedding.lounge.groom_side_guest_count}
              brideSideCount={wedding.lounge.bride_side_guest_count}
              groomName={wedding.info.groom_name}
              brideName={wedding.info.bride_name}
              onGoToLounge={() => {
                // A/B 종료(v2 승격) 분석: 라운지 입장 클릭(전환) 수집 — variant 태깅은 유지
                trackEvent('lounge_enter_click', { variant: 'v2', wedding_id: weddingId ?? undefined });
                // Dibang Wedding 라운지 진입 게이트로 이동. 외부 도메인 nav는 useDibangNavigator 어댑터에 위임.
                // guest-web에서 입력한 하객 정보(이름·수신인·관계)를 함께 실어, 게이트에서 재입력 없이 입장하도록 한다.
                if (loungeId) {
                  navigator.goToLoungeEnter(loungeId, {
                    name: state.context.guestName,
                    recipient_slot: state.context.recipientSlot ?? undefined,
                    relation_category: state.context.relationCategory ?? undefined,
                    relation_detail: state.context.relationDetail || undefined,
                  });
                }
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <EnvelopeSendingOverlay
        visible={state.matches('sendingMessage')}
        onDone={() => {}}
      />
    </div>
  );
}
