import { colors } from '../../lib/theme';
import { sideLabel, formatGuestPrefix } from '../../lib/guestLabel';
import { useT, translate, useLangStore } from '../../lib/i18n';
import type { FeedItem } from '../../types/db-compat';

const lang = () => useLangStore.getState().lang;

interface ParticipantListModalProps {
  entries: FeedItem[];
  onClose: () => void;
}

function getEntryData(item: FeedItem) {
  const d = (item.data ?? {}) as Record<string, unknown>;
  return {
    visitorName: (d.visitor_name as string) ?? translate(lang(), 'feed.unknownPlain'),
    hostRole: d.host_role as string | undefined,
    recipientSlot: d.recipient_slot as string | undefined,
    relationCategory: d.relation_category as string | undefined,
    relationDetail: d.relation_detail as string | undefined,
  };
}

function getSubtitle(data: ReturnType<typeof getEntryData>): string {
  if (data.hostRole) {
    return sideLabel(data.hostRole);
  }
  const prefix = formatGuestPrefix(data.recipientSlot, data.relationCategory, data.relationDetail);
  return prefix || translate(lang(), 'feed.participant');
}

export function ParticipantListModal({ entries, onClose }: ParticipantListModalProps) {
  const t = useT();
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          maxHeight: '70vh',
          backgroundColor: colors.bgWarm,
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '20px 20px 12px',
            borderBottom: `1px solid ${colors.borderWarm}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            {t('feed.participants.title', { n: entries.length })}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: colors.textSecondary,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            X
          </button>
        </div>

        {/* 리스트 */}
        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
          {entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: colors.textMuted, fontSize: 14 }}>
              {t('feed.participants.empty')}
            </div>
          )}
          {entries.map((item) => {
            const data = getEntryData(item);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 20px',
                }}
              >
                {/* 이니셜 원형 */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#E8E0D8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    flexShrink: 0,
                  }}
                >
                  {data.visitorName.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: colors.textPrimary,
                      margin: 0,
                    }}
                  >
                    {data.visitorName}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      margin: 0,
                    }}
                  >
                    {getSubtitle(data)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
