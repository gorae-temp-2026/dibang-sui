import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm';
import type { SlugAvailability } from '../../queries/invitation/useSlugAvailability';
import { inputClass, slugStatusConfig } from './styles';
import { useT } from '../../lib/i18n';

/**
 * 슬러그 입력 모달 presentational.
 * (UI/데이터 분리 2-G: slug 가용성 조회는 상위 page가 흡수, 본 위젯은 props로 결과만 받음)
 *
 * zustand store(slug 값)는 폼 클라이언트 state라 위젯이 직접 읽고 쓰는 것 유지.
 * slugAvailability(서버 상태)는 page가 useSlugCheck로 계산해 주입.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  slugAvailability: SlugAvailability;
}

export function SlugModal({ open, onClose, onConfirm, isPending, slugAvailability }: Props) {
  const store = useInvitationForm();
  const t = useT();
  const config = slugStatusConfig[slugAvailability];
  const canConfirm = store.slug.trim().length >= 2 && slugAvailability === 'available';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-5">
        <h2 className="text-xl font-bold text-gray-900">{t('invite.slug.title')}</h2>
        <p className="text-sm text-gray-500">{t('invite.slug.desc')}</p>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-400">gorae.com/</span>
            <input
              type="text"
              placeholder="my-wedding"
              value={store.slug}
              onChange={(e) => store.setField('slug', e.target.value)}
              className={`flex-1 ${inputClass}`}
              autoFocus
            />
          </div>
          {config.textKey && (
            <p className={`text-sm mt-2 ${config.color}`}>{t(config.textKey)}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('invite.slug.back')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isPending}
            className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? t('invite.common.saving') : t('invite.slug.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
